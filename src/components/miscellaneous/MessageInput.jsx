import React, { useState, useCallback, useRef, useEffect } from "react";
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
  
  // Reset typing state when changing chats
  useEffect(() => {
    if (socket && seletedChat) {
      socket.emit("stop typing", seletedChat._id);
      setTyping(false);
    }
  }, [seletedChat, socket]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    socket.emit("stop typing", seletedChat._id);
    setTyping(false);
    
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
      
      // Don't send typing events if socket is not connected or no chat selected
      if (!socketConnected || !seletedChat) return;

      // Check if already typing
      if (!typing) {
        setTyping(true);
        console.log("Emitting typing event to room:", seletedChat._id);
        socket.emit("typing", seletedChat._id);
      }

      // Set last typing time
      const lastTypingTimeNow = new Date().getTime();
      lastTypingTime.current = lastTypingTimeNow;
      
      // Create a timeout function to stop typing indication after 3 seconds
      const timerLength = 3000;
      setTimeout(() => {
        const timeNow = new Date().getTime();
        // Only emit stop typing if the lastTypingTime is the same as what we set earlier
        // This means the user hasn't typed since then
        if (timeNow - lastTypingTime.current >= timerLength && typing) {
          console.log("Emitting stop typing event to room:", seletedChat._id);
          socket.emit("stop typing", seletedChat._id);
          setTyping(false);
        }
      }, timerLength);
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
