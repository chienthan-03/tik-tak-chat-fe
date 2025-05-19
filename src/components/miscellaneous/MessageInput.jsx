import React, { useState, useCallback, useRef } from "react";
import { FormControl, Input, IconButton, useToast } from "@chakra-ui/react";
import SendIcon from "@mui/icons-material/Send";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";

const MessageInput = ({
  setMessages,
  seletedChat,
  setFetchAgain,
  fetchAgain,
  messages,
  socketConnected,
}) => {
  const { user, socket } = ChatState();
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const lastTypingTime = useRef(0);
  const toast = useToast();

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    socket.emit("stop typing", seletedChat._id);

    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const content = newMessage.trim();
      setNewMessage("");
      
      // Add message optimistically to UI first for better UX
      const tempMessage = {
        sender: user,
        content: content,
        chat: seletedChat,
        createdAt: new Date().toISOString(),
        _id: new Date().getTime().toString(),
        isOptimistic: true // Flag to mark this as a temporary message
      };
      
      setMessages((prevMessages) => [...prevMessages, tempMessage]);
      
      const { data } = await axios.post(
        "http://localhost:4000/api/message",
        { content: content, chatId: seletedChat._id },
        config
      );

      // Only update fetchAgain to reorder chats, but don't fetch messages again
      setFetchAgain((prev) => !prev);
      
      // Emit the message to socket
      socket.emit("new message", data);
      
      // Replace the optimistic message with the real one
      setMessages((prevMessages) => 
        prevMessages.map(msg => 
          msg.isOptimistic && msg._id === tempMessage._id ? data : msg
        )
      );
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to send message",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      
      // Remove the optimistic message if there was an error
      setMessages((prevMessages) => 
        prevMessages.filter(msg => !(msg.isOptimistic && msg._id === new Date().getTime().toString()))
      );
    }
  }, [
    newMessage,
    seletedChat,
    user,
    setFetchAgain,
    socket,
    setMessages,
    toast,
  ]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") sendMessage();
    },
    [sendMessage]
  );

  const typingHandler = useCallback(
    (e) => {
      setNewMessage(e.target.value);
      if (!socketConnected) return;

      if (!typing) {
        setTyping(true);
        socket.emit("typing", seletedChat._id);
      }

      lastTypingTime.current = new Date().getTime();
      setTimeout(() => {
        const timeNow = new Date().getTime();
        if (timeNow - lastTypingTime.current >= 2000 && typing) {
          socket.emit("stop typing", seletedChat._id);
          setTyping(false);
        }
      }, 2000);
    },
    [socketConnected, socket, seletedChat, typing]
  );

  return (
    <FormControl onKeyDown={handleKeyDown} display="flex" mt={3} isRequired>
      <Input
        style={{ borderColor: "#333" }}
        variant="outline"
        focusBorderColor="black"
        placeholder="Enter a message.."
        value={newMessage}
        w="97%"
        onChange={typingHandler}
      />
      <IconButton
        marginLeft="3px"
        colorScheme="blackAlpha"
        onClick={sendMessage}
      >
        <SendIcon />
      </IconButton>
    </FormControl>
  );
};

export default React.memo(MessageInput);
