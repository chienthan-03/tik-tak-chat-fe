import { Box } from "@chakra-ui/react";
import React from "react";
import { ChatState } from "../Context/ChatProvider";
import SingleChat from "./miscellaneous/SingleChat";

function ChatBox({ fetchAgain, setFetchAgain }) {
  const { seletedChat } = ChatState();
  return (
    <Box
      display={{ base: seletedChat ? "flex" : "none", md: "flex" }}
      alignItems="center"
      flexDir="column"
      padding="12px 12px 0 12px"
      bgGradient="linear(160deg, rgb(247, 240, 235) 68%, rgba(156,139,161, 0.7))"
      width={{ base: "100%", md: "70%", lg: "70%" }}
      borderRightRadius={{ base: "none", sm: "lg" }}
      height={{ base: "100%", sm: "91.5vh" }}
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
}

export default ChatBox;
