import { useNavigate, useParams } from "react-router-dom";
import ChatRoom from "../components/ChatRoom";
import { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/SocketContext";

function ChattingPage() {
  const { roomId } = useParams();
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [content, showContent] = useState(false);
  useEffect(() => {
    socket.emit("check-room", roomId);

    socket.once("room-status", ({ full, dne, joinable, joined }) => {
        if (handledRef.current) return; // ✅ Prevent duplicate execution
      handledRef.current = true;
      if (dne) {
    alert("Room does not exist.");
    navigate("/");
  } else if (full) {
    alert("Room is full.");
    navigate("/");
  } else if (joined === false) {
    // You can now emit a 'join' event here
    socket.emit("join", roomId);
    showContent(true);
  } else if (joinable) {
    showContent(true);
  }
    });
  }, []);
{ content && ( <div></div>)}
  return (
    <div>
        {content && (
            <ChatRoom roomId={roomId} />
        )}
    </div>
  );
}
export default ChattingPage;
