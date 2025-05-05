import React from "react";
import { IconButton, useToast } from "@chakra-ui/react";
import { VideoCall as VideoCallIcon } from "@mui/icons-material";
import { ChatState } from "../../Context/ChatProvider";
import { getSender, getSenderPic } from "../../config/ChatLogic";

const VideoCallButton = () => {
  const { user, seletedChat, socket } = ChatState();
  const toast = useToast();

  const initiateVideoCall = () => {
    if (!seletedChat) {
      toast({
        title: "No chat selected",
        description: "Please select a chat to start a video call",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (seletedChat.isGroupChat) {
      toast({
        title: "Group video calls not supported",
        description: "Video calls are only available for one-on-one chats",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Get recipient user
    const recipient = seletedChat.users.find(u => u._id !== user._id);
    if (!recipient) return;

    // Notify recipient about the call
    socket.emit("initiateCall", {
      chatId: seletedChat._id,
      to: recipient._id,
      from: user._id,
    });

    // Build URL parameters for the video call page
    const params = new URLSearchParams({
      userId: user._id,
      username: user.name,
      chatId: seletedChat._id,
      remoteName: recipient.name,
      remotePic: recipient.pic,
      token: user.token,
      isInitiator: "true",
    });

    // Open video call in a new tab
    window.open(`/video-call.html?${params.toString()}`, "_blank");
  };

  return (
    <IconButton
      icon={<VideoCallIcon />}
      colorScheme="blue"
      size="sm"
      isRound
      onClick={initiateVideoCall}
      aria-label="Video Call"
      mr={2}
    />
  );
};

export default VideoCallButton; 