import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPlayer from './VideoPlayer';
import TimelineMarkers from './TimelineMarkers';
import CommentSidebar from './CommentSidebar';
import PlayerControls from './PlayerControls';
import AnnotationCanvas from './AnnotationCanvas';
import DrawingToolbar from './DrawingToolbar';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { extractDrawingFromText, extractRangeFromText } from '../utils/drawingHelper';
import { Pencil, Eye, X, AlertTriangle, ExternalLink, RefreshCw, Play } from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds || seconds === -1 || isNaN(seconds)) return '00:00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const frames = Math.floor((seconds % 1) * 30).toString().padStart(2, '0');
  return `${h}:${m}:${s}:${frames}`;
};

// Module-level cache to remember files where direct Google Drive streaming failed in the current session
// (e.g., files requiring virus scan confirmation or hitting quotas), avoiding redundant failed attempts
const failedDirectFileIds = new Set();

export const ReviewPlayer = ({
  videoUrl,
  rawVideoUrl,
  roomId,
  isClient,
  guestName,
  currentVersionNum = 1,
  onSwitchVersion,
  onOpenAddVersion,
  onDeleteVersion
}) => {
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
  const [activeRangePreview, setActiveRangePreview] = useState(null);
  const [strokeHistoryState, setStrokeHistoryState] = useState({ canUndo: false, canRedo: false, count: 0 });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('review_player_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 260 && parsed <= 800) return parsed;
      }
    } catch {}
    return 384;
  });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('review_player_sidebar_width', sidebarWidth);
    } catch {}
  }, [sidebarWidth]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const minW = 260;
      const maxW = Math.min(800, window.innerWidth - 300);
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < minW) newWidth = minW;
      if (newWidth > maxW) newWidth = maxW;
      setSidebarWidth(newWidth);
    };
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleSidebarMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
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

  const baseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD
    ? 'https://cool-violet-8f68.ayushgatla.workers.dev'
    : 'http://localhost:3001');

  let initialUrl = videoUrl;
  let fallbackProxyUrl = null;
  let driveFileId = null;

  if (isDrive) {
    const match = videoUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([-\w]+)/);
    if (match && match[1]) {
      driveFileId = match[1];
      // Stream via Cloudflare Worker Edge Proxy (Global Anycast Edge Cache + $0 Egress)
      initialUrl = `${baseUrl}/api/video/${driveFileId}`;
      fallbackProxyUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=t`;
    }
  } else if (isInstagram) {
    initialUrl = `${baseUrl}/api/instagram?url=${encodeURIComponent(videoUrl)}`;
  }

  const [hasFallenBack, setHasFallenBack] = useState(false);
  const [streamError, setStreamError] = useState(null);

  const fallbackProxyUrlRef = useRef(fallbackProxyUrl);
  fallbackProxyUrlRef.current = fallbackProxyUrl;

  const driveFileIdRef = useRef(driveFileId);
  driveFileIdRef.current = driveFileId;

  const hasFallenBackRef = useRef(false);
  useEffect(() => {
    hasFallenBackRef.current = false;
    setHasFallenBack(false);
    setStreamError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsDrawingMode(false);
    setActiveCommentDrawing(null);
    setActiveCommentId(null);
  }, [videoUrl]);

  const activeStreamUrl = (hasFallenBack && fallbackProxyUrl) ? fallbackProxyUrl : initialUrl;

  const videoOptions = {
    autoplay: false,
    controls: false,
    responsive: true,
    fill: true,
    preload: 'auto',
    errorDisplay: false,
    techOrder: isYouTube ? ['youtube'] : ['html5'],
    sources: [{
      src: activeStreamUrl,
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
      // Exit active drawing editing mode when playback starts
      setIsDrawingMode(false);
      if (player.muted()) {
        player.muted(false);
      }
      if (player.volume() === 0) {
        player.volume(1);
      }
    });

    player.on('pause', () => {
      setIsPlaying(false);
    });

    // Smart Fallback: If direct Google Drive streaming fails (e.g. virus scan gate >100MB, quota exceeded, or CORS),
    // seamlessly switch to Railway proxy stream without disrupting the user
    player.on('error', () => {
      const err = player.error();
      console.warn('Player error encountered on stream:', err);

      const targetFallbackUrl = fallbackProxyUrlRef.current;
      const targetFileId = driveFileIdRef.current;

      // Suppress Video.js default black error screen
      if (player.errorDisplay) {
        player.errorDisplay.close();
      }
      player.error(null);

      if (targetFallbackUrl && !hasFallenBackRef.current) {
        console.log('Switching to secondary fallback stream...');
        hasFallenBackRef.current = true;
        setHasFallenBack(true);
        if (targetFileId) {
          failedDirectFileIds.add(targetFileId);
        }

        const savedTime = player.currentTime() || 0;

        // Change source to fallback proxy
        player.src({
          src: targetFallbackUrl,
          type: 'video/mp4'
        });

        player.load();
        if (savedTime > 0) {
          player.one('loadedmetadata', () => {
            player.currentTime(savedTime);
          });
        }
        player.play().catch(() => {});
      } else {
        // Both primary and fallback failed (e.g. Google Drive quota exceeded on >100MB files)
        setStreamError({
          isDrive,
          url: rawVideoUrl || videoUrl,
          fileId: driveFileIdRef.current
        });
      }
    });
  };

  // Manage timeline range and drawing annotations on time update
  const handleTimeUpdate = (time) => {
    setCurrentTime(time);

    if (!isDrawingMode && showAnnotations) {
      // Find comment whose range covers the current time
      const matchingComment = comments.find(c => {
        if (c.timestamp === -1) return false;
        const { endTime } = extractRangeFromText(c.comment_text);
        if (endTime !== null && endTime > c.timestamp) {
          // Range comment: active throughout [start - 0.05, end + 0.05]
          return time >= (c.timestamp - 0.05) && time <= (endTime + 0.05);
        }
        // Single frame comment: active within 0.3s when paused or scrubbing
        return Math.abs(c.timestamp - time) <= 0.3;
      });

      if (matchingComment) {
        const { drawingData } = extractDrawingFromText(matchingComment.comment_text);
        if (drawingData?.strokes?.length > 0) {
          setActiveCommentDrawing(drawingData.strokes);
          setActiveCommentId(matchingComment.id);
          return;
        }
      }

      // If we seek away from the active comment's span, clear drawing view
      if (activeCommentDrawing && activeCommentId) {
        const activeC = comments.find(c => c.id === activeCommentId);
        if (activeC) {
          const { endTime } = extractRangeFromText(activeC.comment_text);
          if (endTime !== null && endTime > activeC.timestamp) {
            if (time < (activeC.timestamp - 0.05) || time > (endTime + 0.05)) {
              setActiveCommentDrawing(null);
              setActiveCommentId(null);
            }
          } else if (Math.abs(activeC.timestamp - time) > 0.3) {
            setActiveCommentDrawing(null);
            setActiveCommentId(null);
          }
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

  // Keyboard shortcuts for drawing & range In/Out points
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

  const handleAddComment = async (text, isChat = false, parentId = null, customTimestamp = null) => {
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

    let finalTimestamp = isChat ? -1 : (customTimestamp !== null && customTimestamp !== undefined ? customTimestamp : currentTime);
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

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 3500);
  }, []);

  const handleMouseMove = useCallback(() => {
    setIsMouseInside(true);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleScreenTap = useCallback((e) => {
    if (isDrawingMode) return;

    // If the tap/click was on an interactive control, button, or input, keep controls active
    if (e.target.closest('button, input, textarea, a, select, [role="button"], .sidebar-container')) {
      resetIdleTimer();
      return;
    }

    // Tapping the screen toggles / expands controls
    setIsIdle((prevIdle) => {
      if (prevIdle) {
        // Was collapsed -> expand options!
        return false;
      }
      // If already expanded in fullscreen, toggle collapse
      if (isFullscreen) {
        return true;
      }
      return false;
    });

    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 3500);
  }, [isDrawingMode, isFullscreen, resetIdleTimer]);

  const isControlsActive = isFullscreen ? !isIdle : (isMouseInside && !isIdle);
  const activeCommentObj = comments.find(c => c.id === activeCommentId);
  const activeRange = activeCommentObj ? extractRangeFromText(activeCommentObj.comment_text) : { endTime: null };
  const isRangeComment = activeRange.endTime && activeRange.endTime > activeCommentObj?.timestamp;

  return (
    <div
      className="flex flex-col lg:flex-row w-full h-full min-h-0 bg-black overflow-y-auto lg:overflow-hidden relative"
    >
      {/* Video Section Column - Fills width between left edge and comment bar */}
      <div className="w-full h-[45vh] min-h-[250px] max-h-[500px] sm:h-[55vh] lg:h-full lg:max-h-none lg:flex-1 min-w-0 flex flex-col min-h-0 relative z-10 bg-black">
        {/* Full-width Video + Control Bar Console Area (Touching left and comment bar) */}
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-0 overflow-hidden bg-black">
          <div
            ref={wrapperRef}
            className={`relative select-none flex flex-col items-center w-full h-full justify-center transition-all ${
              isFullscreen
                ? 'w-screen h-screen bg-black z-50'
                : 'w-full h-full'
            } ${!isControlsActive && isMouseInside && !isDrawingMode && isFullscreen ? 'cursor-none' : ''}`}
            onMouseEnter={() => setIsMouseInside(true)}
            onMouseLeave={() => setIsMouseInside(false)}
            onMouseMove={handleMouseMove}
            onClick={handleScreenTap}
            onTouchStart={() => {
              setIsMouseInside(true);
              resetIdleTimer();
            }}
            onDoubleClick={isDrawingMode ? undefined : handleToggleFullscreen}
          >
            {/* Unified Video & Control Console (100% width touching left and comment sidebar) */}
            <div className={`w-full h-full flex flex-col justify-between bg-black overflow-hidden`}>
              {/* Video Container + Drawing Canvas Overlay - Touching left and right */}
              <div className={`w-full relative flex-1 min-h-0 bg-black overflow-hidden flex items-center justify-center pointer-events-auto`}>
                <VideoPlayer
                  key={initialUrl}
                  ref={playerRef}
                  options={videoOptions}
                  onReady={handlePlayerReady}
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Google Drive / Streaming Error Recovery Overlay */}
                {streamError && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
                    <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Google Drive Stream Unavailable</h3>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-md mb-6 leading-relaxed">
                      Google Drive restricted automated streaming for this video. This happens when large files (&gt;100MB) hit Google's temporary download quota or virus scan gate.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <a
                        href={streamError.url || `https://drive.google.com/file/d/${streamError.fileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm rounded-none shadow-sm transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Google Drive
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setStreamError(null);
                          hasFallenBackRef.current = false;
                          setHasFallenBack(false);
                          const raw = playerRef.current?.getRawPlayer?.();
                          if (raw) {
                            raw.error(null);
                            raw.src({ src: initialUrl, type: 'video/mp4' });
                            raw.load();
                            raw.play().catch(() => {});
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs sm:text-sm rounded-none border border-white/10 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry Playback
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-5 max-w-sm">
                      Tip: For seamless playback with zero quota limits, consider adding a version using an unlisted YouTube link.
                    </p>
                  </div>
                )}

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
                showAnnotations={showAnnotations}
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
              {!isDrawingMode && activeCommentDrawing && showAnnotations && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl animate-in fade-in duration-200">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Pencil className="w-3 h-3 text-white" />
                    <span>Annotation by {activeCommentObj?.author_name || activeCommentObj?.author || 'User'}</span>
                    {isRangeComment && (
                      <span className="text-[10px] font-mono text-white bg-white/10 px-1.5 py-0.2 rounded border border-white/20">
                        {formatTime(activeCommentObj.timestamp)} - {formatTime(activeRange.endTime)}
                      </span>
                    )}
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

            {/* Player Controls Bar - Positioned Down Below the Video, Perfectly touching left and comment bar */}
            <div className={`w-full z-50 flex justify-center flex-shrink-0 ${isFullscreen
              ? 'absolute bottom-3 sm:bottom-6 left-0 right-0 px-2 sm:px-4 pointer-events-none'
              : 'relative w-full border-t border-white/10 bg-black pointer-events-auto'
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
                activeRangePreview={activeRangePreview}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Fullscreen drag blocker overlay to prevent iframes/canvas from swallowing mouse events */}
      {isDragging && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize select-none bg-transparent pointer-events-auto" />
      )}

      {/* Comment & Chat Sidebar */}
      <div 
        className="sidebar-container w-full min-h-[480px] lg:min-h-0 flex flex-col lg:flex-none shrink-0 lg:border-l border-white/10 bg-black/40 backdrop-blur-xl relative z-10"
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : undefined }}
      >
        <style>{`
          @media (min-width: 1024px) {
            .sidebar-container { 
              width: ${sidebarWidth}px !important; 
              min-width: 260px !important;
              max-width: 800px !important;
              flex: none !important;
            }
          }
        `}</style>

        {/* Resizer Handle */}
        <div
          className={`hidden lg:flex items-center justify-center absolute top-0 -left-2 w-4 h-full cursor-col-resize z-[70] group select-none ${
            isDragging ? 'bg-purple-500/20' : 'hover:bg-purple-500/10'
          }`}
          onMouseDown={handleSidebarMouseDown}
          title="Drag to resize sidebar"
        >
          <div className={`w-[2px] h-full transition-colors ${
            isDragging ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-transparent group-hover:bg-purple-400/60'
          }`} />
        </div>

        <CommentSidebar
          comments={comments}
          currentTime={currentTime}
          duration={duration}
          onAddComment={handleAddComment}
          onCommentClick={handleCommentClick}
          onDeleteComment={handleDeleteComment}
          onToggleResolve={handleToggleResolve}
          currentUserIdentity={isClient ? { name: guestName, isClient: true, id: user?.id, avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.raw_user_meta_data?.picture } : { id: user?.id, name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous', avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.raw_user_meta_data?.picture }}
          currentVersionNum={currentVersionNum}
          rawVideoUrl={rawVideoUrl}
          attachedDrawing={attachedDrawingStrokes}
          onOpenDrawing={handleOpenDrawing}
          onClearAttachedDrawing={handleClearDrawing}
          activeCommentId={activeCommentId}
          onRangePreviewChange={setActiveRangePreview}
        />
      </div>
    </div>
  );
};

export default ReviewPlayer;
