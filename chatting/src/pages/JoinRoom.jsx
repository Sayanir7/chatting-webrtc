import React, { useContext, useState, useEffect } from 'react';
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

  // animation 

   useEffect(() => {
    const heartContainer = document.createElement('div');
    heartContainer.className = 'heart-container';
    document.body.appendChild(heartContainer);

    const createHeart = () => {
      const heart = document.createElement('div');
      heart.className = 'heart';
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.animationDuration = `${4 + Math.random() * 4}s`;
      heart.style.opacity = Math.random();
      heartContainer.appendChild(heart);

      setTimeout(() => {
        heart.remove();
      }, 8000);
    };

    const interval = setInterval(createHeart, 400);
    return () => {
      clearInterval(interval);
      heartContainer.remove();
    };
  }, []);
   return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 px-4 z-5 opacity-1">
      {/* Main Join Card */}
      <div className="bg-white bg-opacity-90 backdrop-blur-sm shadow-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-6 border border-rose-200 z-10">
        <h2 className="text-3xl font-bold text-center text-rose-600 tracking-wide">
          💌 Join Our Special Room
        </h2>

        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Type Room ID, Love"
          className="w-full px-4 py-2 rounded-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition duration-300 text-rose-800 placeholder-pink-400"
        />

        <button
          onClick={handleJoin}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-pink-500 hover:to-rose-500 text-white font-semibold py-2 rounded-xl shadow-lg transition duration-300"
        >
          💞 Join Together
        </button>

        {error && (
          <p className="text-center text-sm font-medium text-rose-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default JoinRoom;
