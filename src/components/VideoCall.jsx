import React, { useRef, useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import {
  Button,
  Box,
  Text,
  Avatar,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { PhoneIcon, PhoneOffIcon } from "@chakra-ui/icons";

const VideoCall = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const { socket, user, seletedChat } = ChatState();
  const toast = useToast();

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    };
    return new RTCPeerConnection(configuration);
  };

  const setupMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = stream;
      return stream;
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera and microphone",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return null;
    }
  };

  useEffect(() => {
    if (!socket || !seletedChat) return;

    socket.on("callUser", async ({ from, signal }) => {
      setIsReceivingCall(true);
      peerConnection.current = initializePeerConnection();
      const stream = await setupMediaStream();
      if (!stream) return;

      stream
        .getTracks()
        .forEach((track) => peerConnection.current.addTrack(track, stream));

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit("answerCall", {
        to: from,
        signal: peerConnection.current.localDescription,
      });
    });

    socket.on("callAccepted", async (signal) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
      setIsCalling(false);
      setIsCallActive(true);
    });

    socket.on("callEnded", () => {
      endCall();
    });

    return () => {
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("callEnded");
    };
  }, [socket, seletedChat]);

  const callUser = async () => {
    try {
      peerConnection.current = initializePeerConnection();
      const stream = await setupMediaStream();
      if (!stream) return;

      stream
        .getTracks()
        .forEach((track) => peerConnection.current.addTrack(track, stream));

      peerConnection.current.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      setIsCalling(true);
      socket.emit("callUser", {
        userToCall: seletedChat.users.find((u) => u._id !== user._id)._id,
        signalData: peerConnection.current.localDescription,
        from: user._id,
      });
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Unable to establish call",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    setIsCallActive(false);
    setIsCalling(false);
    setIsReceivingCall(false);
    socket.emit("endCall", { to: seletedChat._id });
  };

  return (
    <Box>
      <IconButton
        icon={isCallActive ? <PhoneOffIcon /> : <PhoneIcon />}
        colorScheme={isCallActive ? "red" : "green"}
        onClick={isCallActive ? endCall : callUser}
        isLoading={isCalling}
        mr={2}
      />

      {(isCallActive || isCalling || isReceivingCall) && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0,0,0,0.8)"
          zIndex={1000}
          p={4}
        >
          <Box maxW="800px" mx="auto" mt={4}>
            <Box mb={4}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "200px",
                  position: "absolute",
                  right: "20px",
                  top: "20px",
                  borderRadius: "8px",
                }}
              />
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  borderRadius: "16px",
                }}
              />
            </Box>
            <Button
              colorScheme="red"
              onClick={endCall}
              position="fixed"
              bottom="40px"
              left="50%"
              transform="translateX(-50%)"
            >
              End Call
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VideoCall;
