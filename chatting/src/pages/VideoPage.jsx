import React from 'react';
import { useParams } from 'react-router-dom';
import VideoChat from '../components/VideoChat';

function VideoPage() {
  const { roomId } = useParams();
  return <VideoChat roomId={roomId} />;
}

export default VideoPage;