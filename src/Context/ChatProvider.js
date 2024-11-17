import { useHistory } from "react-router-dom";
import io from "socket.io-client";
const { createContext, useContext, useState, useEffect } = require("react");

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [seletedChat, setSelectedChat] = useState();
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const history = useHistory();
  const [socket, setSocket] = useState();

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo")
      ? JSON.parse(localStorage.getItem("userInfo"))
      : null;
    setUser(userInfo);
    if (!userInfo) {
      history.push("/");
    }
  }, [history]);

  useEffect(() => {
    setSocket(io("https://tik-tak-chat-be.onrender.com/"));
    // https://tik-tak-chat-be.onrender.com
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
