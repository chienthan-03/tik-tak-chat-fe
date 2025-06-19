import { Box } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import SideDrawer from "../components/miscellaneous/SideDrawer.jsx";
import MyChat from "../components/MyChat.jsx";
import ChatBox from "../components/ChatBox.jsx";
import GlobalCallHandler from "../components/GlobalCallHandler.jsx";
import { useState } from "react";
let ChatPage = () => {
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(true);
  return (
    <div style={{ width: "100%" }}>
      {/* Global Call Handler - handles incoming calls regardless of current chat */}
      {user && <GlobalCallHandler />}
      
      <Box
        display="flex"
        flexDirection={{ base: "column-reverse", sm: "row" }}
        justifyContent="space-between"
        width="100%"
        height={{ base: "100vh", sm: "91.5vh" }}
        padding={{ base: "-40px -20px 0 -20px", sm: "40px 20px 0 20px" }}
      >
        <Box
          w={{ base: "100%", sm: "10%", xl: "5%" }}
          display={{ base: "flex", sm: "flex" }}
          justifyContent="center"
          bgColor="whiteAlpha.400"
          borderLeftRadius={{ base: "none", sm: "lg" }}
          h={{ base: "8%", sm: "91.5vh" }}
        >
          {user && <SideDrawer />}
        </Box>
        <Box
          display="flex"
          justifyContent="space-between"
          w={{ base: "100%", sm: "90%", xl: "95%" }}
          height={{ base: "92%", sm: "91.5vh" }}
        >
          {user && (
            <MyChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
          )}

          {user && (
            <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
          )}
        </Box>
      </Box>
    </div>
  );
};

export default ChatPage;
