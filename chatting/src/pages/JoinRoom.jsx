import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { io } from 'socket.io-client';
import { SocketContext } from '../context/SocketContext';



function JoinRoom() {
    const socket = useContext(SocketContext)
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    socket.emit('check-room', roomId);

    socket.once('room-status', ({ full }) => {
      if (full) {
        setError('Room is full! Try a different one.');
      } else {
        socket.emit('join', roomId);
        navigate(`/chat/${roomId}`);
      }
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🔐 Join a Room</h2>
      <input
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter Room ID"
      />
      <button onClick={handleJoin}>Join</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default JoinRoom;
