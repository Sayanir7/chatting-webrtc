import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://chatting-server-zxbx.onrender.com');
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function App() {
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream = useRef(null);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  const handleJoin = async () => {
    if (!roomId || roomFull) return;

    // Get user media
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = localStream.current;

      // Create peer connection
      peerConnection.current = new RTCPeerConnection(config);
      console.log('🔧 PeerConnection created');

      // Add tracks
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        console.log('📥 Receiving remote stream');
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { candidate: event.candidate, room: roomId });
        }
      };

      // Join room
      socket.emit('join', roomId);
      setJoined(true);
    } catch (err) {
      console.error('🚨 Error accessing media devices:', err);
    }
  };

  // Handle room full + offer creation 
  useEffect(() => {

    if (!joined) {
      socket.on('room-full', () => {
        setRoomFull(true);
        alert('🚫 Room is full! Try different room..');
      });
      return () => {
        socket.off('room-full');
        socket.off('user-joined');
      };
    }
  }, [joined, roomId]);

  // Signaling logic
  useEffect(() => {
    if (!joined || roomFull) return;

    socket.on('user-joined', async () => {
      console.log('🧑‍🤝‍🧑 Creating offer...');
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('offer', { offer, room: roomId });
    });
    socket.on('offer', async (offer) => {
      console.log('📥 Received offer');
      await peerConnection.current.setRemoteDescription(offer);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('answer', { answer, room: roomId });
    });

    socket.on('answer', async (answer) => {
      console.log('📥 Received answer');
      await peerConnection.current.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (candidate && peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(candidate);
          console.log('✅ Added ICE candidate');
        } catch (err) {
          console.error('❌ Error adding ICE candidate', err);
        }
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [joined, roomId, roomFull]);

  const styles = {
    container: {
      textAlign: 'center',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    },
    title: {
      fontSize: '28px',
      marginBottom: '20px',
    },
    formContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
    },
    input: {
      padding: '10px',
      fontSize: '16px',
      width: '250px',
      maxWidth: '90%',
      borderRadius: '6px',
      border: '1px solid #ccc',
    },
    button: {
      padding: '10px 20px',
      fontSize: '16px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    joinedText: {
      fontSize: '18px',
      marginBottom: '20px',
    },
    videoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '30px',
    },
    videoBlock: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    },
    video: {
      width: '90%',
      maxWidth: '400px',
      borderRadius: '12px',
      border: '2px solid #ddd',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
  };


  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎥 Video Chat</h2>

      {!joined || roomFull ? (
        <div style={styles.formContainer}>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleJoin} style={styles.button}>
            Join Room
          </button>
        </div>
      ) : (
        <p style={styles.joinedText}>
          🟢 Joined Room: <b>{roomId}</b>
        </p>
      )}

      
    </div>

  );
}

export default App;






import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import EmojiPicker from "emoji-picker-react";
import { FaPaperPlane, FaPaperclip, FaSmile, FaVideo } from "react-icons/fa";
import { motion } from "framer-motion";

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function ChatRoom({ roomId }) {
  const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaDiv, showMediaDiv] = useState(false);
  const [media, setMedia] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const receivedChunks = useRef([]);
  const fileMeta = useRef(null);

  useEffect(() => {
    socket.on("chat-message", ({ message, sender }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    socket.on("offer", async ({ offer }) => {
      peerConnection.current = new RTCPeerConnection(config);

      peerConnection.current.ondatachannel = (event) => {
        if (event.channel.label === "fileTransfer") {
          dataChannel.current = event.channel;
          setupDataChannelEvents(dataChannel.current);
        }
      };

      peerConnection.current.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            candidate: e.candidate,
            room: roomId,
          });
        }
      };

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { answer, room: roomId });
    });

    socket.on("answer", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("ice-candidate", ({ candidate }) => {
      if (candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("chat-message");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit("chat-message", { room: roomId, message: input });
      setMessages((prev) => [...prev, { sender: "me", message: input }]);
      setInput("");
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const sendMedia = async () => {
    showMediaDiv(true);
    peerConnection.current = new RTCPeerConnection(config);

    dataChannel.current =
      peerConnection.current.createDataChannel("fileTransfer");
    setupDataChannelEvents(dataChannel.current);

    peerConnection.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { candidate: e.candidate, room: roomId });
      }
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("offer", { offer, room: roomId });
  };

  const setupDataChannelEvents = (channel) => {
    channel.onopen = () => console.log("📡 File DataChannel open");

    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "meta") {
          fileMeta.current = msg;
          receivedChunks.current = [];
        } else if (msg.type === "done") {
          const blob = new Blob(receivedChunks.current, {
            type: fileMeta.current.fileType,
          });
          const url = URL.createObjectURL(blob);

          // Auto-preview
          const filePreview = {
            sender: "them",
            file: {
              name: fileMeta.current.name,
              type: fileMeta.current.fileType,
              url,
            },
          };

          setMessages((prev) => [...prev, filePreview]);
          cleanupConnection();
        }
      } else {
        receivedChunks.current.push(event.data);
      }
    };

    channel.onclose = () => {
      showMediaDiv(false);
      console.log("❌ File DataChannel closed");
    };
  };

  const sendFile = () => {
    if (!dataChannel.current || dataChannel.current.readyState !== "open") {
      alert("DataChannel not open yet");
      return;
    }
    const file = media;
    if (!file) return;

    const chunkSize = 16 * 1024;
    let offset = 0;
    const reader = new FileReader();

    dataChannel.current.send(
      JSON.stringify({
        type: "meta",
        name: file.name,
        size: file.size,
        fileType: file.type,
      })
    );

    // Preview on sender's side
    const localUrl = URL.createObjectURL(file);
    setMessages((prev) => [
      ...prev,
      {
        sender: "me",
        file: {
          name: file.name,
          type: file.type,
          url: localUrl,
        },
      },
    ]);

    const readSlice = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = () => {
      dataChannel.current.send(reader.result);
      offset += chunkSize;
      if (offset < file.size) {
        readSlice();
      } else {
        dataChannel.current.send(JSON.stringify({ type: "done" }));
      }
    };

    readSlice();
  };

  const renderMessageContent = (msg) => {
    if (msg.message) {
      return <span>{msg.message}</span>;
    }

    if (msg.file) {
      const isImage = msg.file.type.startsWith("image");
      const isVideo = msg.file.type.startsWith("video");
      return (
        <div style={{ display: "flex", alignItems: "center" }}>
          {msg.sender === "me" && (
            <a href={msg.file.url} download={msg.file.name}>
              ⬇️
            </a>
          )}
          {isImage && (
            <img src={msg.file.url} alt="sent" style={{ maxWidth: "200px" }} />
          )}
          {isVideo && (
            <video controls style={{ maxWidth: "200px" }}>
              <source src={msg.file.url} type={msg.file.type} />
            </video>
          )}
          <br />
          {msg.sender !== "me" && (
            <a href={msg.file.url} download={msg.file.name}>
              ⬇️
            </a>
          )}
        </div>
      );
    }

    return null;
  };
    const cleanupConnection = () => {
    try {
      showMediaDiv(false);
      if (dataChannel.current) {
        dataChannel.current.close();
        dataChannel.current = null;
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      receivedChunks.current = [];
      fileMeta.current = null;
      console.log("🧹 WebRTC connection cleaned up");
    } catch (err) {
      console.error("❌ Error during cleanup:", err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200">
      <div className="flex justify-between items-center px-4 py-2 bg-rose-300 shadow-md">
        <h2 className="text-lg font-bold text-rose-800">
          💬 Room: <span className="italic">{roomId}</span>
        </h2>
        <button
          onClick={() => navigate(`/video/${roomId}`)}
          className="text-white bg-indigo-500 hover:bg-indigo-600 p-2 rounded-full"
        >
          <FaVideo />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`my-2 flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm sm:text-base shadow-md ${msg.sender === "me" ? "bg-rose-200 text-rose-900" : "bg-white border border-rose-100 text-rose-800"}`}>
              {renderMessageContent(msg)}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {mediaDiv && (
        <div className="flex items-center gap-2 p-2">
          <input
            type="file"
            className="text-sm text-rose-700 border border-rose-300 rounded-md p-1"
            onChange={(e) => setMedia(e.target.files[0])}
          />
          <button onClick={sendFile} className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-1 rounded">
            🚀 Send
          </button>
        </div>
      )}

      <div className="p-2 bg-white/80 backdrop-blur-md border-t border-rose-300 flex items-center gap-2">
        <button onClick={() => setShowEmojiPicker((prev) => !prev)} className="text-2xl text-rose-500">
          <FaSmile />
        </button>

        <button onClick={sendMedia} className="text-2xl text-rose-500">
          <FaPaperclip />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 rounded-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder-rose-400 text-rose-800 bg-white"
        />

        <button
          onClick={sendMessage}
          className="bg-rose-400 hover:bg-rose-500 text-white font-semibold p-2 rounded-full"
        >
          <FaPaperPlane />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-16 left-2 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;

