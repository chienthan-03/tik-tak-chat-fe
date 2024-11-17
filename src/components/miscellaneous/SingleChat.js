import {
  Avatar,
  AvatarGroup,
  Box,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderPic } from "../../config/ChatLogic";
import UpdateGroupChatModal from "./UpdateGroupChatModal";
import axios from "axios";
import "../style.css";
import SendIcon from "@mui/icons-material/Send";
import ScrollableChat from "../ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../../animation/loadingChat.json";

var seletedCompare;

function SingleChat({ fetchAgain, setFetchAgain }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState();
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const {
    user,
    seletedChat,
    setSelectedChat,
    notification,
    setNotification,
    socket,
  } = ChatState();
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const fetchMessage = async () => {
    if (!seletedChat) return;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);
      const { data } = await axios.get(
        `https://tik-tak-chat-be.onrender.com/api/message/${seletedChat._id}`,
        config
      );

      setMessages(data);
      setLoading(false);

      socket.emit("join chat", seletedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!!",
        description: "Failed to load the messages",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };
  const handleSentMess = async () => {
    socket.emit("stop typing", seletedChat._id);
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      setNewMessage("");
      const { data } = await axios.post(
        "https://tik-tak-chat-be.onrender.com/api/message",
        {
          content: newMessage,
          chatId: seletedChat._id,
        },
        config
      );
      setFetchAgain(!fetchAgain);
      socket.emit("new message", data);
      setMessages([...messages, data]);
    } catch (error) {
      toast({
        title: "Error Occured!!",
        description: "Failed to send message",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", seletedChat._id);
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        setNewMessage("");
        const { data } = await axios.post(
          "https://tik-tak-chat-be.onrender.com/api/message",
          {
            content: newMessage,
            chatId: seletedChat._id,
          },
          config
        );
        setFetchAgain(!fetchAgain);
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occured!!",
          description: "Failed to send message",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };
  useEffect(() => {
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, []);
  useEffect(() => {
    fetchMessage();
    seletedCompare = seletedChat;
  }, [seletedChat]);

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !seletedCompare ||
        seletedCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", seletedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timeLength = 2000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timeLength && typing) {
        socket.emit("stop typing", seletedChat._id);
        setTyping(false);
      }
    }, timeLength);
  };

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
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              colorScheme="none"
              color="#333"
              fontSize="3xl"
              onClick={() => setSelectedChat("")}
            />
            {!seletedChat.isGroupChat ? (
              <>
                {getSender(user, seletedChat.users)}
                <Avatar src={getSenderPic(user, seletedChat.users)} />
              </>
            ) : (
              <>
                <Text fontSize={{ base: "2xl", sm: "3xl" }}>
                  {seletedChat.chatName}
                </Text>
                <Box display="flex" flexDirection="row">
                  <AvatarGroup size="sm" max={2} fontSize="sm">
                    {seletedChat.users.map((user) => (
                      <Avatar size="xs" name={user.name} src={user.pic} />
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
                <ScrollableChat
                  messages={messages}
                  setFetchAgain={setFetchAgain}
                  fetchAgain={fetchAgain}
                  fetchMessage={fetchMessage}
                />
                {isTyping ? (
                  <div
                    style={{
                      height: "30px",
                      margin: "6px 0 0 36px",
                    }}
                  >
                    <Lottie
                      options={defaultOptions}
                      width={60}
                      style={{ marginButton: 15, marginLeft: 0 }}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </div>
            )}
            <FormControl
              onKeyDown={sendMessage}
              display="flex"
              mt={3}
              isRequired
            >
              <Input
                style={{ borderColor: "#333" }}
                variant="outline"
                focusBorderColor="black"
                BorderColor="black"
                placeholder="Enter a message.."
                value={newMessage}
                w="97%"
                onChange={typingHandler}
              />
              <IconButton
                marginLeft="3px"
                colorScheme="blackAlpha"
                onClick={handleSentMess}
              >
                <SendIcon />
              </IconButton>
            </FormControl>
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
