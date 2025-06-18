import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { BsBalloonHeart } from "react-icons/bs";
import { motion, AnimatePresence } from 'framer-motion';

function JoinRoom() {
  const socket = useContext(SocketContext);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [hearts, setHearts] = useState([]);
  const idRef = useRef(0);
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

  // Floating heart animation logic
  useEffect(() => {
    const interval = setInterval(() => {
      const id = idRef.current++;
      const left = Math.random() * 100;
      const duration = 4 + Math.random() * 4;
      setHearts((prev) => [...prev, { id, left, duration }]);

      // Remove after 8s
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, 8000);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 px-4 z-5 opacity-1">
      
      {/* Floating Hearts Container */}
      <div className="heart-container pointer-events-none fixed top-0 left-0 w-full h-full z-0 overflow-hidden">
        <AnimatePresence>
          {hearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ y: "100vh", opacity: 0.3, scale: 0.6 }}
              animate={{
                y: "-20vh",
                opacity: 1,
                scale: 1.2,
                x: ["0%", `${Math.random() * 20 - 10}%`],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: heart.duration,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                left: `${heart.left}%`,
                fontSize: "30px",
                zIndex: 5,
                color: "#e11d48",
              }}
            >
              <BsBalloonHeart />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
