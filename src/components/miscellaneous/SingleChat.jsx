import {
  Avatar,
  AvatarGroup,
  Box,
  IconButton,
  Spinner,
  Text,
  useToast,
  Circle,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderPic } from "../../config/ChatLogic";
import UpdateGroupChatModal from "./UpdateGroupChatModal";
import axios from "axios";
import "../style.css";
import ScrollableChat from "../ScrollableChat";
import Lottie from "lottie-react";
import animationData from "../../animation/loadingChat.json";
import MessageInput from "./MessageInput";
import VideoCallButton from "./VideoCallButton";

var seletedCompare;
const PAGESIZE = 30;
function SingleChat({ fetchAgain, setFetchAgain }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  const {
    user,
    seletedChat,
    setSelectedChat,
    notification,
    setNotification,
    socket,
    onlineUsers,
  } = ChatState();
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

  const fetchMessage = useCallback(
    async (page = 1, append = false) => {
      if (!seletedChat) return;
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data } = await axios.get(
          `http://localhost:4000/api/message/paginated/${seletedChat._id}?page=${page}&pageSize=${PAGESIZE}`,
          config
        );

        if (data.messages.length === 0) {
          setHasMore(false);
        }

        setMessages((prev) =>
          append ? [...data.messages, ...prev] : data.messages
        );
        if (page === 1) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      } catch (error) {
        toast({
          title: "Error Occurred!!",
          description: "Failed to load the messages",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
      }
    },
    [seletedChat, user.token, toast]
  );

  // Fix the useEffect for socket message receiving
  useEffect(() => {
    const handleNewMessage = (newMessageRecieved) => {
      if (
        !seletedCompare ||
        seletedCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prevMessages) => [...prevMessages, newMessageRecieved]);
      }
    };

    // Listen for incoming call notifications
    const handleIncomingCall = (data) => {
      if (data.chatId === seletedChat?._id) {
        // Build URL parameters for the video call page
        const recipient = seletedChat.users.find(u => u._id === data.from);
        if (!recipient) return;
        
        const params = new URLSearchParams({
          userId: user._id,
          username: user.name,
          chatId: seletedChat._id,
          remoteName: recipient.name,
          remotePic: recipient.pic,
          token: user.token,
          isInitiator: "false",
        });
        
        // Play notification sound and show toast before opening video call
        const audio = new Audio("/sounds/incoming-call.mp3");
        audio.play().catch(err => console.error("Could not play audio:", err));
        
        toast({
          title: "Incoming Video Call",
          description: `${recipient.name} is calling you`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
        
        // Open video call in a new tab
        window.open(`/video-call.html?${params.toString()}`, "_blank");
      }
    };

    socket.on("message recieved", handleNewMessage);
    socket.on("incomingCall", handleIncomingCall);

    // Cleanup listener on unmount
    return () => {
      socket.off("message recieved", handleNewMessage);
      socket.off("incomingCall", handleIncomingCall);
    };
  }, [notification, setNotification, setFetchAgain, fetchAgain, seletedChat, user._id, user.name, user.token, toast]);

  // Fix the initial setup useEffect
  useEffect(() => {
    socket.emit("setup", user);

    const handleConnected = () => setSocketConnected(true);
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("connected", handleConnected);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);

    return () => {
      socket.off("connected", handleConnected);
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
  }, [socket, user]);

  // Fix the chat selection useEffect
  useEffect(() => {
    if (seletedChat) {
      fetchMessage(1, false);
      setHasMore(true);
      setPage(1);
      seletedCompare = { ...seletedChat };
    }
  }, [seletedChat, fetchMessage]);

  // Fix firstMessageRef callback dependencies
  const firstMessageRef = useCallback(
    (node) => {
      if (loading || !hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchMessage(nextPage, true);
            return nextPage;
          });
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, fetchMessage]
  );

  useEffect(() => {
    if (observer.current) observer.current.disconnect();
  }, [seletedChat]);

  return (
    <>
      {seletedChat ? (
        <>
          <Text
            fontSize="23px"
            w="100%"
            display="flex"
            alignItems="center"
            justifyContent={{ base: "space-between" }}
          >
            <Box display="flex" alignItems="center">
              <IconButton
                display={{ base: "flex", md: "none" }}
                icon={<ArrowBackIcon />}
                colorScheme="none"
                color="#333"
                fontSize="3xl"
                onClick={() => setSelectedChat("")}
                mr={2}
              />
              {!seletedChat.isGroupChat && <VideoCallButton />}
            </Box>
            {!seletedChat.isGroupChat ? (
              <>
                <Flex alignItems="center">
                  <Text mr={2}>{getSender(user, seletedChat.users)}</Text>
                  {isRecipientOnline() && (
                    <Flex alignItems="center">
                      <Circle size="8px" bg="#31A24C" mr={1} />
                      <Text fontSize="xs" color="#31A24C">Active now</Text>
                    </Flex>
                  )}
                </Flex>
                <Box position="relative">
                  <Avatar src={getSenderPic(user, seletedChat.users)} />
                  {isRecipientOnline() && (
                    <Circle
                      size="10px"
                      bg="#31A24C"
                      position="absolute"
                      bottom="0"
                      right="0"
                      borderWidth="2px"
                      borderColor="white"
                    />
                  )}
                </Box>
              </>
            ) : (
              <>
                <Text fontSize={{ base: "2xl", sm: "3xl" }}>
                  {seletedChat.chatName}
                </Text>
                <Box display="flex" flexDirection="row">
                  <AvatarGroup size="sm" max={2} fontSize="sm">
                    {seletedChat.users.map((user) => (
                      <Avatar key={user._id} size="xs" name={user.name} src={user.pic} />
                    ))}
                  </AvatarGroup>
                  <UpdateGroupChatModal
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                    fetchMessage={fetchMessage}
                  />
                </Box>
              </>
            )}
          </Text>
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="flex-end"
            p={3}
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="scroll"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                {loadingMore && (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Spinner />
                  </div>
                )}
                <ScrollableChat
                  messages={messages}
                  setFetchAgain={setFetchAgain}
                  fetchAgain={fetchAgain}
                  fetchMessage={fetchMessage}
                  firstMessageRef={firstMessageRef}
                />
                {isTyping ? (
                  <div
                    style={{
                      height: "30px",
                      margin: "6px 0 0 36px",
                    }}
                  >
                    <Lottie
                      animationData={animationData}
                      loop={true}
                      autoplay={true}
                      style={{ width: 60, marginButton: 15, marginLeft: 0 }}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </div>
            )}
            <MessageInput
              setMessages={setMessages}
              setFetchAgain={setFetchAgain}
              socketConnected={socketConnected}
              seletedChat={seletedChat}
              fetchAgain={fetchAgain}
              messages={messages}
            />
          </Box>
        </>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
        >
          <Text fontSize="3xl" pb={3}>
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
}

export default SingleChat;
