import React, { useRef, useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { Button, Box, Text, Avatar } from "@chakra-ui/react";

const VideoCall = ({ callInfo, onEndCall }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const { socket, user } = ChatState();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        peerConnection.current = new RTCPeerConnection();
        stream
          .getTracks()
          .forEach((track) => peerConnection.current.addTrack(track, stream));

        peerConnection.current.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("candidate", event.candidate);
          }
        };
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    socket.on("offer", async (offer) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", async (answer) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("candidate", async (candidate) => {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });

    return () => {
      peerConnection.current?.close();
      socket.emit("endCall");
      setIsCallActive(false);
    };
  }, []);

  useEffect(() => {
    socket.on("callEnded", () => {
      peerConnection.current?.close();
      setIsCallActive(false);
    });

    return () => {
      socket.off("callEnded");
    };
  }, []);

  const endCall = () => {
    socket.emit("endCall");
    peerConnection.current?.close();
    setIsCallActive(false);
    onEndCall();
  };

  const startCall = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("offer", offer);
    setIsCallActive(true);
  };

  return (
    <Box className="video-call-container" textAlign="center">
      <Text fontSize="xl" fontWeight="bold">
        {callInfo?.name || "Video Call"}
      </Text>
      <Avatar src={callInfo?.avatar} size="xl" mb={2} />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="video-box"
      />
      <video ref={remoteVideoRef} autoPlay playsInline className="video-box" />
      {!isCallActive ? (
        <Button onClick={startCall} colorScheme="green" mt={2}>
          Start Call
        </Button>
      ) : (
        <Button onClick={endCall} colorScheme="red" mt={2}>
          End Call
        </Button>
      )}
    </Box>
  );
};

export default VideoCall;
