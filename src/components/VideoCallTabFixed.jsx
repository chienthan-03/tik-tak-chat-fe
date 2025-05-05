import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Text,
  useToast,
  IconButton,
  VStack,
  HStack,
  Avatar,
  Center,
  Heading,
} from "@chakra-ui/react";
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  ScreenShare,
  StopScreenShare,
} from "@mui/icons-material";
import io from "socket.io-client";

// Debug logging helper
const logWithTimestamp = (message, data = null) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

const VideoCallTabFixed = () => {
  logWithTimestamp("Component rendering");

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const username = params.get("username");
  const chatId = params.get("chatId");
  const remoteName = params.get("remoteName");
  const remotePic = params.get("remotePic");
  const token = params.get("token");
  const isInitiator = params.get("isInitiator") === "true";

  logWithTimestamp("URL parameters", {
    userId,
    username,
    chatId,
    remoteName,
    remotePic: remotePic ? "exists" : "null",
    token: token ? "exists" : "null",
    isInitiator,
  });

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const socketRef = useRef(null);
  const pendingOfferRef = useRef(null); // Store offer in ref to avoid dependency issues

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState(
    isInitiator ? "Calling..." : "Incoming call..."
  );

  const toast = useToast();

  // Play sound on call
  const audioRef = useRef(new Audio("/sounds/incoming-call.mp3"));

  useEffect(() => {
    // Play notification sound if receiving a call
    if (!isInitiator && !isCallActive) {
      logWithTimestamp("Attempting to play notification sound");
      audioRef.current.loop = true;
      audioRef.current
        .play()
        .catch((err) => logWithTimestamp("Could not play audio:", err));
    }

    return () => {
      logWithTimestamp("Cleaning up audio");
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    };
  }, [isInitiator, isCallActive]);

  // Initialize socket connection
  useEffect(() => {
    logWithTimestamp("Setting up socket connection");
    socketRef.current = io("http://localhost:4000");

    // Setup user
    logWithTimestamp(`Emitting setup event with userId: ${userId}`);
    socketRef.current.emit("setup", { _id: userId });

    socketRef.current.on("connected", () => {
      logWithTimestamp("Socket connected event received");
      setIsConnected(true);
    });

    // Debug: Log socket ID and all events
    socketRef.current.on("connect", () => {
      logWithTimestamp(`Socket connected with ID: ${socketRef.current.id}`);
    });

    // Log all socket errors
    socketRef.current.on("connect_error", (error) => {
      logWithTimestamp("Socket connection error:", error);
    });

    socketRef.current.on("error", (error) => {
      logWithTimestamp("Socket error:", error);
    });

    // Cleanup on unmount
    return () => {
      logWithTimestamp("Cleaning up socket connection");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [userId]);

  const initializePeerConnection = () => {
    logWithTimestamp("Initializing peer connection");
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    logWithTimestamp("Peer connection created with config:", configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        logWithTimestamp("ICE candidate generated:", event.candidate);
        socketRef.current.emit("candidate", {
          candidate: event.candidate,
          to: chatId,
        });
      } else if (!event.candidate) {
        logWithTimestamp("ICE gathering complete");
      }
    };

    // For debugging - connection state changes
    pc.onconnectionstatechange = () => {
      logWithTimestamp("Connection state changed:", pc.connectionState);
    };

    // For debugging - ice connection state changes
    pc.oniceconnectionstatechange = () => {
      logWithTimestamp("ICE connection state:", pc.iceConnectionState);
    };

    // For debugging - signaling state changes
    pc.onsignalingstatechange = () => {
      logWithTimestamp("Signaling state:", pc.signalingState);
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      logWithTimestamp("Received remote track", {
        kind: event.track.kind,
        hasStreams: event.streams && event.streams.length > 0,
        streamId:
          event.streams && event.streams[0] ? event.streams[0].id : null,
      });

      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        logWithTimestamp("Setting remote stream to video element");
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsCallActive(true);
        setCallStatus("Call connected");
        // Stop the ringtone
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } else {
        logWithTimestamp("Remote video ref or streams not available", {
          remoteRefExists: !!remoteVideoRef.current,
          hasStreams: event.streams && event.streams.length > 0,
        });
      }
    };

    return pc;
  };

  // Setup media stream
  const setupMediaStream = async (video = true) => {
    logWithTimestamp("Setting up media stream");
    try {
      if (localStream.current) {
        logWithTimestamp("Stopping existing tracks before getting new stream");
        localStream.current.getTracks().forEach((track) => track.stop());
      }

      logWithTimestamp("Requesting user media");
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });

      logWithTimestamp("Got media stream", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      localStream.current = stream;

      if (localVideoRef.current) {
        logWithTimestamp("Setting local stream to video element");
        localVideoRef.current.srcObject = stream;
      } else {
        logWithTimestamp("Local video ref not available");
      }

      return stream;
    } catch (error) {
      logWithTimestamp("Error accessing media devices:", error);
      toast({
        title: "Media Error",
        description: "Unable to access camera or microphone",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  };

  // Setup screen sharing
  const setupScreenSharing = async () => {
    logWithTimestamp("Setting up screen sharing");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      if (!peerConnection.current || !localStream.current) {
        logWithTimestamp("Missing peer connection or local stream");
        return null;
      }

      // Save previous tracks to restore later
      const previousVideoTrack = localStream.current.getVideoTracks()[0];

      // Replace video track in localStream
      const screenTrack = stream.getVideoTracks()[0];
      logWithTimestamp("Got screen sharing track");

      // Replace the track in the peer connection
      const senders = peerConnection.current.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track && sender.track.kind === "video"
      );

      if (videoSender) {
        logWithTimestamp("Replacing video track with screen sharing track");
        videoSender.replaceTrack(screenTrack);
      }

      // Update local video preview
      localStream.current.removeTrack(previousVideoTrack);
      localStream.current.addTrack(screenTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      // Handle when user stops screen sharing
      screenTrack.onended = () => {
        logWithTimestamp("Screen sharing ended by user");
        stopScreenSharing(previousVideoTrack);
      };

      return screenTrack;
    } catch (error) {
      logWithTimestamp("Error sharing screen:", error);
      toast({
        title: "Screen Sharing Error",
        description: "Unable to share screen",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  };

  // Stop screen sharing and revert to camera
  const stopScreenSharing = async (previousTrack) => {
    logWithTimestamp("Stopping screen sharing");
    try {
      if (!peerConnection.current || !localStream.current) {
        logWithTimestamp("Missing peer connection or local stream");
        return;
      }

      // If we don't have the previous track, get a new one
      let videoTrack = previousTrack;

      if (!videoTrack) {
        logWithTimestamp("Getting new video track");
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoTrack = newStream.getVideoTracks()[0];
      }

      // Replace the track in the peer connection
      const senders = peerConnection.current.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track && sender.track.kind === "video"
      );

      if (videoSender) {
        logWithTimestamp("Replacing screen sharing track with camera track");
        videoSender.replaceTrack(videoTrack);
      }

      // Update local video preview
      const screenTrack = localStream.current.getVideoTracks()[0];
      localStream.current.removeTrack(screenTrack);
      localStream.current.addTrack(videoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }

      setIsScreenSharing(false);
    } catch (error) {
      logWithTimestamp("Error reverting to camera:", error);
    }
  };

  // Setup socket event handlers
  useEffect(() => {
    if (!isConnected || !socketRef.current) {
      logWithTimestamp("Socket not connected or not initialized yet");
      return;
    }

    logWithTimestamp("Setting up socket event handlers");

    // Save a global reference to received offers for maximum reliability
    if (!window._pendingOffers) {
      window._pendingOffers = {};
    }

    // Socket event handlers
    socketRef.current.on("offer", async (data) => {
      logWithTimestamp("Received offer event", {
        hasOffer: !!data.offer,
        from: data.from || "unknown",
        chatId: data.chatId || chatId,
      });

      // Store the offer in multiple places for maximum reliability
      // 1. In the ref
      pendingOfferRef.current = data.offer;
      // 2. In a global variable keyed by chatId
      window._pendingOffers[chatId] = data.offer;
      // 3. In localStorage (session storage doesn't work across tabs)
      try {
        localStorage.setItem(`offer_${chatId}`, JSON.stringify(data.offer));
        logWithTimestamp("Offer saved to localStorage");
      } catch (err) {
        logWithTimestamp("Error saving offer to localStorage:", err);
      }

      logWithTimestamp(
        "Stored offer in ref and backup locations, offer SDP type:",
        data.offer.type
      );

      // Create a global debug variable to inspect the offer
      window._debugLastOffer = data.offer;
      logWithTimestamp("Set debug variable window._debugLastOffer");

      // If initiator (not supposed to happen but handle it anyway)
      if (isInitiator) {
        logWithTimestamp("Processing offer as initiator (unusual path)");
        if (!peerConnection.current) {
          peerConnection.current = initializePeerConnection();

          const stream = await setupMediaStream();
          if (!stream) return;

          stream
            .getTracks()
            .forEach((track) => peerConnection.current.addTrack(track, stream));
        }

        try {
          logWithTimestamp("Setting remote description from offer");
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );

          logWithTimestamp("Creating answer");
          const answer = await peerConnection.current.createAnswer();

          logWithTimestamp("Setting local description");
          await peerConnection.current.setLocalDescription(answer);

          logWithTimestamp("Sending answer");
          socketRef.current.emit("answer", {
            answer,
            to: chatId,
          });
        } catch (error) {
          logWithTimestamp("Error processing offer as initiator:", error);
        }
      }
    });

    // Handle request for resending offer (when receiver didn't get it)
    socketRef.current.on("requestOffer", async (data) => {
      logWithTimestamp("Received request to resend offer from:", data.from);

      if (!isInitiator) {
        logWithTimestamp(
          "Ignoring offer resend request as we're not the initiator"
        );
        return;
      }

      logWithTimestamp("Preparing to resend offer");

      // Check if we already have a working peer connection
      if (
        !peerConnection.current ||
        peerConnection.current.connectionState === "closed"
      ) {
        logWithTimestamp("Creating new peer connection for resending offer");
        peerConnection.current = initializePeerConnection();

        // Get media stream if needed
        if (!localStream.current) {
          logWithTimestamp("Getting new media stream for resending offer");
          const stream = await setupMediaStream();
          if (!stream) {
            logWithTimestamp("Failed to get media stream for resending offer");
            return;
          }

          stream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, stream);
          });
        } else {
          logWithTimestamp("Reusing existing media stream for resending offer");
          localStream.current.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, localStream.current);
          });
        }
      } else {
        logWithTimestamp(
          "Using existing peer connection for resending offer, state:",
          peerConnection.current.connectionState
        );
      }

      try {
        // Create a new offer
        logWithTimestamp("Creating new offer to resend");
        const offer = await peerConnection.current.createOffer();

        logWithTimestamp("Setting local description");
        await peerConnection.current.setLocalDescription(offer);

        logWithTimestamp("Resending offer to chatId:", chatId);
        socketRef.current.emit("offer", {
          offer,
          to: chatId,
        });

        toast({
          title: "Reconnecting",
          description: "Resending connection information...",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      } catch (error) {
        logWithTimestamp("Error resending offer:", error);
        toast({
          title: "Reconnection Error",
          description:
            "Failed to resend connection information: " + error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    });

    socketRef.current.on("answer", async (data) => {
      logWithTimestamp("Received answer event", {
        hasAnswer: !!data.answer,
        from: data.from || "unknown",
      });

      if (peerConnection.current) {
        try {
          logWithTimestamp("Setting remote description from answer");
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          logWithTimestamp("Remote description set successfully from answer");
          setCallStatus("Call connected");
        } catch (error) {
          logWithTimestamp(
            "Error setting remote description from answer:",
            error
          );
        }
      } else {
        logWithTimestamp("Cannot process answer - no peer connection");
      }
    });

    socketRef.current.on("candidate", async (data) => {
      logWithTimestamp("Received ICE candidate event");

      if (!peerConnection.current) {
        logWithTimestamp(
          "No peer connection to add ICE candidate - storing for later"
        );
        return;
      }

      try {
        logWithTimestamp("Adding ICE candidate to peer connection");
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
        logWithTimestamp("Added ICE candidate successfully");
      } catch (error) {
        logWithTimestamp("Error adding ICE candidate:", error);
      }
    });

    socketRef.current.on("callEnded", () => {
      logWithTimestamp("Call ended by remote peer");
      toast({
        title: "Call Ended",
        description: "The other person ended the call",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      endCall(false); // Don't send another endCall event
    });

    return () => {
      logWithTimestamp("Cleaning up socket event handlers");
      socketRef.current.off("offer");
      socketRef.current.off("answer");
      socketRef.current.off("candidate");
      socketRef.current.off("callEnded");
      socketRef.current.off("requestOffer");
    };
  }, [isConnected, chatId, isInitiator, toast]);

  // Debug: Log whenever pendingOfferRef changes
  useEffect(() => {
    const checkOfferInterval = setInterval(() => {
      if (pendingOfferRef.current) {
        logWithTimestamp("pendingOfferRef is present", {
          type: pendingOfferRef.current.type,
          hasOffer: true,
        });
      } else {
        logWithTimestamp("pendingOfferRef is null");
      }
    }, 2000);

    return () => clearInterval(checkOfferInterval);
  }, []);

  // Separate effect for starting the call if initiator
  useEffect(() => {
    if (isConnected && isInitiator && socketRef.current) {
      logWithTimestamp("Starting call as initiator");
      startCall();
    }
  }, [isConnected, isInitiator]);

  const startCall = async () => {
    try {
      logWithTimestamp("Starting call");

      // Create peer connection
      peerConnection.current = initializePeerConnection();

      // Get media stream
      const stream = await setupMediaStream();
      if (!stream) {
        logWithTimestamp("Failed to get media stream");
        return;
      }

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        logWithTimestamp("Adding track to peer connection:", track.kind);
        peerConnection.current.addTrack(track, stream);
      });

      // Create and send offer
      logWithTimestamp("Creating offer");
      const offer = await peerConnection.current.createOffer();

      logWithTimestamp("Setting local description");
      await peerConnection.current.setLocalDescription(offer);

      logWithTimestamp("Sending offer to chatId:", chatId);
      socketRef.current.emit("offer", {
        offer,
        to: chatId,
      });

      // Also save the offer in our ref (just in case)
      pendingOfferRef.current = offer;
      logWithTimestamp("Also saved our own offer to pendingOfferRef");

      setCallStatus("Calling...");
    } catch (error) {
      logWithTimestamp("Error starting call:", error);
      toast({
        title: "Call Error",
        description: "Failed to start call: " + error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const answerCall = async () => {
    try {
      logWithTimestamp("Answering call");

      // Try to get the offer from multiple sources
      // 1. First check the ref
      let offerToProcess = pendingOfferRef.current;
      console.log("offerToProcess", offerToProcess);
      // 2. If not in ref, check the global variable
      if (
        !offerToProcess &&
        window._pendingOffers &&
        window._pendingOffers[chatId]
      ) {
        offerToProcess = window._pendingOffers[chatId];
        logWithTimestamp("Retrieved offer from global backup variable");
      }

      // 3. If still not found, try localStorage
      if (!offerToProcess) {
        try {
          const storedOffer = localStorage.getItem(`offer_${chatId}`);
          if (storedOffer) {
            offerToProcess = JSON.parse(storedOffer);
            logWithTimestamp("Retrieved offer from localStorage backup");
          }
        } catch (err) {
          logWithTimestamp("Error retrieving offer from localStorage:", err);
        }
      }

      // Log the offer status
      logWithTimestamp(
        "Offer status for processing:",
        offerToProcess
          ? { type: offerToProcess.type, exists: true }
          : "NULL - NO OFFER AVAILABLE"
      );

      // Debug offer content
      if (offerToProcess) {
        logWithTimestamp("Offer SDP type:", offerToProcess.type);
        // Log partial SDP for debugging (not the full SDP as it's very long)
        const sdpPreview = offerToProcess.sdp.substring(0, 100) + "...";
        logWithTimestamp("Offer SDP preview:", sdpPreview);
      }

      // Stop the ringtone
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setCallStatus("Connecting...");

      // Create peer connection
      logWithTimestamp("Creating new peer connection for answering");
      peerConnection.current = initializePeerConnection();

      // Get media stream
      logWithTimestamp("Setting up media stream for answering");
      const stream = await setupMediaStream();
      if (!stream) {
        logWithTimestamp("Failed to get media stream");
        return;
      }

      // Add tracks to peer connection
      logWithTimestamp("Adding tracks to peer connection");
      stream.getTracks().forEach((track) => {
        logWithTimestamp("Adding track to peer connection:", track.kind);
        peerConnection.current.addTrack(track, stream);
      });

      // Process stored offer
      if (offerToProcess) {
        logWithTimestamp("Processing pending offer");

        try {
          // Set remote description (the offer)
          logWithTimestamp("Setting remote description from offer");
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(offerToProcess)
          );
          logWithTimestamp("Remote description set successfully");

          // Create answer
          logWithTimestamp("Creating answer");
          const answer = await peerConnection.current.createAnswer();

          // Set local description
          logWithTimestamp("Setting local description");
          await peerConnection.current.setLocalDescription(answer);

          // Send answer
          logWithTimestamp("Sending answer to:", chatId);
          socketRef.current.emit("answer", {
            answer,
            to: chatId,
          });

          // Clean up stored offers
          delete window._pendingOffers[chatId];
          try {
            localStorage.removeItem(`offer_${chatId}`);
          } catch (err) {
            logWithTimestamp("Error removing offer from localStorage:", err);
          }
        } catch (error) {
          logWithTimestamp("Error processing offer:", error);
          toast({
            title: "Connection Error",
            description:
              "Failed to establish call connection: " + error.message,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        // If no offer was found anywhere, attempt to request one from the initiator
        logWithTimestamp("No pending offer found - requesting a new offer");

        if (socketRef.current) {
          logWithTimestamp("Sending requestOffer event to initiator");
          socketRef.current.emit("requestOffer", {
            to: chatId,
            from: userId,
          });

          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect with caller...",
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        } else {
          logWithTimestamp(
            "No pending offer and socket not available - logging details"
          );
          logWithTimestamp("Socket connected:", !!socketRef.current);
          logWithTimestamp("Is initiator:", isInitiator);
          logWithTimestamp("Chat ID:", chatId);

          toast({
            title: "Connection Error",
            description:
              "Missing call information. Please try refreshing the page.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      logWithTimestamp("Error answering call:", error);
      toast({
        title: "Call Error",
        description: "Failed to answer call: " + error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const endCall = (notify = true) => {
    logWithTimestamp("Ending call, notify:", notify);

    // Notify other peer
    if (notify && socketRef.current) {
      logWithTimestamp("Sending endCall event");
      socketRef.current.emit("endCall", { to: chatId });
    }

    // Stop media tracks
    if (localStream.current) {
      logWithTimestamp("Stopping local media tracks");
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Close peer connection
    if (peerConnection.current) {
      logWithTimestamp("Closing peer connection");
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Close tab
    logWithTimestamp("Closing tab");
    window.close();
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        setIsMuted(!enabled);
        logWithTimestamp("Microphone " + (enabled ? "unmuted" : "muted"));
      }
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setIsCameraOff(!enabled);
        logWithTimestamp("Camera " + (enabled ? "turned on" : "turned off"));
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnection.current) {
      logWithTimestamp("No peer connection for screen sharing");
      return;
    }

    if (isScreenSharing) {
      logWithTimestamp("Stopping screen sharing");
      // Stop screen sharing
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }

      // Get new camera stream
      const stream = await setupMediaStream();
      if (!stream) return;

      // Replace track in peer connection
      const senders = peerConnection.current.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track && sender.track.kind === "video"
      );

      if (videoSender && stream.getVideoTracks().length > 0) {
        videoSender.replaceTrack(stream.getVideoTracks()[0]);
      }

      setIsScreenSharing(false);
    } else {
      logWithTimestamp("Starting screen sharing");
      // Start screen sharing
      const screenTrack = await setupScreenSharing();
      if (screenTrack) {
        setIsScreenSharing(true);
      }
    }
  };

  // For debugging - expose key refs to window
  useEffect(() => {
    window._debugVideoCall = {
      pendingOfferRef,
      peerConnection,
      socketRef,
      localStream,
      remoteVideoRef,
      localVideoRef,
    };
    logWithTimestamp("Debug info exposed at window._debugVideoCall");

    return () => {
      delete window._debugVideoCall;
    };
  }, []);

  return (
    <Box bg="gray.100" height="100vh" width="100%">
      <Flex direction="column" height="100%">
        {/* Header */}
        <Box bg="white" p={4} shadow="md">
          <Flex justify="space-between" align="center">
            <Flex align="center">
              <Avatar src={remotePic || ""} name={remoteName} mr={3} />
              <VStack align="start" spacing={0}>
                <Heading size="md">{remoteName}</Heading>
                <Text color="gray.500">{callStatus}</Text>
              </VStack>
            </Flex>
          </Flex>
        </Box>

        {/* Video Container */}
        <Flex flex="1" p={4} position="relative" bg="gray.900">
          {/* Remote Video (Full Screen) */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex="1"
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>

          {/* Local Video (Picture in Picture) */}
          <Box
            position="absolute"
            bottom="120px"
            right="20px"
            width="250px"
            height="140px"
            borderRadius="md"
            overflow="hidden"
            zIndex="2"
            boxShadow="lg"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)", // Mirror effect
              }}
            />
          </Box>

          {/* Not connected message */}
          {!isCallActive && (
            <Center
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              zIndex="3"
            >
              <VStack spacing={6}>
                <Avatar size="xl" src={remotePic || ""} name={remoteName} />
                <Heading size="lg" color="white">
                  {callStatus}
                </Heading>

                {!isInitiator && !isCallActive && (
                  <Button
                    colorScheme="green"
                    size="lg"
                    onClick={answerCall}
                    leftIcon={<Videocam />}
                  >
                    Answer Call
                  </Button>
                )}
              </VStack>
            </Center>
          )}
        </Flex>

        {/* Controls */}
        <Box bg="white" p={4} shadow="inner">
          <HStack justify="center" spacing={8}>
            <IconButton
              icon={isMuted ? <MicOff /> : <Mic />}
              aria-label={isMuted ? "Unmute" : "Mute"}
              onClick={toggleMute}
              colorScheme={isMuted ? "red" : "gray"}
              fontSize="24px"
              isRound
              size="lg"
            />

            <IconButton
              icon={isCameraOff ? <VideocamOff /> : <Videocam />}
              aria-label={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              onClick={toggleCamera}
              colorScheme={isCameraOff ? "red" : "gray"}
              fontSize="24px"
              isRound
              size="lg"
            />

            <IconButton
              icon={<CallEnd />}
              aria-label="End Call"
              onClick={() => endCall(true)}
              colorScheme="red"
              fontSize="24px"
              isRound
              size="lg"
            />

            <IconButton
              icon={isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              aria-label={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              onClick={toggleScreenShare}
              colorScheme={isScreenSharing ? "blue" : "gray"}
              fontSize="24px"
              isRound
              size="lg"
            />
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
};

export default VideoCallTabFixed;
