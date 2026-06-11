import React, { useState, useRef } from 'react';
import VideoPlayer from './VideoPlayer';
import TimelineMarkers from './TimelineMarkers';
import CommentSidebar from './CommentSidebar';

// Simple mock data for now
const MOCK_COMMENTS = [
  { id: '1', timestamp: 12.5, comment_text: 'The color grading looks a bit cool here, can we warm it up?', author: 'Client A', created_at: new Date(Date.now() - 10000).toISOString() },
  { id: '2', timestamp: 45.0, comment_text: 'Great transition!', author: 'Editor B', created_at: new Date(Date.now() - 5000).toISOString() }
];

export const ReviewPlayer = ({ videoUrl }) => {
  const playerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [currentUser] = useState('Client A'); // Mock user

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isDrive = videoUrl.includes('drive.google.com');

  let processedUrl = videoUrl;
  if (isDrive) {
    const match = videoUrl.match(/drive\.google\.com\/(?:file\/d\/|uc\?.*id=)([-\w]+)/);
    if (match && match[1]) {
      processedUrl = `http://localhost:3001/api/video/${match[1]}`;
    }
  }

  const videoOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    techOrder: isYouTube ? ['youtube'] : ['html5'],
    sources: [{
      src: processedUrl,
      type: isYouTube ? 'video/youtube' : 'video/mp4'
    }]
  };

  const handlePlayerReady = (player) => {
    player.on('loadedmetadata', () => {
      setDuration(player.duration());
    });
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleAddComment = (text) => {
    // Pause video automatically when adding a comment
    if (playerRef.current) {
      playerRef.current.pause();
    }
    
    const newComment = {
      id: Math.random().toString(36).substring(7),
      timestamp: currentTime,
      comment_text: text,
      author: currentUser,
      created_at: new Date().toISOString()
    };
    
    setComments([...comments, newComment]);
  };

  const handleCommentClick = (comment) => {
    if (playerRef.current) {
      playerRef.current.seekTo(comment.timestamp);
      playerRef.current.pause();
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] bg-zinc-950">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-zinc-800 bg-black relative">
          <VideoPlayer 
            ref={playerRef}
            options={videoOptions} 
            onReady={handlePlayerReady}
            onTimeUpdate={handleTimeUpdate}
          />
          <TimelineMarkers 
            duration={duration} 
            comments={comments} 
            onMarkerClick={handleCommentClick} 
          />
        </div>
      </div>
      <CommentSidebar 
        comments={comments} 
        currentTime={currentTime} 
        onAddComment={handleAddComment}
        onCommentClick={handleCommentClick}
      />
    </div>
  );
};

export default ReviewPlayer;
