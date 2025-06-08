import React, { useState, useCallback, useMemo } from "react";
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
  useToast,
  Tooltip,
} from "@chakra-ui/react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import moment from "moment";
import axios from "axios";
import MessageContent from "./miscellaneous/MessageContent";

const ScrollableChat = ({
  messages,
  setFetchAgain,
  fetchAgain,
  fetchMessage,
  firstMessageRef,
}) => {
  const { user } = ChatState();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Format lại thời gian chỉ khi `messages` thay đổi
  const formattedMessages = useMemo(() => {
    return messages.map((mes) => ({
      ...mes,
      createAt: moment(mes?.createdAt).fromNow(),
    }));
  }, [messages]);

  // Xử lý xóa tin nhắn
  const handleRemoveMess = useCallback(
    async (id) => {
      try {
        setLoading(true);
        await axios.delete(`http://localhost:4000/api/message/remove/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
          data: { userId: user._id },
        });

        setFetchAgain(!fetchAgain);
        fetchMessage();
      } catch (error) {
        toast({
          title: "Error Occurred!",
          description: "Failed to delete message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, fetchAgain, setFetchAgain, fetchMessage, toast]
  );

  return (
    <ScrollableFeed>
      {formattedMessages.map((m, i) => (
        <div
          key={m._id}
          ref={i === 0 ? firstMessageRef : null}
          style={{ display: "flex", alignItems: "center" }}
        >
          {/* Hiển thị avatar */}
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

          {/* Nội dung tin nhắn */}
          <Box
            maxW="75%"
            minW="120px"
            marginLeft={isSameSenderMargin(messages, m, i, user._id)}
            display="flex"
            alignItems="center"
          >
            {/* Nút xóa tin nhắn */}
            {m.sender._id === user._id && !m.isRemove && (
              <Menu>
                <MenuButton colorScheme="transparent" margin="10px 10px 0 0">
                  <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                </MenuButton>
                <MenuList padding="10px 20px" textAlign="right">
                  <Text fontSize="sm">You want to delete this message?</Text>
                  <Button
                    colorScheme="red"
                    size="sm"
                    onClick={() => handleRemoveMess(m._id)}
                    isLoading={loading}
                  >
                    Yes
                  </Button>
                </MenuList>
              </Menu>
            )}

            {/* Nội dung tin nhắn */}
            <Box
              style={{
                backgroundColor: m.isRemove ? "transparent" : "#fff",
                boxShadow: " #33333311 0px 0px 8px 2px",
                borderRadius: "20px",
                padding: m.messageType === "image" ? "8px" : "10px 15px",
                minWidth: m.messageType === "image" ? "auto" : "120px",
                marginTop: isSameUser(messages, m, i, user) ? 6 : 10,
                border: m.isRemove ? "1px solid #33333348" : "none",
                color: m.isRemove ? "#33333348" : "#000",
              }}
            >
              <MessageContent message={m} isRemoved={m.isRemove} />
              <span
                style={{
                  width: "100%",
                  display: "flex",
                  paddingRight: "5px",
                  justifyContent:
                    m.sender._id === user._id ? "flex-end" : "flex-start",
                  fontSize: ".7rem",
                  color: "#33333348",
                  marginTop: m.messageType === "image" ? "8px" : "0",
                }}
              >
                {m.sender.name} &emsp; {m.createAt}
              </span>
            </Box>
          </Box>
        </div>
      ))}
    </ScrollableFeed>
  );
};

export default React.memo(ScrollableChat);
