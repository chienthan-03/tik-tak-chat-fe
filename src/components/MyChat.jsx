import { Box, Button, Stack, useToast, Text, Avatar, Circle } from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { ChatState } from "../Context/ChatProvider";
import axios from "axios";
import { AddIcon } from "@chakra-ui/icons";
import { getSender, getSenderPic } from "../config/ChatLogic";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import GroupsIcon from "@mui/icons-material/Groups";

function MyChat({ fetchAgain }) {
  const [loggedUser, setLoggedUser] = useState();
  const { seletedChat, setSelectedChat, user, chats, setChats, onlineUsers } = ChatState();
  const toast = useToast();
  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        "http://localhost:4000/api/chat",
        config
      );
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain]);
  
  // Helper to check if user is online
  const isUserOnline = (chat) => {
    if (chat.isGroupChat) return false;
    
    // Find the other user in the chat (not the current user)
    const otherUser = chat.users.find(
      (u) => u._id !== loggedUser?._id
    );
    
    return otherUser && onlineUsers.has(otherUser._id);
  };

  // Sort chats to show most recent messages at the top
  const sortedChats = useMemo(() => {
    if (!chats) return [];
    
    return [...chats].sort((a, b) => {
      // If a has latest message and b doesn't, a comes first
      if (a.latestMessage && !b.latestMessage) return -1;
      // If b has latest message and a doesn't, b comes first
      if (!a.latestMessage && b.latestMessage) return 1;
      // If both have latest messages, compare timestamps
      if (a.latestMessage && b.latestMessage) {
        return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
      }
      // If neither has latest messages, keep original order
      return 0;
    });
  }, [chats]);
  
  return (
    <Box
      display={{ base: seletedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={3}
      bgColor="white"
      height={{ base: "100%", sm: "91.5vh" }}
      width={{ base: "100%", md: "30%", lg: "30%" }}
    >
      <Box
        pb={3}
        fontSize={{ base: "20px", xl: "24px", lg: "20px" }}
        display="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
        style={{ textTransform: "uppercase" }}
      >
        Inbox
        <GroupChatModal>
          <Button
            color="#333"
            display="flex"
            fontSize={{ base: "13px", lg: "17px" }}
            rightIcon={<AddIcon />}
          >
            New
          </Button>
        </GroupChatModal>
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        p={3}
        bgColor="rgb(247,240,235)"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        <Stack overflowY="scroll" width="100%">
          {sortedChats.map((chat) => (
            <Box
              onClick={() => {
                if (seletedChat?._id !== chat._id) {
                  setSelectedChat(chat);
                }
              }}
              className="chat--hover"
              cursor="pointer"
              display="flex"
              alignItems="center"
              backgroundColor={seletedChat && seletedChat._id === chat._id ? "#ebe4eb" : "#fff"}
              color={seletedChat && seletedChat._id === chat._id ? "#333" : "#333"}
              px={3}
              py={2}
              borderRadius={{ base: "none", sm: "lg" }}
              key={chat._id}
              position="relative"
            >
              <Box position="relative" flexShrink={0}>
                {!chat.isGroupChat ? (
                  <Avatar
                    size={{ base: "sm", lg: "md" }}
                    src={getSenderPic(loggedUser, chat.users)}
                  />
                ) : (
                  <Avatar
                    size={{ base: "sm", lg: "md" }}
                    icon={<GroupsIcon />}
                    bgColor="gray.200"
                  />
                )}
                {isUserOnline(chat) && (
                  <Circle
                    size="12px"
                    bg="#31A24C"
                    position="absolute"
                    bottom="0"
                    right="0"
                    borderWidth="2px"
                    borderColor="white"
                  />
                )}
              </Box>
              <Box paddingLeft="10px" width="calc(100% - 50px)">
                {!chat.isGroupChat ? (
                  <Text
                    fontSize={{ base: "lg", lg: "xl" }}
                    maxW={{ md: "90px", lg: "120px", xl: "100%" }}
                    className="last-message"
                    isTruncated
                  >
                    {getSender(loggedUser, chat.users)}
                    {isUserOnline(chat) && (
                      <Text
                        as="span"
                        fontSize="xs"
                        color="#31A24C"
                        ml={2}
                        fontWeight="normal"
                      >
                        • Active now
                      </Text>
                    )}
                  </Text>
                ) : (
                  <Text
                    fontSize={{ base: "lg", lg: "xl" }}
                    className="last-message"
                    maxW={{ md: "120px", lg: "120px", xl: "100%" }}
                    isTruncated
                  >
                    {chat.chatName}
                  </Text>
                )}
                <Text color="#6e6e6e" fontSize="medium">
                  {chat.latestMessage && (
                    <Text
                      className="last-message"
                      fontSize={{ base: "sm", lg: "md" }}
                      maxW={{ md: "90px", lg: "120px", xl: "100%" }}
                      isTruncated
                    >
                      <>
                        {chat.latestMessage.sender._id !== user._id
                          ? chat.latestMessage.sender.name
                          : "you "}
                        : &nbsp;
                      </>
                      {chat.latestMessage.content.length > 50
                        ? chat.latestMessage.content.substring(0, 51) + "..."
                        : chat.latestMessage.content}
                    </Text>
                  )}
                </Text>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default MyChat;
