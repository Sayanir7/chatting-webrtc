import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Chat.css';


// Define Sidebar component
const Sidebar = ({ chats, selectChat, selectedChat }) => {
  return (
    <div className="sidebar">
      <h2>Chats</h2>
      <Link to="/signup">Signup</Link>
      <Link to="/">Signin</Link>
      <Link to="/settings">Settings</Link>
      <Link to="/profile">Profile</Link>
      <ul>
        {chats.map((chat) => (
          <li
            key={chat.id}
            onClick={() => selectChat(chat.id)}
            className={chat.id === selectedChat ? 'active' : ''}
          >
            {chat.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Define ChatWindow component
const ChatWindow = ({ selectedChat, chats, messageInput, setMessageInput, sendMessage }) => {
  const chat = chats.find(chat => chat.id === selectedChat);

  return (
    <div className="chat-window">
      {chat ? (
        <>
          <div className="chat-header">
            <h2>{chat.name}</h2>
          </div>
          <div className="chat-messages">
            {chat.messages.map((message, index) => (
              <div key={index} className={`message ${message.sender === 'You' ? 'sent' : 'received'}`}>
                <span className="message-sender">{message.sender}</span>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
          <div className="message-input-box">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      ) : (
        <div className="no-chat-selected">
          <h3>Select a chat to start messaging</h3>
        </div>
      )}
    </div>
  );
};

// Main Chat component
const Chat = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [chats, setChats] = useState([
    {
      id: 1,
      name: 'John Doe',
      messages: [
        { sender: 'John Doe', content: 'Hey, how are you?' },
        { sender: 'You', content: 'I am good, how about you?' },
        { sender: 'John Doe', content: 'Doing great, thanks!' }
      ]
    },
    {
      id: 2,
      name: 'Jane Smith',
      messages: [
        { sender: 'Jane Smith', content: 'Are you coming to the party?' },
        { sender: 'You', content: 'Yes, I’ll be there!' }
      ]
    }
  ]);

  const selectChat = (chatId) => {
    setSelectedChat(chatId);
  };

  const sendMessage = () => {
    if (messageInput.trim() && selectedChat !== null) {
      const updatedChats = chats.map(chat => {
        if (chat.id === selectedChat) {
          return {
            ...chat,
            messages: [...chat.messages, { sender: 'You', content: messageInput }]
          };
        }
        return chat;
      });
      setChats(updatedChats);
      setMessageInput('');
    }
  };

  return (
    <div className="chat-app">
      <Sidebar chats={chats} selectChat={selectChat} selectedChat={selectedChat} />
      <ChatWindow 
        selectedChat={selectedChat} 
        chats={chats} 
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sendMessage={sendMessage}
      />
    </div>
  );
};

export default Chat;
