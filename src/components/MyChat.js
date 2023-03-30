import { Box, Button, Stack, useToast, Text, Avatar } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { ChatState } from "../Context/ChatProvider";
import axios from "axios";
import { AddIcon } from "@chakra-ui/icons";
import ChatLoading from "./miscellaneous/ChatLoading";
import { getSender, getSenderPic } from "../config/ChatLogic";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import GroupsIcon from "@mui/icons-material/Groups";

function MyChat({ fetchAgain }) {
  const [loggedUser, setLoggedUser] = useState();
  const { seletedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const toast = useToast();
  const fetchChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        "https://tik-tak-chat-be.onrender.com/api/chat",
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
    }
  };
  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
  }, [fetchAgain]);

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
        dislay="flex"
        flexDirection="column"
        p={3}
        bgColor="rgb(247,240,235)"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <Stack overflowY="scroll">
            {chats.reverse().map((chat) => (
              <Box
                onClick={() => setSelectedChat(chat)}
                className="chat--hover"
                cursor="pointer"
                display="flex"
                alignItems="center"
                backgroundColor={seletedChat === chat ? "#ebe4eb" : "#fff"}
                color={seletedChat === chat ? "#333" : "#333"}
                px={3}
                py={2}
                borderRadius={{ base: "none", sm: "lg" }}
                key={chat._id}
              >
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
                <Box paddingLeft="10px">
                  {!chat.isGroupChat ? (
                    <Text
                      fontSize={{ base: "lg", lg: "xl" }}
                      maxW={{ md: "90px", lg: "120px", xl: "100%" }}
                      className="last-message"
                    >
                      {getSender(loggedUser, chat.users)}
                    </Text>
                  ) : (
                    <Text
                      fontSize={{ base: "lg", lg: "xl" }}
                      className="last-message"
                      maxW={{ md: "120px", lg: "120px", xl: "100%" }}
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
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
}

export default MyChat;
