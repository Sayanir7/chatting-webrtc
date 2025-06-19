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
  const [fileProgress, setFileProgress] = useState(0);
  const [media, setMedia] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const receivedChunks = useRef([]);
  const fileMeta = useRef(null);

  // typing status
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { room: roomId });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop-typing", { room: roomId });
    }, 1000);
  };

  const [someoneTyping, setSomeoneTyping] = useState(false);
  useEffect(() => {
    socket.on("user-typing", () => setSomeoneTyping(true));
    socket.on("user-stop-typing", () => setSomeoneTyping(false));

    return () => {
      socket.off("user-typing");
      socket.off("user-stop-typing");
    };
  }, []);

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
      alert("Roommate didn't join or network error");
      showMediaDiv(false);
      return;
    }

    const file = media;
    if (!file) return;

    const chunkSize = 16 * 1024;
    let offset = 0;
    const reader = new FileReader();

    setFileProgress(0); // Reset progress

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

      // Update progress
      const progress = Math.min(100, Math.floor((offset / file.size) * 100));
      setFileProgress(progress);

      if (offset < file.size) {
        readSlice();
      } else {
        dataChannel.current.send(JSON.stringify({ type: "done" }));
        setTimeout(() => setFileProgress(0), 500); // Clear after sending
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
        <h2 className="text-lg flex items-center font-bold text-rose-800">
          💬 Room: <span className="italic">{roomId}</span>
          {someoneTyping && (
          <p className="text-sm text-rose-500 italic px-4 pb-1">
            typing...
          </p>
        )}
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
            className={`my-2 flex ${
              msg.sender === "me" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm sm:text-base shadow-md ${
                msg.sender === "me"
                  ? "bg-rose-200 text-rose-900"
                  : "bg-white border border-rose-100 text-rose-800"
              }`}
            >
              {renderMessageContent(msg)}
            </div>
          </motion.div>
        ))}
        {someoneTyping && (
          <div className="flex items-center mt-2 text-red-700">
            <div className="flex items-center space-x-1 text-4xl font-bold">
              <span className="animate-dot-pulse-1">.</span>
              <span className="animate-dot-pulse-2">.</span>
              <span className="animate-dot-pulse-3">.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {mediaDiv && (
        <div className="flex flex-col gap-2 p-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              className="text-sm text-rose-700 border border-rose-300 rounded-md p-1"
              onChange={(e) => setMedia(e.target.files[0])}
            />
            <button
              onClick={sendFile}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-1 rounded"
            >
              🚀
            </button>
          </div>

          {/* Progress bar */}
          {fileProgress > 0 && (
            <div className="w-full bg-rose-100 rounded-full h-2.5 mt-1">
              <div
                className="bg-rose-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${fileProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      <div className="p-2 bg-white/80 backdrop-blur-md border-t border-rose-300 flex items-center gap-2">
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="text-2xl text-rose-500"
        >
          <FaSmile />
        </button>

        <button onClick={sendMedia} className="text-2xl text-rose-500">
          <FaPaperclip />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleTyping}
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
          <div className="absolute bottom-14 left-1 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;
