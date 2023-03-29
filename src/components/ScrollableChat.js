import React, { useState } from "react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogic";
import { ChatState } from "../Context/ChatProvider";
import {
  Avatar,
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  Text,
  Toast,
  Tooltip,
} from "@chakra-ui/react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import moment from "moment";
import axios from "axios";

function ScrollableChat({ messages, setFetchAgain, fetchAgain, fetchMessage }) {
  const { user } = ChatState();
  const [loading, setLoading] = useState(false);
  messages.map((mes) => {
    const createdDate = new Date(mes?.createdAt);
    const createAtNew = moment(createdDate, "YYYYMMDD").fromNow();
    return (mes.createAt = createAtNew);
  });

  const handleRemoveMess = async (id) => {
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put(
        `https://tik-tak-chat-be.onrender.com/api/message/remove/${id}`,
        { userId: user._id },
        config
      );
      setFetchAgain(!fetchAgain);
      fetchMessage();
      setLoading(false);
    } catch (error) {
      Toast({
        title: "Error Occured!",
        status: "Error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      console.log(error.messages);
    }
  };

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
            key={m._id}
          >
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
              <Tooltip label={m.sender.name} placement="left" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  name={m.sender.name}
                  src={m.sender.pic}
                />
              </Tooltip>
            )}
            {!m.isRemove ? (
              <Box
                maxW="75%"
                minW="120px"
                marginLeft={isSameSenderMargin(messages, m, i, user._id)}
                display="flex"
                alignItems="center"
              >
                {m.sender._id === user._id && (
                  <Menu>
                    <MenuButton
                      color="#33333348"
                      margin="10px 10px 0 0"
                      size="20px"
                      colorScheme="transparent"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                    </MenuButton>
                    <MenuList padding="10px 20px" textAlign="right">
                      <Text fontSize="sm">You want to delete message?</Text>
                      <Button
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRemoveMess(m._id)}
                        isLoading={loading}
                      >
                        yes
                      </Button>
                    </MenuList>
                  </Menu>
                )}
                <Text
                  style={{
                    backgroundColor: "#fff",
                    boxShadow: " #33333311 0px 0px 8px 2px",
                    borderRadius: "20px",
                    padding: "10px 15px",
                    minWidth: "120px",
                    marginTop: isSameUser(messages, m, i, user) ? 6 : 10,
                  }}
                >
                  <Text fontSize={{ base: "1rem", sm: "1.2rem" }}>
                    {m.content}
                  </Text>
                  <span
                    style={{
                      width: "100%",
                      display: "flex",
                      paddingRight: "5px",
                      justifyContent: `${
                        m.sender._id === user._id ? "flex-end" : "flex-start"
                      }`,
                      fontSize: ".7rem",
                      color: "#33333348",
                      alignContent: "space-between",
                    }}
                  >
                    {m.sender.name}
                    &emsp;
                    {m.createAt}
                  </span>
                </Text>
              </Box>
            ) : (
              <Text
                style={{
                  border: "1px solid #33333348",
                  boxShadow: " #33333311 0px 0px 8px 2px",
                  borderRadius: "20px",
                  padding: "10px 15px",
                  maxWidth: "75%",
                  minWidth: "120px",
                  backgroundColor: "transparent",
                  marginLeft: isSameSenderMargin(messages, m, i, user._id),
                  marginTop: isSameUser(messages, m, i, user) ? 6 : 10,
                }}
              >
                <Text
                  fontSize={{ base: "1rem", sm: "1.2rem" }}
                  color="#33333348"
                  as="i"
                >
                  {m.content}
                </Text>
              </Text>
            )}
          </div>
        ))}
    </ScrollableFeed>
  );
}

export default ScrollableChat;
