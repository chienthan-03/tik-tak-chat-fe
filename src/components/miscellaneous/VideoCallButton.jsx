import React from "react";
import { IconButton, useToast, Tooltip } from "@chakra-ui/react";
import { VideoCall as VideoCallIcon } from "@mui/icons-material";
import { ChatState } from "../../Context/ChatProvider";
import { getSender, getSenderPic } from "../../config/ChatLogic";

const VideoCallButton = () => {
  const { user, seletedChat, socket, onlineUsers } = ChatState();
  const toast = useToast();

  // Check if recipient is online
  const isRecipientOnline = () => {
    if (!seletedChat || seletedChat.isGroupChat) return false;
    
    // Get recipient user
    const recipient = seletedChat.users.find(u => u._id !== user._id);
    if (!recipient) return false;
    
    // Check if the recipient is in the onlineUsers set
    return onlineUsers.has(recipient._id);
  };

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
    
    if (!isRecipientOnline()) {
      toast({
        title: "User is offline",
        description: "You can only call users who are currently online",
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

  // Determine if button should be disabled
  const isDisabled = !isRecipientOnline() || !seletedChat || seletedChat.isGroupChat;

  return (
    <Tooltip 
      label={isDisabled ? "User is offline" : "Start video call"} 
      placement="top" 
      hasArrow
    >
      <IconButton
        icon={<VideoCallIcon />}
        colorScheme={isDisabled ? "gray" : "blue"}
        size="sm"
        isRound
        onClick={initiateVideoCall}
        aria-label="Video Call"
        mr={2}
        isDisabled={isDisabled}
        opacity={isDisabled ? 0.6 : 1}
      />
    </Tooltip>
  );
};

export default VideoCallButton; 