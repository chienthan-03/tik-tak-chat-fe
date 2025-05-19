import { createContext, useContext, useEffect } from "react";
import { useState, useCallback } from "react";
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

  // Load notifications from localStorage on initial load
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsedNotifications = JSON.parse(savedNotifications);
        if (Array.isArray(parsedNotifications) && parsedNotifications.length > 0) {
          setNotification(parsedNotifications);
        }
      } catch (error) {
        console.error("Error parsing notifications from localStorage:", error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notification.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notification));
    } else {
      localStorage.removeItem('notifications');
    }
  }, [notification]);

  // Function to update chats and ensure they are properly sorted
  const updateChats = useCallback((newChats) => {
    // Store the currently selected chat id if any
    const selectedChatId = seletedChat?._id;
    
    // Sort chats so new messages appear at the top
    const sortedChats = [...newChats].sort((a, b) => {
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
    
    // Update the chats list
    setChats(sortedChats);
    
    // If we had a selected chat before, make sure we keep it selected
    if (selectedChatId) {
      const updatedSelectedChat = sortedChats.find(chat => chat._id === selectedChatId);
      if (updatedSelectedChat && JSON.stringify(updatedSelectedChat) !== JSON.stringify(seletedChat)) {
        setSelectedChat(updatedSelectedChat);
      }
    }
  }, [seletedChat, setSelectedChat]);

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
        setChats: updateChats,
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
