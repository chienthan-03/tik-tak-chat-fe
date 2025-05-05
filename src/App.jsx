import "./App.css";
import HomePage from "./Page/homePage.jsx";
import { Routes, Route } from "react-router-dom";
import ChatPage from "./Page/chatPage.jsx";
import VideoCallPage from "./Page/VideoCallPage.jsx";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<ChatPage />} />
        <Route path="/video-call" element={<VideoCallPage />} />
      </Routes>
    </div>
  );
}

export default App;
