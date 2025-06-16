import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import EmojiPicker from 'emoji-picker-react';

function ChatRoom({ roomId }) {
  const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('chat-message', ({ message, sender }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat-message', { room: roomId, message: input });
      setMessages((prev) => [...prev, { sender: 'me', message: input }]);
      setInput('');
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>💬 Chat Room: {roomId}</h2>

      <div style={{ width: '100%', maxWidth: '500px', margin: '20px auto' }}>
        <div
          style={{
            height: '240px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '10px',
            padding: '10px',
            background: '#f9f9f9',
          }}
        >
          {messages.map((msg, index) => (
            <p
              key={index}
              style={{
                textAlign: msg.sender === 'me' ? 'right' : 'left',
                margin: '5px 0',
              }}
            >
              <span
                style={{
                  background: msg.sender === 'me' ? '#dcf8c6' : '#fff',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  color: '#333',
                }}
              >
                {msg.message}
              </span>
            </p>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#eee',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            😊
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </div>

        {showEmojiPicker && (
          <div style={{ marginTop: '10px' }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>

      <hr />
      <button
        onClick={() => navigate(`/video/${roomId}`)}
        style={{
          padding: '10px 20px',
          borderRadius: '6px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        🎥 Start Video Call
      </button>
    </div>
  );
}

export default ChatRoom;
