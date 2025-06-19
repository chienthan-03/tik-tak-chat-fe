import React, { useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
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
  onScroll,
}) => {
  const { user } = ChatState();
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const prevScrollTop = useRef(0);
  const toast = useToast();

  // Format thời gian
  const formattedMessages = useMemo(
    () =>
      messages.map((mes) => ({
        ...mes,
        createAt: moment(mes?.createdAt).fromNow(),
      })),
    [messages]
  );

  // Xóa tin nhắn
  const handleRemoveMess = useCallback(
    async (id) => {
      try {
        setLoading(true);
        await axios.delete(
          `http://localhost:4000/api/message/remove/${id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
            data: { userId: user._id },
          }
        );
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

  // Ghi lại vị trí scroll trước khi load thêm
  const handleScroll = (e) => {
    const target = e.target;
    prevScrollHeight.current = target.scrollHeight;
    prevScrollTop.current = target.scrollTop;
    if (target.scrollTop === 0 && onScroll) {
      onScroll(e);
    }
  };

  // Điều chỉnh scroll sau khi messages thay đổi
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const newScrollHeight = container.scrollHeight;
    container.scrollTop = newScrollHeight - prevScrollHeight.current + prevScrollTop.current;
  }, [messages]);

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      h="100%"
      overflowY="auto"
      pr={2}
      css={{ '&::-webkit-scrollbar': { display: 'none' } }}
    >
      {formattedMessages.map((m, i) => (
        <Box key={m._id} ref={i === 0 ? firstMessageRef : null} display="flex" alignItems="center">
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
          <Box
            maxW="75%"
            minW="120px"
            ml={isSameSenderMargin(messages, m, i, user._id)}
            display="flex"
            alignItems="center"
          >
            {m.sender._id === user._id && !m.isRemove && (
              <Menu>
                <MenuButton colorScheme="transparent" m="10px 10px 0 0">
                  <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                </MenuButton>
                <MenuList p="10px 20px" textAlign="right">
                  <Text fontSize="sm">You want to delete this message?</Text>
                  <Button colorScheme="red" size="sm" onClick={() => handleRemoveMess(m._id)} isLoading={loading}>
                    Yes
                  </Button>
                </MenuList>
              </Menu>
            )}
            <Box
              bg={m.isRemove ? 'transparent' : '#fff'}
              boxShadow="#33333311 0 0 8px 2px"
              borderRadius="20px"
              p={m.messageType === 'image' ? 2 : '10px 15px'}
              minW={m.messageType === 'image' ? 'auto' : '120px'}
              mt={isSameUser(messages, m, i, user) ? 2 : 4}
              border={m.isRemove ? '1px solid #33333348' : 'none'}
              color={m.isRemove ? '#33333348' : '#000'}
            >
              <MessageContent message={m} isRemoved={m.isRemove} />
              <Text
                w="100%"
                display="flex"
                pr={1}
                justifyContent={m.sender._id === user._id ? 'flex-end' : 'flex-start'}
                fontSize=".7rem"
                color="#33333348"
                mt={m.messageType === 'image' ? 2 : 0}
              >
                {m.sender.name}&emsp;{m.createAt}
              </Text>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default React.memo(ScrollableChat);
