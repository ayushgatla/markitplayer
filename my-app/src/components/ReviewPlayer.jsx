import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import TimelineMarkers from './TimelineMarkers';
import CommentSidebar from './CommentSidebar';
import PlayerControls from './PlayerControls';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const ReviewPlayer = ({ videoUrl, roomId, isClient, guestName }) => {
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
  const [videoError, setVideoError] = useState(false);
  const wrapperRef = useRef(null);

  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 280) newWidth = 280;
      if (newWidth > 800) newWidth = 800;
      setSidebarWidth(newWidth);
    };
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
      }
    };
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleSidebarMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

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
        .order('created_at', { ascending: true });

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
          return [...current, payload.new].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `room_id=eq.${roomId}` }, (payload) => {
        setComments((current) => current.filter(c => c.id !== payload.old.id));
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
      const baseUrl = import.meta.env.PROD
        ? 'https://markitplayer-production.up.railway.app'
        : 'http://localhost:3001';
      processedUrl = `${baseUrl}/api/video/${match[1]}`;
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

    player.on('error', () => {
      console.error('VideoJS Player Error:', player.error());
      if (isDrive) {
        setVideoError(true);
      }
    });
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleAddComment = async (text, isChat = false) => {
    // Pause video automatically when adding a comment, unless it's a general chat
    if (playerRef.current && !isChat) {
      playerRef.current.pause();
    }

    let authorName = 'Anonymous';
    let userId = null;

    if (isClient) {
      authorName = guestName || 'Client';
      if (user?.id) {
        userId = user.id;
      } else {
        userId = localStorage.getItem('client_user_id');
        if (!userId) {
          userId = crypto.randomUUID();
          localStorage.setItem('client_user_id', userId);
        }
      }
    } else if (user) {
      authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
      userId = user.id;
    }

    const newComment = {
      room_id: roomId,
      user_id: userId,
      author_name: authorName,
      timestamp: isChat ? -1 : currentTime,
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

  const handleDeleteComment = async (commentId) => {
    // Optimistic delete
    const commentToDelete = comments.find(c => c.id === commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      // Restore on failure
      if (commentToDelete) {
        setComments(prev => [...prev, commentToDelete].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      }
      alert(`Failed to delete comment: ${error.message}`);
    }
  };

  const handleToggleResolve = async (commentId) => {
    const commentToUpdate = comments.find(c => c.id === commentId);
    if (!commentToUpdate) return;
    const newStatus = !commentToUpdate.resolved;

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: newStatus } : c));

    const { error } = await supabase
      .from('comments')
      .update({ resolved: newStatus })
      .eq('id', commentId);

    if (error) {
      console.warn("Could not save resolved state. Perhaps the column doesn't exist?", error);
    }
  };

  const handleUpdateLink = async () => {
    const newLink = window.prompt("Enter new Google Drive link for this version:");
    if (!newLink || !newLink.trim()) return;

    const { error } = await supabase
      .from('rooms')
      .update({ video_url: newLink.trim() })
      .eq('id', roomId);

    if (error) {
      alert("Error updating link: " + error.message);
    } else {
      window.location.reload();
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
          className={`relative shadow-2xl lg:overflow-hidden flex flex-col gap-6 lg:gap-0 ${isFullscreen
            ? 'w-screen h-screen bg-black z-50'
            : 'w-full max-w-5xl lg:aspect-video rounded-xl lg:border border-white/10'
            } ${!isControlsActive && isMouseInside && !(videoError && isDrive) ? 'cursor-none' : ''}`}
          onMouseEnter={() => setIsMouseInside(true)}
          onMouseLeave={() => setIsMouseInside(false)}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleToggleFullscreen}
        >
          <div className="w-full aspect-video relative flex-shrink-0 bg-black rounded-2xl lg:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.5)] lg:shadow-none overflow-hidden border border-white/10 lg:border-none pointer-events-auto">
            {videoError && isDrive ? (
              <iframe
                src={`https://drive.google.com/file/d/${videoUrl.match(/drive\.google\.com\/(?:file\/d\/|uc\?.*id=)([-\w]+)/)?.[1]}/preview`}
                className="w-full h-full absolute inset-0 border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Google Drive Video Fallback"
              />
            ) : (
              <VideoPlayer
                ref={playerRef}
                options={videoOptions}
                onReady={handlePlayerReady}
                onTimeUpdate={handleTimeUpdate}
              />
            )}
          </div>

          <div className={`w-full z-50 flex justify-center ${isFullscreen
            ? 'absolute bottom-6 left-0 right-0 px-4'
            : 'lg:absolute lg:bottom-6 left-0 right-0 px-2 lg:px-0 pb-6 lg:pb-0'
            }`}>
            {!(videoError && isDrive) && (
              <PlayerControls
                playerRef={playerRef}
                comments={comments}
                onMarkerClick={handleCommentClick}
                isMouseInside={isControlsActive}
                onToggleFullscreen={handleToggleFullscreen}
                isFullscreen={isFullscreen}
              />
            )}
          </div>

          {/* Quota Exceeded Notification Popup */}
          {videoError && isDrive && (
            <div className="absolute bottom-6 left-6 z-[100] max-w-xs bg-red-950/90 border border-red-500/30 backdrop-blur-xl rounded-2xl p-4 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500/20 p-2 rounded-full flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-100 font-medium text-sm">Quota Exceeded</h3>
                  <p className="text-red-200/70 text-xs mt-1 leading-relaxed">
                    Video link used too many times. Switching to iframe mode. Provide a fresh link to use all features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="sidebar-container w-full flex-shrink-0 lg:border-l border-white/10 bg-black/40 backdrop-blur-xl relative">
        <style>{`
          @media (min-width: 1024px) {
            .sidebar-container { width: ${sidebarWidth}px !important; }
          }
        `}</style>

        <div
          className="hidden lg:block absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/30 transition-colors z-[60] -ml-1"
          onMouseDown={handleSidebarMouseDown}
          title="Drag to resize"
        ></div>

        <CommentSidebar
          comments={comments}
          currentTime={currentTime}
          onAddComment={handleAddComment}
          onCommentClick={handleCommentClick}
          onDeleteComment={handleDeleteComment}
          onToggleResolve={handleToggleResolve}
          currentUserIdentity={isClient ? { name: guestName, isClient: true, id: user?.id } : { id: user?.id, name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous' }}
        />
      </div>
    </div>
  );
};

export default ReviewPlayer;
