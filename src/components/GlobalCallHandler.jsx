import React, { useEffect, useRef } from "react";
import {
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Avatar,
  VStack,
  Text,
  HStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Phone } from "@mui/icons-material";
import { ChatState } from "../Context/ChatProvider";

const GlobalCallHandler = () => {
  const { user, socket, chats } = ChatState();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [incomingCall, setIncomingCall] = React.useState(null);
  const audioRef = useRef(new Audio("/sounds/incoming-call.mp3"));

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      console.log("Global incoming call received:", data);
      
      // Find the chat and caller information
      const chat = chats?.find(c => c._id === data.chatId);
      if (!chat) {
        console.error("Chat not found for incoming call:", data.chatId);
        return;
      }

      // Find the caller
      const caller = chat.users.find(u => u._id === data.from);
      if (!caller) {
        console.error("Caller not found:", data.from);
        return;
      }

      // Set incoming call data
      setIncomingCall({
        ...data,
        caller,
        chat,
      });

      // Play ringtone
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => 
        console.error("Could not play ringtone:", err)
      );

      // Show incoming call modal
      onOpen();

      // Show toast notification
      toast({
        title: "Incoming Video Call",
        description: `${caller.name} is calling you`,
        status: "info",
        duration: 10000,
        isClosable: true,
        position: "top-right",
      });
    };

    // Listen for incoming calls globally
    socket.on("incomingCall", handleIncomingCall);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      // Stop ringtone on cleanup
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    };
  }, [socket, chats, toast, onOpen]);

  const acceptCall = () => {
    if (!incomingCall) return;

    // Stop ringtone
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // Build URL parameters for the video call page
    const params = new URLSearchParams({
      userId: user._id,
      username: user.name,
      chatId: incomingCall.chatId,
      remoteName: incomingCall.caller.name,
      remotePic: incomingCall.caller.pic,
      token: user.token,
      isInitiator: "false",
    });

    // Note: We no longer pass offer via URL since VideoCallTab will receive it via socket

    // Open video call in a new tab
    window.open(`/video-call.html?${params.toString()}`, "_blank");

    // Close modal and reset state
    onClose();
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;

    // Stop ringtone
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // Notify caller that call was rejected
    socket.emit("callRejected", {
      to: incomingCall.from,
      chatId: incomingCall.chatId,
    });

    // Close modal and reset state
    onClose();
    setIncomingCall(null);

    toast({
      title: "Call Rejected",
      description: "You rejected the incoming call",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // Auto-close modal after 30 seconds
  useEffect(() => {
    if (isOpen && incomingCall) {
      const timer = setTimeout(() => {
        rejectCall();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, incomingCall]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={rejectCall}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.800" />
      <ModalContent>
        <ModalHeader textAlign="center">
          <Text fontSize="lg" fontWeight="bold">
            Incoming Video Call
          </Text>
        </ModalHeader>
        
        <ModalBody>
          {incomingCall && (
            <VStack spacing={4} align="center">
              <Avatar 
                size="xl" 
                src={incomingCall.caller.pic} 
                name={incomingCall.caller.name}
              />
              <VStack spacing={1}>
                <Text fontSize="xl" fontWeight="semibold">
                  {incomingCall.caller.name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  is calling you...
                </Text>
              </VStack>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={4} width="100%" justify="center">
            <Button
              colorScheme="red"
              onClick={rejectCall}
              size="lg"
              borderRadius="full"
              px={8}
            >
              Decline
            </Button>
            <Button
              leftIcon={<Phone />}
              colorScheme="green"
              onClick={acceptCall}
              size="lg"
              borderRadius="full"
              px={8}
            >
              Accept
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GlobalCallHandler;