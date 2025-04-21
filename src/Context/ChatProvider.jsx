import { createContext, useContext, useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [seletedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const navigate = useNavigate();
  const [socket, setSocket] = useState();

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo")
      ? JSON.parse(localStorage.getItem("userInfo"))
      : null;
    setUser(userInfo);
    if (!userInfo) {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    setSocket(io("http://localhost:4000/"));
    // http://localhost:4000
  }, []);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        seletedChat,
        setSelectedChat,
        chats,
        setChats,
        notification,
        setNotification,
        socket,
        setSocket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext); 
};

export default ChatProvider;
