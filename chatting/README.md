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
