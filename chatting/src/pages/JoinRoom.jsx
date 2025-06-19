import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { motion } from 'framer-motion';

function JoinRoom() {
  const socket = useContext(SocketContext);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if(!roomId)return;
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
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 px-4">

      {/* Main Join Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-white bg-opacity-90 backdrop-blur-sm shadow-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-6 border border-rose-200 z-10"
      >
        <h2 className="text-3xl font-bold text-center text-rose-600 tracking-wide">
          💌 Join a Room
        </h2>

        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Type Room ID"
          className="w-full px-4 py-2 rounded-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition duration-300 text-rose-800 placeholder-pink-400"
        />

        <button
          onClick={handleJoin}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-2 rounded-xl shadow-lg transition duration-300"
        >
            Join Together
        </button>

        {error && (
          <p className="text-center text-sm font-medium text-rose-600">
            {error}
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default JoinRoom;
