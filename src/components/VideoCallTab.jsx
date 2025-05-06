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

const VideoCallTab = () => {
  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const username = params.get("username");
  const chatId = params.get("chatId");
  const remoteName = params.get("remoteName");
  const remotePic = params.get("remotePic");
  const token = params.get("token");
  const isInitiator = params.get("isInitiator") === "true";

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const socketRef = useRef(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState(
    isInitiator ? "Calling..." : "Incoming call..."
  );
  // Store the offer SDP for later use when answering a call
  const [pendingOffer, setPendingOffer] = useState(null);

  const toast = useToast();

  // Play sound on call
  const audioRef = useRef(new Audio("/sounds/incoming-call.mp3"));

  useEffect(() => {
    // Play notification sound if receiving a call
    if (!isInitiator && !isCallActive) {
      audioRef.current.loop = true;
      audioRef.current
        .play()
        .catch((err) => console.error("Could not play audio:", err));
    }

    return () => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    };
  }, [isInitiator, isCallActive]);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io("http://localhost:4000");

    // Setup user
    socketRef.current.emit("setup", { _id: chatId });
    // socketRef.current.emit("join chat", chatId);
    socketRef.current.on("connected", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    // Cleanup on unmount
    return () => {
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
  }, [chatId]);

  const initializePeerConnection = () => {
    console.log("initializePeerConnection");
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("candidate", {
          candidate: event.candidate,
          to: chatId,
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
      console.log("remoteVideoRef", event.streams[0]);
      setIsCallActive(true);
      setCallStatus("Call connected");
      // Stop the ringtone
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    };

    return pc;
  };

  // Setup media stream
  const setupMediaStream = async (video = true) => {
    console.log("setupMediaStream");
    try {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true,
      });

      localStream.current = stream;
      localVideoRef.current.srcObject = stream;

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
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
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Save previous tracks to restore later
      const previousVideoTrack = localStream.current.getVideoTracks()[0];

      // Replace video track in localStream
      const screenTrack = stream.getVideoTracks()[0];

      // Replace the track in the peer connection
      const senders = peerConnection.current.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track && sender.track.kind === "video"
      );

      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }

      // Update local video preview
      localStream.current.removeTrack(previousVideoTrack);
      localStream.current.addTrack(screenTrack);
      localVideoRef.current.srcObject = localStream.current;

      // Handle when user stops screen sharing
      screenTrack.onended = () => {
        stopScreenSharing(previousVideoTrack);
      };

      return screenTrack;
    } catch (error) {
      console.error("Error sharing screen:", error);
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
    try {
      // If we don't have the previous track, get a new one
      let videoTrack = previousTrack;

      if (!videoTrack) {
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
        videoSender.replaceTrack(videoTrack);
      }

      // Update local video preview
      const screenTrack = localStream.current.getVideoTracks()[0];
      localStream.current.removeTrack(screenTrack);
      localStream.current.addTrack(videoTrack);
      localVideoRef.current.srcObject = localStream.current;

      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error reverting to camera:", error);
    }
  };

  // Setup WebRTC when socket is connected
  useEffect(() => {
    if (!isConnected || !socketRef.current) return;
    console.log("effect", socketRef.current.on);
    // Socket event handlers
    socketRef.current.on("offer", async (data) => {
      console.log("Received offer", data.offer, isInitiator);

      // Store the offer for later use when answering
      setPendingOffer(data.offer);

      // If we're not the initiator (receiving the call), we'll wait for user to click Answer Call
      if (!isInitiator) {
        if (!peerConnection.current) {
          peerConnection.current = initializePeerConnection();

          const stream = await setupMediaStream();
          if (!stream) return;
          stream
            .getTracks()
            .forEach((track) => peerConnection.current.addTrack(track, stream));
        }

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        console.log("peerConnection.current", peerConnection.current);
        setCallStatus("Call connected");
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socketRef.current.emit("answer", {
          answer,
          to: chatId,
        });
      }
    });

    socketRef.current.on("answer", async (data) => {
      console.log("Received answer", data.answer);

      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log("peerConnection.current", peerConnection.current);
          setCallStatus("Call connected");
          console.log("Remote description set successfully from answer");
        } catch (error) {
          console.error("Error setting remote description from answer:", error);
        }
      } else {
        console.error("Cannot process answer - no peer connection");
      }
    });

    socketRef.current.on("candidate", async (data) => {
      console.log("Received ICE candidate", data.candidate);

      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log("Added ICE candidate successfully");
        } else {
          console.error("Cannot add ICE candidate - no peer connection");
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    socketRef.current.on("callEnded", () => {
      endCall();
      toast({
        title: "Call Ended",
        description: "The call has been ended",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      window.close();
    });

    // If initiator, start the call
    if (isInitiator) {
      startCall();
    }

    return () => {
      socketRef.current.off("offer");
      socketRef.current.off("answer");
      socketRef.current.off("candidate");
      socketRef.current.off("callEnded");
    };
  }, [isConnected, isInitiator, chatId]);

  const startCall = async () => {
    try {
      console.log("startCall", peerConnection.current);
      peerConnection.current = initializePeerConnection();

      const stream = await setupMediaStream();
      if (!stream) return;

      stream.getTracks().forEach((track) => {
        console.log("track", track, stream);
        return peerConnection.current.addTrack(track, stream);
      });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socketRef.current.emit("offer", {
        offer,
        to: chatId,
      });
      console.log("peerConnection.current", {
        getSenders: peerConnection.current.getSenders(),
        stream,
        getReceivers: peerConnection.current.getReceivers(),
        peerConnection: peerConnection.current,
      });

      setCallStatus("Calling...");
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Call Error",
        description: "Failed to start call",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  console.log("chatid: ", chatId);

  const answerCall = async () => {
    try {
      console.log("Answering call");

      // Stop the ringtone
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setCallStatus("Connecting...");

      // Create peer connection if it doesn't exist
      if (!peerConnection.current) {
        console.log("Creating new peer connection");
        peerConnection.current = initializePeerConnection();
      }

      // Setup media stream
      console.log("Setting up media stream");
      const stream = await setupMediaStream();
      if (!stream) {
        console.error("Failed to get media stream");
        return;
      }

      // Add local stream tracks to peer connection
      console.log("Adding tracks to peer connection");
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Process the stored offer if we have one
      if (pendingOffer) {
        console.log("Processing pending offer");
        try {
          // Set the remote description (the offer)
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(pendingOffer)
          );
          console.log("Remote description set successfully");
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);

          socketRef.current.emit("answer", {
            answer,
            to: chatId,
          });
          console.log("answer", remoteVideoRef.current);
        } catch (error) {
          console.error("Error during answer process:", error);
          toast({
            title: "Connection Error",
            description: "Failed to establish call connection",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        console.error("No pending offer to answer");
      }
    } catch (error) {
      console.error("Error answering call:", error);
      toast({
        title: "Call Error",
        description: "Failed to answer call",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const endCall = () => {
    // Notify server that call has ended
    socketRef.current.emit("endCall", { to: chatId });

    // Stop all tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Close the tab
    window.close();
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        setIsMuted(!enabled);
      }
    }
  };

  const toggleCamera = async () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();

      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        setIsCameraOff(!enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      const videoTrack = localStream.current.getVideoTracks()[0];
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
      // Start screen sharing
      const screenTrack = await setupScreenSharing();
      if (screenTrack) {
        setIsScreenSharing(true);
      }
    }
  };
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
              onClick={endCall}
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

export default VideoCallTab;
