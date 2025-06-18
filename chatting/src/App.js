import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext.js';
import JoinRoom from './pages/JoinRoom.jsx';
// import ChatRoom from './ChatRoom';
// import VideoChat from './VideoChat';
import ChattingPage from './pages/ChattingPage.jsx';
import VideoPage from './pages/VideoPage.jsx';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/chat/:roomId" element={<ChattingPage/>} />
          <Route path="/video/:roomId" element={<VideoPage />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
