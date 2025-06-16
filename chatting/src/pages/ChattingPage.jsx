import { useParams } from "react-router-dom";
import ChatRoom from "../components/ChatRoom";

function ChattingPage (){
    const {roomId} = useParams();
    return <ChatRoom roomId={roomId}/>;
}
export default ChattingPage;