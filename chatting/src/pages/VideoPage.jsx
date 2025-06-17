// import React from 'react';
// import { useParams } from 'react-router-dom';
// import VideoChat from '../components/VideoChat';

// function VideoPage() {
//   const { roomId } = useParams();
//   return <VideoChat roomId={roomId} />;
// }

// export default VideoPage;

import { useNavigate, useParams } from "react-router-dom";
import VideoChat from '../components/VideoChat';
import { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/SocketContext";

function VideoPage() {
  const { roomId } = useParams();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [content, showContent] = useState(false);
  useEffect(() => {
    socket.emit("check-room", roomId);

    socket.once("room-status", ({ full, dne }) => {
        if (handledRef.current) return; // ✅ Prevent duplicate execution
      handledRef.current = true;
      if (dne) {
        alert("Room does not exists for you, please join first!!");
        navigate("/");
      } 
      else{
        showContent(true);
      }
    });
  }, []);
{ content && ( <div></div>)}
  return (
    <div>
        {content && (
            <VideoChat roomId={roomId} />
        )}
    </div>
  );
}
export default VideoPage;
