import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { io } from 'socket.io-client';
import { SocketContext } from '../context/SocketContext';

// const socket = io('https://chatting-server-zxbx.onrender.com');

function ChatRoom({roomId}) {
//   const { roomId } = useParams();
const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('chat-message', ({ message, sender }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat-message', { room: roomId, message: input });
      setMessages((prev) => [...prev, { sender: 'You', message: input }]);
      setInput('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>💬 Chat Room: {roomId}</h2>
      <div style={{ border: '1px solid #ccc', height: '200px', overflowY: 'scroll', marginBottom: '10px' }}>
        {messages.map((msg, idx) => (
          <p key={idx}><strong>{msg.sender}:</strong> {msg.message}</p>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={sendMessage}>Send</button>

      <hr />
      <button onClick={() => navigate(`/video/${roomId}`)}>🎥 Start Video Call</button>
    </div>
  );
}

export default ChatRoom;
