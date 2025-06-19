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
  
  // No longer using URL offer - will receive via socket
  const initialOffer = null;

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
  const [pendingOffer, setPendingOffer] = useState(initialOffer);

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
    console.log("=== INITIALIZING SOCKET ===");
    console.log("URL params:", { userId, username, chatId, remoteName, isInitiator });
    
    socketRef.current = io("http://localhost:4000");

    // Setup user with their userId, not chatId
    console.log("Emitting setup for userId:", userId);
    socketRef.current.emit("setup", { _id: userId });
    
    // Also join the chat room for signaling
    console.log("Joining chat room:", chatId);
    socketRef.current.emit("join chat", chatId);
    
    socketRef.current.on("connected", () => {
      setIsConnected(true);
      console.log("Socket connected for user:", userId, "in chat:", chatId);
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
  }, [userId, chatId]);

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
          from: userId,
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
  const stopScreenSharing = async (previousVideoTrack) => {
    try {
      // If we don't have the previous track, get a new one
      let videoTrack = previousVideoTrack;

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

  // Setup WebRTC event handlers once when socket is ready
  useEffect(() => {
    if (!socketRef.current) return;
    
    console.log("Setting up WebRTC event handlers. IsInitiator:", isInitiator);
    console.log("Setting up offer listener for chatId:", chatId, "userId:", userId);
    
    // Socket event handlers
    const handleOffer = async (data) => {
      console.log("🚀 handleOffer called with data:", data);
      console.log("🚀 Current userId:", userId, "isInitiator:", isInitiator);
      console.log("🚀 Data.to (chatId):", data.to, "Current chatId:", chatId);
      console.log("🚀 Data.from:", data.from);
      
      // Don't process our own offer
      if (data.from === userId) {
        console.log("❌ Ignoring own offer");
        return;
      }

      // Only non-initiators should process offers
      if (isInitiator) {
        console.log("❌ Initiator ignoring offer");
        return;
      }

      // Check if this offer is for our chat
      if (data.to !== chatId) {
        console.log("❌ Offer not for our chat. Offer for:", data.to, "Our chat:", chatId);
        return;
      }

      console.log("✅ Processing offer for non-initiator");
      console.log("✅ Setting pendingOffer:", data.offer);
      setPendingOffer(data.offer);
      
      // Set up peer connection and local stream for preview if not already done
      if (!peerConnection.current) {
        console.log("✅ Creating peer connection for offer (peer connection not exists)");
        peerConnection.current = initializePeerConnection();
        
        // Set up local stream for camera preview
        const stream = await setupMediaStream();
        if (!stream) {
          console.error("❌ Failed to setup media stream for offer");
          return;
        }
        console.log("✅ Media stream setup complete for offer");
      } else {
        console.log("✅ Peer connection already exists, just setting pendingOffer");
      }
    };

    const handleAnswer = async (data) => {
      console.log("Received answer from:", data.from, "isInitiator:", isInitiator);
      
      // Don't process our own answer
      if (data.from === userId) {
        console.log("Ignoring own answer");
        return;
      }

      // Only initiators should process answers
      if (!isInitiator) {
        console.log("Non-initiator ignoring answer");
        return;
      }

      if (peerConnection.current) {
        try {
          console.log("Processing answer for initiator");
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setCallStatus("Call connected");
          console.log("Remote description set successfully from answer");
        } catch (error) {
          console.error("Error setting remote description from answer:", error);
        }
      } else {
        console.error("Cannot process answer - no peer connection");
      }
    };

    const handleCandidate = async (data) => {
      console.log("Received ICE candidate from:", data.from);
      
      // Don't process our own candidates
      if (data.from === userId) {
        console.log("Ignoring own ICE candidate");
        return;
      }

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
    };

    const handleCallEnded = () => {
      endCall();
      toast({
        title: "Call Ended",
        description: "The call has been ended",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      window.close();
    };

    const handleReceiverReady = (data) => {
      console.log("📞 Receiver ready notification received:", data);
      if (isInitiator && data.chatId === chatId) {
        console.log("📞 Receiver is ready, starting call now...");
        
        // Clear fallback timer since receiver is ready
        if (window.fallbackTimer) {
          clearTimeout(window.fallbackTimer);
          window.fallbackTimer = null;
        }
        
        startCall();
      }
    };

    const handleUserJoinedRoom = (data) => {
      console.log("👥 User joined room:", data);
    };

    const handleRoomMembers = (data) => {
      console.log("👥 Room members:", data);
    };

    console.log("📡 Setting up socket event listeners...");
    socketRef.current.on("offer", handleOffer);
    socketRef.current.on("answer", handleAnswer);
    socketRef.current.on("candidate", handleCandidate);
    socketRef.current.on("callEnded", handleCallEnded);
    socketRef.current.on("receiver_ready_notification", handleReceiverReady);
    socketRef.current.on("user_joined_room", handleUserJoinedRoom);
    socketRef.current.on("room_members", handleRoomMembers);
    
    // Debug: Listen to all socket events
    socketRef.current.onAny((event, ...args) => {
      console.log("🔥 VideoCallTab received socket event:", event, args);
    });

    console.log("📡 Socket event listeners set up complete");

    return () => {
      if (socketRef.current) {
        console.log("📡 Cleaning up socket event listeners...");
        socketRef.current.off("offer", handleOffer);
        socketRef.current.off("answer", handleAnswer);
        socketRef.current.off("candidate", handleCandidate);
        socketRef.current.off("callEnded", handleCallEnded);
        socketRef.current.off("receiver_ready_notification", handleReceiverReady);
        socketRef.current.off("user_joined_room", handleUserJoinedRoom);
        socketRef.current.off("room_members", handleRoomMembers);
        socketRef.current.offAny();
      }
    };
  }, [userId, isInitiator]);

  // Start call when connected (separate effect)
  useEffect(() => {
    if (isConnected && isInitiator) {
      console.log("Initiator connected, waiting for receiver to be ready...");
      
      // Set a fallback timer in case receiver is already ready but we missed the notification
      const fallbackTimer = setTimeout(() => {
        console.log("⏰ Fallback: Starting call after 3 seconds timeout");
        startCall();
      }, 3000);
      
      // Store timer to clear it if receiver_ready is received
      window.fallbackTimer = fallbackTimer;
    }
  }, [isConnected, isInitiator]);

  // Setup peer connection for non-initiator when connected
  useEffect(() => {
    if (isConnected && !isInitiator && !peerConnection.current) {
      console.log("Setting up peer connection for non-initiator");
      setupPeerConnectionForReceiver();
    }
  }, [isConnected, isInitiator]);

  const setupPeerConnectionForReceiver = async () => {
    try {
      console.log("Setting up peer connection for receiver");
      peerConnection.current = initializePeerConnection();
      
      // Set up local stream for camera preview
      const stream = await setupMediaStream();
      if (!stream) {
        console.error("Failed to setup media stream for receiver");
        return;
      }
      console.log("✅ Media stream setup complete for receiver");
      
      // Notify that receiver is ready
      console.log("📞 Notifying that receiver is ready");
      socketRef.current.emit("receiver_ready", {
        chatId: chatId,
        userId: userId
      });
      
    } catch (error) {
      console.error("Error setting up peer connection for receiver:", error);
    }
  };

  const startCall = async () => {
    try {
      console.log("=== STARTING CALL ===");
      console.log("isInitiator:", isInitiator);
      console.log("userId:", userId);
      console.log("chatId:", chatId);
      console.log("Socket connected:", socketRef.current?.connected);
      console.log("Socket ID:", socketRef.current?.id);
      
      peerConnection.current = initializePeerConnection();

      const stream = await setupMediaStream();
      if (!stream) {
        console.error("Failed to get media stream in startCall");
        return;
      }

      stream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection:", track.kind);
        return peerConnection.current.addTrack(track, stream);
      });

      console.log("Creating offer...");
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log("✅ Offer created successfully:", offer);

      // Send offer to the chat room
      const offerData = {
        offer,
        to: chatId,
        from: userId,
      };
      console.log("📤 Sending offer data:", offerData);
      console.log("📤 Emitting to socket with ID:", socketRef.current?.id);
      
      socketRef.current.emit("offer", offerData);
      
      console.log("✅ Offer emitted to chat room:", chatId, "from user:", userId);
      
      // Add a small delay and check if the offer was received by checking backend logs
      setTimeout(() => {
        console.log("⏰ 2 seconds after offer emission - check if receiver got it");
      }, 2000);

      setCallStatus("Calling...");
    } catch (error) {
      console.error("❌ Error starting call:", error);
      toast({
        title: "Call Error",
        description: "Failed to start call",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const answerCall = async () => {
    try {
      console.log("=== ANSWERING CALL ===");
      console.log("pendingOffer:", pendingOffer);
      console.log("initialOffer:", initialOffer);
      console.log("isInitiator:", isInitiator);
      console.log("peerConnection.current:", peerConnection.current);

      // Stop the ringtone
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setCallStatus("Connecting...");

      // Create peer connection if it doesn't exist
      if (!peerConnection.current) {
        console.log("Creating new peer connection in answerCall");
        peerConnection.current = initializePeerConnection();
      }

      // Setup media stream if not already set up
      if (!localStream.current) {
        console.log("Setting up media stream in answerCall");
        const stream = await setupMediaStream();
        if (!stream) {
          console.error("Failed to get media stream");
          return;
        }
      }

      // Add local stream tracks to peer connection
      console.log("Adding tracks to peer connection");
      localStream.current.getTracks().forEach((track) => {
        const trackAlreadyAdded = peerConnection.current.getSenders().some(
          (sender) => sender.track && sender.track.id === track.id
        );
        
        if (!trackAlreadyAdded) {
          console.log("Adding track:", track.kind);
          peerConnection.current.addTrack(track, localStream.current);
        }
      });

      // Process the stored offer if we have one
      if (pendingOffer) {
        console.log("Processing pending offer:", pendingOffer);
        try {
          // Set the remote description (the offer)
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(pendingOffer)
          );
          console.log("Remote description set successfully");
          
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          console.log("Answer created and set as local description");

          socketRef.current.emit("answer", {
            answer,
            to: chatId,
            from: userId,
          });
          console.log("Answer sent to chat room:", chatId);
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
        console.error("No pending offer to answer!");
        toast({
          title: "Call Error",
          description: "No incoming call to answer",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
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
    
    // Send a reconnect signal to maintain online status
    socketRef.current.emit("maintainOnlineStatus", { userId });

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
                  <VStack spacing={4}>
                    <Button
                      colorScheme="green"
                      size="lg"
                      onClick={answerCall}
                      leftIcon={<Videocam />}
                    >
                      Answer Call
                    </Button>
                    
                    {/* Debug buttons */}
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => {
                        console.log("=== DEBUG STATE ===");
                        console.log("pendingOffer:", pendingOffer);
                        console.log("initialOffer:", initialOffer);
                        console.log("isInitiator:", isInitiator);
                        console.log("isConnected:", isConnected);
                        console.log("peerConnection.current:", peerConnection.current);
                        console.log("URL params:", { userId, chatId, remoteName, isInitiator });
                        console.log("Socket connected:", socketRef.current?.connected);
                        console.log("Socket ID:", socketRef.current?.id);
                      }}
                    >
                      Debug State
                    </Button>
                    
                    <Button
                      colorScheme="orange"
                      size="sm"
                      onClick={() => {
                        console.log("=== MANUAL TEST OFFER ===");
                        const testOffer = {
                          type: "offer",
                          sdp: "test-sdp-data"
                        };
                        console.log("Manually setting pendingOffer:", testOffer);
                        setPendingOffer(testOffer);
                      }}
                    >
                      Test Set Offer
                    </Button>
                    
                    <Button
                      colorScheme="purple"
                      size="sm"
                      onClick={() => {
                        console.log("=== CHECK SOCKET ROOMS ===");
                        console.log("Socket ID:", socketRef.current?.id);
                        console.log("Socket connected:", socketRef.current?.connected);
                        console.log("Re-joining chat room:", chatId);
                        socketRef.current?.emit("join chat", chatId);
                      }}
                    >
                      Rejoin Room
                    </Button>
                  </VStack>
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