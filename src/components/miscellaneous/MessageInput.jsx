import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  FormControl,
  Input,
  IconButton,
  useToast,
  Box,
  HStack,
} from "@chakra-ui/react";
import SendIcon from "@mui/icons-material/Send";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";
import EmojiPicker from "./EmojiPicker";
import ImagePicker from "./ImagePicker";

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
  const inputRef = useRef(null);
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
        isOptimistic: true, // Flag to mark this as a temporary message
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
        prevMessages.map((msg) =>
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
        prevMessages.filter(
          (msg) =>
            !(msg.isOptimistic && msg._id === new Date().getTime().toString())
        )
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

  // Xử lý khi chọn emoji
  const handleEmojiSelect = useCallback(
    (emoji) => {
      const input = inputRef.current;
      if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const currentValue = newMessage;

        // Chèn emoji tại vị trí cursor
        const newValue =
          currentValue.slice(0, start) + emoji + currentValue.slice(end);
        setNewMessage(newValue);

        // Đặt lại focus và cursor position sau khi chèn emoji
        setTimeout(() => {
          input.focus();
          const newCursorPosition = start + emoji.length;
          input.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
      } else {
        // Fallback nếu không có input ref
        setNewMessage((prev) => prev + emoji);
      }
    },
    [newMessage]
  );

  // Xử lý khi gửi ảnh
  const handleImageSelect = useCallback(
    async (imageFile, caption) => {
      if (!seletedChat) return;

      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("chatId", seletedChat._id);
        if (caption) {
          formData.append("caption", caption);
        }

        const config = {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${user.token}`,
          },
        };

        // Tạo temporary message cho UI
        const tempMessage = {
          sender: user,
          content: caption || "",
          chat: seletedChat,
          messageType: "image",
          imageUrl: URL.createObjectURL(imageFile), // Temporary URL for preview
          createdAt: new Date().toISOString(),
          _id: new Date().getTime().toString(),
          isOptimistic: true,
        };

        setMessages((prevMessages) => [...prevMessages, tempMessage]);

        const { data } = await axios.post(
          "http://localhost:4000/api/message/image",
          formData,
          config
        );

        // Update fetchAgain to reorder chats
        setFetchAgain((prev) => !prev);

        // Emit the message to socket
        socket.emit("new message", data);

        // Replace the optimistic message with the real one
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.isOptimistic && msg._id === tempMessage._id ? data : msg
          )
        );

        // Cleanup temporary URL
        URL.revokeObjectURL(tempMessage.imageUrl);
      } catch (error) {
        console.error("Error sending image:", error);

        // Remove the optimistic message if there was an error
        setMessages((prevMessages) =>
          prevMessages.filter(
            (msg) =>
              !(msg.isOptimistic && msg._id === new Date().getTime().toString())
          )
        );

        throw error; // Re-throw để ImagePicker có thể handle
      }
    },
    [seletedChat, user, setMessages, setFetchAgain, socket]
  );

  return (
    <FormControl onKeyDown={handleKeyDown} display="flex" mt={3} isRequired>
      <Box position="relative" w="100%" display="flex" alignItems="center">
        <Input
          ref={inputRef}
          style={{ borderColor: "#333" }}
          variant="outline"
          focusBorderColor="black"
          placeholder="Enter a message.."
          value={newMessage}
          onChange={typingHandler}
          pr="80px" // Để chừa chỗ cho emoji và image buttons
        />
        <HStack position="absolute" right="10px" zIndex={1} spacing={1}>
          <ImagePicker
            onImageSelect={handleImageSelect}
            disabled={!seletedChat}
          />
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            disabled={!seletedChat}
          />
        </HStack>
      </Box>
      <IconButton
        marginLeft="8px"
        colorScheme="blackAlpha"
        onClick={sendMessage}
        disabled={!newMessage.trim()}
      >
        <SendIcon />
      </IconButton>
    </FormControl>
  );
};

export default React.memo(MessageInput);
