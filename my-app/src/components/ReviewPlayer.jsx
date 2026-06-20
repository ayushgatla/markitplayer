import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import TimelineMarkers from './TimelineMarkers';
import CommentSidebar from './CommentSidebar';
import PlayerControls from './PlayerControls';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const ReviewPlayer = ({ videoUrl, roomId }) => {
  const playerRef = useRef(null);
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch comments from Supabase
  useEffect(() => {
    async function fetchComments() {
      if (!roomId) return;
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true });

      if (!error && data) {
        setComments(data);
      }
      setLoadingComments(false);
    }
    fetchComments();

    // Set up real-time subscription for comments
    const subscription = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `room_id=eq.${roomId}` }, (payload) => {
        setComments((current) => {
          // Check if we already have it to prevent duplicates from our own insert
          if (current.some(c => c.id === payload.new.id)) return current;
          return [...current, payload.new].sort((a, b) => a.timestamp - b.timestamp);
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

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
    controls: false,
    responsive: true,
    fill: true,
    techOrder: isYouTube ? ['youtube'] : ['html5'],
    sources: [{
      src: processedUrl,
      type: isYouTube ? 'video/youtube' : 'video/mp4'
    }],
    youtube: {
      ytControls: 0,
      modestbranding: 1,
      showinfo: 0,
      rel: 0,
      iv_load_policy: 3,
      disablekb: 1,
      fs: 0
    },
    userActions: {
      doubleClick: false
    }
  };

  const handlePlayerReady = (player) => {
    // Explicitly force volume to 100% and unmuted.
    // YouTube iframes often inherit the user's global YouTube volume/mute preferences,
    // which causes the video to silently start muted even if our UI thinks it's unmuted.
    player.volume(1);
    player.muted(false);

    if (player.duration()) {
      setDuration(player.duration());
    }
    
    player.on('loadedmetadata', () => {
      setDuration(player.duration());
    });

    player.on('durationchange', () => {
      setDuration(player.duration());
    });
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleAddComment = async (text) => {
    // Pause video automatically when adding a comment
    if (playerRef.current) {
      playerRef.current.pause();
    }
    
    const newComment = {
      room_id: roomId,
      user_id: user.id,
      author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous',
      timestamp: currentTime,
      comment_text: text
    };
    
    // Optimistic UI update
    const tempId = Math.random().toString();
    setComments(prev => [...prev, { ...newComment, id: tempId, created_at: new Date().toISOString() }]);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('comments')
      .insert([newComment])
      .select()
      .single();

    if (error) {
      console.error("Error saving comment:", error);
      // Revert optimistic update if error
      setComments(prev => prev.filter(c => c.id !== tempId));
      alert(`Failed to save comment: ${error.message}`);
    } else if (data) {
      // Replace optimistic comment with real one from DB
      setComments(prev => prev.map(c => c.id === tempId ? data : c));
    }
  };

  const handleCommentClick = (comment) => {
    if (playerRef.current) {
      playerRef.current.seekTo(comment.timestamp);
      playerRef.current.pause();
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch((e) => console.log('Orientation lock failed:', e));
        }
      }).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      }).catch(err => console.error(err));
    }
  };

  const handleMouseMove = () => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 2500);
  };
  const isControlsActive = isFullscreen ? !isIdle : (isMouseInside && !isIdle);

  return (
    <div 
      className="flex flex-col lg:flex-row w-full min-h-full lg:h-[calc(100vh-3.5rem)] sm:lg:h-[calc(100vh-4rem)] bg-zinc-950 lg:overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: 'url(/sky.jpg)' }}
    >
      <div className="w-full lg:flex-1 flex flex-col items-center justify-start lg:justify-center p-4 lg:p-6 relative min-h-[40vh] lg:min-h-0 gap-6 lg:gap-0">
        <div 
          ref={wrapperRef}
          className={`relative shadow-2xl lg:overflow-hidden flex flex-col gap-6 lg:gap-0 ${
            isFullscreen 
              ? 'w-screen h-screen bg-black z-50' 
              : 'w-full max-w-5xl lg:aspect-video rounded-xl lg:border border-white/10'
          } ${!isControlsActive && isMouseInside ? 'cursor-none' : ''}`}
          onMouseEnter={() => setIsMouseInside(true)}
          onMouseLeave={() => setIsMouseInside(false)}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleToggleFullscreen}
        >
          <div className="w-full aspect-video relative flex-shrink-0 bg-black rounded-2xl lg:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.5)] lg:shadow-none overflow-hidden border border-white/10 lg:border-none pointer-events-auto">
            <VideoPlayer 
              ref={playerRef}
              options={videoOptions} 
              onReady={handlePlayerReady}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
          
          <div className={`w-full z-50 flex justify-center ${
            isFullscreen 
              ? 'absolute bottom-6 left-0 right-0 px-4' 
              : 'lg:absolute lg:bottom-6 left-0 right-0 px-2 lg:px-0 pb-6 lg:pb-0'
          }`}>
            <PlayerControls 
              playerRef={playerRef} 
              comments={comments}
              onMarkerClick={handleCommentClick}
              isMouseInside={isControlsActive}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
            />
          </div>
        </div>
      </div>
      <div className="w-full lg:w-96 flex-shrink-0 lg:border-l border-white/10 bg-black/40 backdrop-blur-xl">
        <CommentSidebar 
          comments={comments} 
          currentTime={currentTime} 
          onAddComment={handleAddComment}
          onCommentClick={handleCommentClick}
        />
      </div>
    </div>
  );
};

export default ReviewPlayer;
