import "./App.css";
import HomePage from "./Page/homePage.jsx";
import { Routes, Route } from "react-router-dom";
import ChatPage from "./Page/chatPage.jsx";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<ChatPage />} />
      </Routes>
    </div>
  );
}

export default App;
