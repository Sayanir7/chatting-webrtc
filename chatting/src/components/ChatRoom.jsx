import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import EmojiPicker from "emoji-picker-react";

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function ChatRoom({ roomId }) {
  const socket = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaDiv, showMediaDiv] = useState(false);
  const [media, setMedia] = useState(false);
  const messagesEndRef = useRef(null);
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
          socket.emit("ice-candidate", { candidate: e.candidate, room: roomId });
        }
      };

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { answer, room: roomId });
    });

    socket.on("answer", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
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

    dataChannel.current = peerConnection.current.createDataChannel("fileTransfer");
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
          const blob = new Blob(receivedChunks.current, { type: fileMeta.current.fileType });
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
        }
      } else {
        receivedChunks.current.push(event.data);
      }
    };

    channel.onclose = () => console.log("❌ File DataChannel closed");
  };

  const sendFile = (file) => {
    if (!dataChannel.current || dataChannel.current.readyState !== "open") {
      alert("DataChannel not open yet");
      return;
    }

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
        <div>
          {isImage && <img src={msg.file.url} alt="sent" style={{ maxWidth: "200px" }} />}
          {isVideo && (
            <video controls style={{ maxWidth: "200px" }}>
              <source src={msg.file.url} type={msg.file.type} />
            </video>
          )}
          <br />
          <a href={msg.file.url} download={msg.file.name}>
            ⬇️ Download {msg.file.name}
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>💬 Chat Room: {roomId}</h2>

      <div style={{ width: "100%", maxWidth: "500px", margin: "20px auto" }}>
        <div
          style={{
            height: "240px",
            overflowY: "auto",
            border: "1px solid #ccc",
            borderRadius: "10px",
            padding: "10px",
            background: "#f9f9f9",
          }}
        >
          {messages.map((msg, index) => (
            <p
              key={index}
              style={{
                textAlign: msg.sender === "me" ? "right" : "left",
                margin: "10px 0",
              }}
            >
              <span
                style={{
                  background: msg.sender === "me" ? "#dcf8c6" : "#fff",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  display: "inline-block",
                  color: "#333",
                }}
              >
                {renderMessageContent(msg)}
              </span>
            </p>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "10px",
            alignItems: "center",
          }}
        >
          <button onClick={() => setShowEmojiPicker((prev) => !prev)}>😊</button>
          <button onClick={sendMedia}>📎</button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button onClick={sendMessage} style={{ backgroundColor: "#4CAF50", color: "white" }}>
            Send
          </button>
        </div>

        {showEmojiPicker && (
          <div style={{ marginTop: "10px" }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {mediaDiv && (
          <div style={{ marginTop: "10px" }}>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size < 5 * 1024 * 1024) {
                  sendFile(file);
                } else {
                  alert("File too large (max 5MB)");
                }
              }}
            />
          </div>
        )}
      </div>

      <hr />
      <button
        onClick={() => navigate(`/video/${roomId}`)}
        style={{
          padding: "10px 20px",
          borderRadius: "6px",
          backgroundColor: "#2196F3",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        🎥 Start Video Call
      </button>
    </div>
  );
}

export default ChatRoom;
