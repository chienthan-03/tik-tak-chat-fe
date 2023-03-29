import "./App.css";
import HomePage from "./Page/homePage";
import { Route } from "react-router-dom";
import ChatPage from "./Page/chatPage";

function App() {
  return (
    <div className="App">
      <Route path="/" component={HomePage} exact />
      <Route path="/chats" component={ChatPage} />
    </div>
  );
}

export default App;
