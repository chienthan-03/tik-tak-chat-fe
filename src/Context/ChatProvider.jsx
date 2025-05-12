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
  const [onlineUsers, setOnlineUsers] = useState(new Set());
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

  // Initialize socket
  useEffect(() => {
    const newSocket = io("http://localhost:4000/");
    setSocket(newSocket);
    
    // Set up socket event listeners
    if (newSocket) {
      // Listen for online users list
      newSocket.on("online_users", (users) => {
        console.log("Received online users:", users);
        setOnlineUsers(new Set(users));
      });
      
      // Listen for user status updates
      newSocket.on("user_status_update", (data) => {
        console.log("User status update:", data);
        setOnlineUsers(prevUsers => {
          const newUsers = new Set(prevUsers);
          if (data.status === "online") {
            newUsers.add(data.userId);
          } else {
            newUsers.delete(data.userId);
          }
          return newUsers;
        });
      });
      
      // Handle reconnection
      newSocket.on("reconnect", () => {
        console.log("Socket reconnected");
        // Re-setup the user after reconnection
        const userInfo = localStorage.getItem("userInfo")
          ? JSON.parse(localStorage.getItem("userInfo"))
          : null;
          
        if (userInfo) {
          newSocket.emit("setup", userInfo);
        }
      });
      
      // Clean up listeners on component unmount
      return () => {
        newSocket.off("online_users");
        newSocket.off("user_status_update");
        newSocket.off("reconnect");
        newSocket.disconnect();
      };
    }
  }, []);
  
  // Setup user in socket when user info is available
  useEffect(() => {
    if (socket && user) {
      // Setup user in socket
      socket.emit("setup", user);
      
      // Handle connection confirmation
      socket.on("connected", () => {
        console.log("Socket connected and user setup complete");
      });
      
      return () => {
        socket.off("connected");
      };
    }
  }, [socket, user]);

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
        onlineUsers,
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
