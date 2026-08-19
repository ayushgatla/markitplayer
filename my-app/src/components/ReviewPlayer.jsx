import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import TimelineMarkers from './TimelineMarkers';
import CommentSidebar from './CommentSidebar';
import PlayerControls from './PlayerControls';
import AnnotationCanvas from './AnnotationCanvas';
import DrawingToolbar from './DrawingToolbar';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { extractDrawingFromText } from '../utils/drawingHelper';
import { Pencil, Eye, X } from 'lucide-react';

export const ReviewPlayer = ({ videoUrl, rawVideoUrl, roomId, isClient, guestName, currentVersionNum = 1 }) => {
  const playerRef = useRef(null);
  const canvasRef = useRef(null);
  const { user } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const wrapperRef = useRef(null);

  // Drawing & Annotation States
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#FACC15');
  const [currentWidth, setCurrentWidth] = useState(4);
  const [attachedDrawingStrokes, setAttachedDrawingStrokes] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [activeCommentDrawing, setActiveCommentDrawing] = useState(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [strokeHistoryState, setStrokeHistoryState] = useState({ canUndo: false, canRedo: false, count: 0 });

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
  const isInstagram = videoUrl.includes('instagram.com');

  const baseUrl = import.meta.env.PROD
    ? 'https://markitplayer-production.up.railway.app'
    : 'http://localhost:3001';

  let processedUrl = videoUrl;
  if (isDrive) {
    const match = videoUrl.match(/drive\.google\.com\/(?:file\/d\/|uc\?.*id=)([-\w]+)/);
    if (match && match[1]) {
      processedUrl = `${baseUrl}/api/video/${match[1]}`;
    }
  } else if (isInstagram) {
    processedUrl = `${baseUrl}/api/instagram?url=${encodeURIComponent(videoUrl)}`;
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

    player.on('play', () => {
      setIsPlaying(true);
      // Auto-exit drawing mode when playing
      setIsDrawingMode(false);
      setActiveCommentDrawing(null);
      setActiveCommentId(null);
    });

    player.on('pause', () => {
      setIsPlaying(false);
    });
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);

    // If paused and not drawing, check if there's a comment with drawings at this timestamp
    if (!isDrawingMode && showAnnotations) {
      const matchingComment = comments.find(c => 
        c.timestamp !== -1 && 
        Math.abs(c.timestamp - time) <= 0.3 && 
        c.comment_text?.includes('___DRAW:')
      );

      if (matchingComment) {
        const { drawingData } = extractDrawingFromText(matchingComment.comment_text);
        if (drawingData?.strokes?.length > 0) {
          setActiveCommentDrawing(drawingData.strokes);
          setActiveCommentId(matchingComment.id);
          return;
        }
      }

      // If we seek away from the active comment's timestamp, clear drawing view
      if (activeCommentDrawing && activeCommentId) {
        const activeC = comments.find(c => c.id === activeCommentId);
        if (activeC && Math.abs(activeC.timestamp - time) > 0.3) {
          setActiveCommentDrawing(null);
          setActiveCommentId(null);
        }
      }
    }
  };

  // Drawing Mode Controls
  const handleToggleDraw = useCallback(() => {
    if (isDrawingMode) {
      setIsDrawingMode(false);
    } else {
      if (playerRef.current) {
        playerRef.current.pause();
      }
      setIsDrawingMode(true);
      setActiveCommentDrawing(null);
      setActiveCommentId(null);
    }
  }, [isDrawingMode]);

  const handleOpenDrawing = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsDrawingMode(true);
    setActiveCommentDrawing(null);
    setActiveCommentId(null);
  }, []);

  const handleDoneDrawing = useCallback(() => {
    const currentStrokes = canvasRef.current?.getStrokes() || [];
    setAttachedDrawingStrokes(currentStrokes);
    setIsDrawingMode(false);
  }, []);

  const handleCloseDrawing = useCallback(() => {
    setIsDrawingMode(false);
  }, []);

  const handleClearDrawing = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    setAttachedDrawingStrokes([]);
    setStrokeHistoryState({ canUndo: false, canRedo: false, count: 0 });
  }, []);

  const handleStrokesChange = useCallback((newStrokes) => {
    setAttachedDrawingStrokes(newStrokes);
    if (canvasRef.current) {
      setStrokeHistoryState({
        canUndo: canvasRef.current.canUndo,
        canRedo: canvasRef.current.canRedo,
        count: newStrokes.length
      });
    }
  }, []);

  // Keyboard shortcuts for drawing
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleToggleDraw();
      } else if (isDrawingMode) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setActiveTool('arrow');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setActiveTool('rect');
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          setActiveTool('circle');
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          setActiveTool('line');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseDrawing();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          canvasRef.current?.undo();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z' || e.key === 'z'))) {
          e.preventDefault();
          canvasRef.current?.redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingMode, handleToggleDraw, handleCloseDrawing]);

  const handleAddComment = async (text, isChat = false, parentId = null) => {
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

    let finalTimestamp = isChat ? -1 : currentTime;
    let finalCommentText = text;

    if (parentId) {
      const parent = comments.find(c => c.id === parentId);
      if (parent) {
        finalTimestamp = parent.timestamp;
      }
      finalCommentText = `___REPLY:${parentId}___${text}`;
    } else if (!isChat && currentVersionNum) {
      finalCommentText = `___VER:${currentVersionNum}___${text}`;
    }

    const newComment = {
      room_id: roomId,
      user_id: userId,
      author_name: authorName,
      timestamp: finalTimestamp,
      comment_text: finalCommentText
    };

    // Optimistic UI update
    const tempId = Math.random().toString();
    setComments(prev => [...prev, { ...newComment, id: tempId, created_at: new Date().toISOString() }]);

    // Clear attached drawing from local composer state
    setAttachedDrawingStrokes([]);
    if (canvasRef.current) {
      canvasRef.current.clear();
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('comments')
      .insert([newComment])
      .select()
      .single();

    if (error) {
      console.error("Error saving comment:", error);
      setComments(prev => prev.filter(c => c.id !== tempId));
      alert(`Failed to save comment: ${error.message}`);
    } else if (data) {
      setComments(prev => prev.map(c => c.id === tempId ? data : c));
    }
  };

  const handleDeleteComment = async (commentId) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));

    if (activeCommentId === commentId) {
      setActiveCommentDrawing(null);
      setActiveCommentId(null);
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error("Error deleting comment:", error);
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
      console.warn("Could not save resolved state:", error);
    }
  };

  const handleCommentClick = (comment) => {
    if (playerRef.current) {
      playerRef.current.seekTo(comment.timestamp);
      playerRef.current.pause();
    }

    // Check if clicked comment has drawing annotations
    const { drawingData } = extractDrawingFromText(comment.comment_text);
    if (drawingData?.strokes?.length > 0) {
      setActiveCommentDrawing(drawingData.strokes);
      setActiveCommentId(comment.id);
      setIsDrawingMode(false);
    } else {
      setActiveCommentDrawing(null);
      setActiveCommentId(comment.id);
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
  const activeCommentObj = comments.find(c => c.id === activeCommentId);

  return (
    <div
      className="flex flex-col lg:flex-row w-full min-h-full lg:h-[calc(100vh-3.5rem)] sm:lg:h-[calc(100vh-4rem)] bg-[#0f0e17] lg:overflow-hidden relative"
    >
      {/* Dashboard Matching Background Image & Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0 opacity-40"
        style={{ backgroundImage: 'url(/dashboard.jpg)' }}
      ></div>
      <div className="absolute inset-0 bg-[#0f0e17]/80 backdrop-blur-[2px] z-0 pointer-events-none"></div>

      <div className={`w-full lg:flex-1 flex flex-col items-center justify-start lg:justify-center relative z-10 min-h-[40vh] lg:min-h-0 gap-6 lg:gap-0 ${isExpanded ? 'p-4 lg:p-0' : 'p-4 lg:p-6'}`}>
        <div
          ref={wrapperRef}
          className={`relative shadow-2xl lg:overflow-hidden flex flex-col gap-6 lg:gap-0 ${isFullscreen
            ? 'w-screen h-screen bg-black z-50'
            : isExpanded
              ? 'w-full lg:h-full bg-black'
              : 'w-full max-w-5xl lg:aspect-video rounded-xl lg:border border-white/10'
            } ${!isControlsActive && isMouseInside && !isDrawingMode ? 'cursor-none' : ''}`}
          onMouseEnter={() => setIsMouseInside(true)}
          onMouseLeave={() => setIsMouseInside(false)}
          onMouseMove={handleMouseMove}
          onDoubleClick={isDrawingMode ? undefined : handleToggleFullscreen}
        >
          {/* Video Container + Drawing Canvas Overlay */}
          <div className={`w-full relative flex-shrink-0 bg-black rounded-2xl lg:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.5)] lg:shadow-none overflow-hidden border border-white/10 lg:border-none pointer-events-auto ${isExpanded ? 'aspect-video lg:h-full lg:aspect-auto' : 'aspect-video'}`}>
            <VideoPlayer
              key={processedUrl}
              ref={playerRef}
              options={videoOptions}
              onReady={handlePlayerReady}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Interactive Drawing Canvas Layer */}
            <AnnotationCanvas
              ref={canvasRef}
              isDrawingMode={isDrawingMode}
              activeTool={activeTool}
              currentColor={currentColor}
              currentWidth={currentWidth}
              onStrokesChange={handleStrokesChange}
              initialStrokes={attachedDrawingStrokes}
              readOnlyStrokes={activeCommentDrawing}
              showAnnotations={showAnnotations && !isPlaying}
            />

            {/* Floating Glassmorphic Drawing Toolbar */}
            {isDrawingMode && (
              <DrawingToolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                currentColor={currentColor}
                setCurrentColor={setCurrentColor}
                currentWidth={currentWidth}
                setCurrentWidth={setCurrentWidth}
                canUndo={strokeHistoryState.canUndo}
                canRedo={strokeHistoryState.canRedo}
                onUndo={() => canvasRef.current?.undo()}
                onRedo={() => canvasRef.current?.redo()}
                onClear={handleClearDrawing}
                onDone={handleDoneDrawing}
                onClose={handleCloseDrawing}
                strokeCount={strokeHistoryState.count}
              />
            )}

            {/* Read-Only Annotation Indicator Pill */}
            {!isDrawingMode && activeCommentDrawing && showAnnotations && !isPlaying && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/75 backdrop-blur-xl border border-amber-500/40 rounded-full shadow-2xl animate-in fade-in duration-200">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-amber-200 flex items-center gap-1">
                  <Pencil className="w-3 h-3 text-amber-400" />
                  Annotation by {activeCommentObj?.author_name || activeCommentObj?.author || 'User'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCommentDrawing(null);
                    setActiveCommentId(null);
                  }}
                  className="text-zinc-400 hover:text-white ml-1 p-0.5 rounded-full hover:bg-white/10"
                  title="Dismiss annotation overlay"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div className={`w-full z-50 flex justify-center ${isFullscreen
            ? 'absolute bottom-6 left-0 right-0 px-4'
            : isExpanded
              ? 'lg:absolute lg:bottom-6 left-0 right-0 px-2 lg:px-4 pb-6 lg:pb-0'
              : 'lg:absolute lg:bottom-6 left-0 right-0 px-2 lg:px-0 pb-6 lg:pb-0'
            }`}>
            <PlayerControls
              playerRef={playerRef}
              comments={comments}
              onMarkerClick={handleCommentClick}
              isMouseInside={isControlsActive}
              onToggleFullscreen={handleToggleFullscreen}
              isFullscreen={isFullscreen}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
              onToggleDraw={handleToggleDraw}
              isDrawingMode={isDrawingMode}
              showAnnotations={showAnnotations}
              onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
            />
          </div>
        </div>
      </div>

      {/* Comment & Chat Sidebar */}
      <div className="sidebar-container w-full flex-shrink-0 lg:border-l border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
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
          currentVersionNum={currentVersionNum}
          rawVideoUrl={rawVideoUrl}
          attachedDrawing={attachedDrawingStrokes}
          onOpenDrawing={handleOpenDrawing}
          onClearAttachedDrawing={handleClearDrawing}
          activeCommentId={activeCommentId}
        />
      </div>
    </div>
  );
};

export default ReviewPlayer;
