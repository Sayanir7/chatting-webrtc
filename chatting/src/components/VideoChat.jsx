import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { FaPhoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function VideoChat({ roomId }) {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [mediaStarted, setMediaStarted] = useState(false);
  const [remoteDescSet, setRemoteDescSet] = useState(false);
  const [bothReady, setBothReady] = useState(false);
  const [pendingCandidates, setPendingCandidates] = useState([]);
  const [isLocalMain, setIsLocalMain] = useState(false);

  // ✅ Called when user clicks Start Video
  const handleStartVideo = async () => {
    if (mediaStarted) return;

    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = localStream.current;

      peerConnection.current = new RTCPeerConnection(config);
      console.log("🎦 PeerConnection created");

      // Add tracks
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      // Remote track handler
      peerConnection.current.ontrack = (event) => {
        console.log("📥 Receiving remote stream");
        remoteVideoRef.current.srcObject = event.streams[0];
        // console.log("🎥 Local stream tracks:", localStream.current.getTracks());
      };

      // ICE candidate handler
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            room: roomId,
          });
        }
      };

      // ✅ Signal readiness to start P2P connection
      socket.emit("ready", roomId);
      setMediaStarted(true);
    } catch (err) {
      console.error("🚨 Error accessing media devices:", err);
    }
  };

  // ✅ Signaling setup
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on("ready", async () => {
      console.log("✅ Both users clicked Start Video!");
      setBothReady(true);
    });

    socket.on("start-call", async () => {
      if (!peerConnection.current) return;
      console.log("🧑‍💻 Creating and sending offer...");
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", { offer, room: roomId });
    });

    socket.on("offer", async ({ offer }) => {
      if (!peerConnection.current) {
        console.warn(
          "⚠️ Offer received before peerConnection initialized. Skipping."
        );
        return;
      }
      console.log("📥 Received offer");
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      setRemoteDescSet(true);
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { answer, room: roomId });
    });

    socket.on("answer", async ({ answer }) => {
      console.log("📥 Received answer");
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      setRemoteDescSet(true);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (!peerConnection.current) return;

      if (!remoteDescSet) {
        console.log("⏳ ICE queued: remote description not set yet.");
        setPendingCandidates((prev) => [...prev, candidate]);
        return;
      }

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("✅ Added ICE candidate");
      } catch (err) {
        console.error("❌ Error adding ICE candidate", err);
      }
    });

    return () => {
      socket.off("ready");
      socket.off("start-call");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket, roomId, remoteDescSet]);

  useEffect(() => {
    if (remoteDescSet && pendingCandidates.length > 0) {
      pendingCandidates.forEach(async (candidate) => {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("✅ Flushed ICE candidate");
        } catch (err) {
          console.error("❌ Error flushing ICE candidate", err);
        }
      });
      setPendingCandidates([]); // Clear after applying
    }
  }, [remoteDescSet, pendingCandidates]);

  // ✅ Once both users are ready, initiate call from one user only
  useEffect(() => {
    if (bothReady) {
      // Only one of them should create the offer to avoid race conditions
      socket.emit("start-call", roomId);
    }
  }, [bothReady, socket, roomId]);

  // ✅ Cleanup
  useEffect(() => {
    return () => {
      // 🔌 Close PeerConnection
      socket.emit("manual-disconnect", roomId);
      if (peerConnection.current) {
        peerConnection.current.ontrack = null;
        peerConnection.current.onicecandidate = null;
        peerConnection.current.close();
        peerConnection.current = null;
      }

      // 🎤 Stop local media
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }

      // 🎥 Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      // 🧹 Reset all states
      setMediaStarted(false);
      setRemoteDescSet(false);
      setBothReady(false);
      setPendingCandidates([]);

      // 📴 Remove socket listeners
      socket.off("ready");
      socket.off("start-call");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");

      console.log("🧹 Cleanup completed");
    };
  }, []);

  const handleLeaveCall = () => {
    // Trigger React's unmount cleanup
    // 🔌 Close PeerConnection
    socket.emit("manual-disconnect", roomId);
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // 🎤 Stop local media
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    // 🎥 Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // 🧹 Reset all states
    setMediaStarted(false);
    setRemoteDescSet(false);
    setBothReady(false);
    setPendingCandidates([]);

    // 📴 Remove socket listeners
    socket.off("ready");
    socket.off("start-call");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");

    console.log("🧹 Cleanup completed");

    navigate(`/chat/${roomId}`);
  };

  const swapVideos = () => setIsLocalMain((prev) => !prev);

  return (
    <div className="relative w-full h-screen bg-black">
      <AnimatePresence>
        <motion.video
          key={isLocalMain ? "local" : "remote"}
          ref={isLocalMain ? localVideoRef : remoteVideoRef}
          autoPlay
          muted={isLocalMain}
          playsInline
          className="absolute w-full h-full object-cover z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // onClick={swapVideos}
        />
        <motion.video
          key={isLocalMain ? "remote" : "local"}
          ref={isLocalMain ? remoteVideoRef : localVideoRef}
          autoPlay
          muted={!isLocalMain}
          playsInline
          className="absolute w-32 h-48 sm:w-40 sm:h-60 bottom-4 right-4 z-20 rounded-xl border-2 border-white cursor-pointer object-cover shadow-md"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={swapVideos}
        />
      </AnimatePresence>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-lg z-30">
        Room: {roomId}
      </div>

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-6 z-30">
        {!mediaStarted ? (
          <button
            onClick={handleStartVideo}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-xl"
          >
            <FaVideo />
          </button>
        ) : (
          <button
            onClick={handleLeaveCall}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-xl"
          >
            <FaPhoneSlash />
          </button>
        )}
      </div>
    </div>
  );
}

export default VideoChat;
