import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Subtitles, Volume2, VolumeX, Maximize, Plus, Minus, Expand, Pencil, Eye, EyeOff } from 'lucide-react';
import LiquidGlass from 'liquid-glass-react';
import { extractRangeFromText, formatRangeTime } from '../utils/drawingHelper';
import { parseComment } from '../utils/commentHelper';

export const PlayerControls = ({ 
  playerRef, 
  comments = [], 
  onMarkerClick, 
  isMouseInside, 
  onToggleFullscreen, 
  isFullscreen, 
  onToggleExpand,
  onToggleDraw,
  isDrawingMode = false,
  showAnnotations = true,
  onToggleAnnotations,
  activeRangePreview = null
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [speed, setSpeed] = useState(1);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const setupEvents = () => {
      const player = playerRef.current?.getRawPlayer?.();
      if (player) {
        player.on('play', () => setIsPlaying(true));
        player.on('pause', () => setIsPlaying(false));
        player.on('timeupdate', () => setCurrentTime(player.currentTime()));
        player.on('durationchange', () => setDuration(player.duration()));
        player.on('volumechange', () => {
          setVolume(player.volume());
          setIsMuted(player.muted());
        });
        player.on('ratechange', () => setSpeed(player.playbackRate()));

        setIsPlaying(!player.paused());
        setCurrentTime(player.currentTime());
        setDuration(player.duration() || 0);
        setVolume(player.volume());
        setIsMuted(player.muted());
        setSpeed(player.playbackRate() || 1);
        return true;
      }
      return false;
    };

    const interval = setInterval(() => {
      if (setupEvents()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [playerRef]);

  const togglePlay = () => {
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      if (player.paused()) {
        player.muted(false);
        if (player.volume() === 0) player.volume(1);
        player.play();
      } else {
        player.pause();
      }
    }
  };

  const skip = (seconds) => {
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      player.currentTime(player.currentTime() + seconds);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      const nextMuted = !player.muted();
      player.muted(nextMuted);
      if (!nextMuted && player.volume() === 0) {
        player.volume(1);
      }
    }
  };

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      const player = playerRef.current?.getRawPlayer?.();
      if (player) {
        if (player.isFullscreen()) player.exitFullscreen();
        else player.requestFullscreen();
      }
    }
  };

  const toggleSubtitles = () => {
    const player = playerRef.current?.getRawPlayer?.();
    if (!player) return;

    let hasSubtitles = false;
    const tracks = player.textTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        hasSubtitles = true;
        track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
      }
    }

    if (!hasSubtitles && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubtitleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      const url = URL.createObjectURL(file);
      
      const tracks = player.textTracks();
      for (let i = tracks.length - 1; i >= 0; i--) {
        if (tracks[i].kind === 'subtitles' || tracks[i].kind === 'captions') {
          player.removeRemoteTextTrack(tracks[i]);
        }
      }

      const trackEl = player.addRemoteTextTrack({
        src: url,
        kind: 'subtitles',
        srclang: 'en',
        label: file.name,
        default: true
      }, false);

      trackEl.track.mode = 'showing';
    }
  };

  const changeSpeed = (delta) => {
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      let newSpeed = speed + delta;
      if (newSpeed < 0.25) newSpeed = 0.25;
      if (newSpeed > 3.0) newSpeed = 3.0;
      player.playbackRate(newSpeed);
      setSpeed(newSpeed);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(speed);
    const nextSpeed = currentIndex !== -1 ? speeds[(currentIndex + 1) % speeds.length] : 1;
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      player.playbackRate(nextSpeed);
    }
    setSpeed(nextSpeed);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    playerRef.current?.getRawPlayer?.()?.currentTime(time);
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    const player = playerRef.current?.getRawPlayer?.();
    if (player) {
      player.muted(false);
      player.volume(v);
    }
  };

  const showControls = isFullscreen ? (isMouseInside || !isPlaying) : true;

  return (
    <div className={`w-full transition-all duration-300 ease-in-out mx-auto ${
      isFullscreen 
        ? (showControls ? 'w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-5xl' : 'w-[60%] max-w-2xl') 
        : 'w-full'
    }`}>
      {/* Control Bar Container */}
      <div className={`relative w-full transition-all duration-300 ${
        isFullscreen ? 'rounded-2xl sm:rounded-full' : 'rounded-none'
      }`}>
        {/* Background Layer: Transparent with subtle glass in fullscreen, clean seamless in normal mode */}
        <div className={`absolute inset-0 w-full h-full transition-all duration-300 ${
          isFullscreen
            ? 'rounded-2xl sm:rounded-full bg-black/25 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'rounded-none bg-transparent border-0 shadow-none'
        }`} />

        {/* Content Wrapper */}
        <div className={`w-full flex flex-col relative z-10 transition-all duration-300 ${
          isFullscreen
            ? 'px-4 sm:px-6 py-2.5 sm:py-3 gap-1.5'
            : 'px-3 sm:px-4 py-1.5 sm:py-2 gap-1'
        }`}>
          {/* Progress Bar & Timeline Markers & Range Spans */}
          <div className="w-full relative h-3.5 sm:h-4 flex items-center group pointer-events-auto cursor-pointer">
            {/* Hovered Comment Tooltip positioned relative to progress bar */}
            {hoveredComment && duration > 0 && (() => {
              const parsed = parseComment(hoveredComment);
              const percent = Math.max(0, Math.min(100, (hoveredComment.timestamp / duration) * 100));

              return (
                <div 
                  className="absolute bottom-full mb-2 bg-zinc-900 text-zinc-100 text-xs py-1.5 px-2.5 rounded-xl border border-white/15 shadow-2xl z-[70] break-words pointer-events-none text-left backdrop-blur-md min-w-[170px] max-w-xs transition-opacity duration-150"
                  style={{ 
                    left: `${percent}%`,
                    transform: `translateX(-${percent}%)`
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">
                      {hoveredComment.author_name || hoveredComment.author || 'User'}
                    </span>
                    <div className="flex items-center gap-1">
                      {parsed.version && (
                        <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-mono">
                          v{parsed.version}
                        </span>
                      )}
                      {parsed.isRange && (
                        <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full">
                          ↔ Range
                        </span>
                      )}
                      {parsed.hasDrawing && (
                        <span className="text-[9px] font-bold bg-white/10 text-white border border-white/20 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Pencil className="w-2.5 h-2.5 text-white" />
                          <span>Drawing</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {parsed.isRange && (
                    <div className="text-[11px] font-mono text-purple-200 font-medium mb-1">
                      {parsed.formattedTime}
                    </div>
                  )}

                  <div className="text-xs text-zinc-200 line-clamp-2">
                    {parsed.plainText || parsed.previewText}
                  </div>
                  <div 
                    className="absolute -bottom-1.5 w-3 h-3 bg-zinc-900 border-b border-r border-white/15 -translate-x-1/2 rotate-45"
                    style={{ left: `${Math.max(8, Math.min(92, percent))}%` }}
                  />
                </div>
              );
            })()}

            {/* Base Track */}
            <div className="absolute w-full h-1 sm:h-1.5 group-hover:h-2 bg-white/20 rounded-full overflow-hidden pointer-events-none shadow-inner transition-all duration-150">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* In-Progress Range Creation Preview */}
            {activeRangePreview && activeRangePreview.end > activeRangePreview.start && duration > 0 && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-1.5 sm:h-2 rounded-full pointer-events-none z-20 bg-white/30 border border-dashed border-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"
                style={{
                  left: `${(activeRangePreview.start / duration) * 100}%`,
                  width: `${Math.max(1, ((activeRangePreview.end - activeRangePreview.start) / duration) * 100)}%`
                }}
              />
            )}

            {/* Completed Markers and Range Spans */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {comments.filter(c => c.timestamp !== -1 && !c.comment_text.startsWith('___REPLY:')).map((comment) => {
                const leftPercent = duration ? (comment.timestamp / duration) * 100 : 0;
                const hasDrawing = comment.comment_text && comment.comment_text.includes('___DRAW:');
                const { endTime } = extractRangeFromText(comment.comment_text);
                const isRange = endTime && endTime > comment.timestamp;

                if (isRange && duration > 0) {
                  const widthPercent = ((endTime - comment.timestamp) / duration) * 100;
                  return (
                    <div
                      key={`range-${comment.id}`}
                      className={`absolute top-1/2 -translate-y-1/2 h-1.5 sm:h-2 rounded-full cursor-pointer pointer-events-auto transition-all z-25 border hover:scale-y-125 hover:z-30 shadow-md ${
                        hasDrawing
                          ? 'bg-white/90 border-white text-black shadow-[0_0_8px_rgba(255,255,255,0.8)] hover:bg-white'
                          : 'bg-indigo-500/90 border-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.8)] hover:bg-indigo-400'
                      }`}
                      style={{ left: `${leftPercent}%`, width: `${Math.max(1, widthPercent)}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkerClick) onMarkerClick(comment);
                      }}
                      onMouseEnter={() => setHoveredComment(comment)}
                      onMouseLeave={() => setHoveredComment(null)}
                    />
                  );
                }

                // Single frame point marker
                return (
                  <div
                    key={comment.id}
                    className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 hover:scale-150 transition-transform border z-30 ${
                      hasDrawing
                        ? 'bg-white border-zinc-900 shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                        : 'bg-indigo-400 border-white shadow-[0_0_6px_rgba(99,102,241,0.8)]'
                    }`}
                    style={{ left: `${leftPercent}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onMarkerClick) onMarkerClick(comment);
                    }}
                    onMouseEnter={() => setHoveredComment(comment)}
                    onMouseLeave={() => setHoveredComment(null)}
                  />
                );
              })}
            </div>

            {/* Actual Input Slider */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
          </div>

          {/* Controls Row with CSS Grid: Dead-Centered Playback Buttons, Zero Overlap */}
          <div className={`pointer-events-auto w-full transition-all duration-300 ease-in-out ${
            isFullscreen 
              ? (showControls ? 'opacity-100 max-h-14 py-1' : 'opacity-0 max-h-0 py-0 overflow-hidden')
              : 'py-0.5'
          }`}>
            {/* Hidden file input for subtitles */}
            <input 
              type="file" 
              accept=".vtt" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleSubtitleUpload}
            />

            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-1 sm:gap-2">
              
              {/* Left: Time & Volume */}
              <div className="flex items-center justify-start gap-1 sm:gap-2 min-w-0">
                <div className="text-white/90 text-[10px] sm:text-xs font-medium font-mono tracking-tight sm:tracking-wide whitespace-nowrap">
                  {formatTime(currentTime)} <span className="text-white/40 mx-0.5">/</span> {formatTime(duration)}
                </div>
                <div className="flex items-center gap-1 group shrink-0">
                  <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition-colors p-1 rounded hover:bg-white/10" title="Mute/Unmute">
                    {isMuted || volume === 0 ? <VolumeX size={14} className="sm:w-[15px] sm:h-[15px]" /> : <Volume2 size={14} className="sm:w-[15px] sm:h-[15px]" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="hidden xl:block w-0 opacity-0 group-hover:w-16 group-hover:opacity-100 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Center: Playback Controls (Mathematically Centered in Grid & Cannot Be Overlapped) */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-shrink-0 px-1">
                <button onClick={() => skip(-5)} className="text-zinc-300 hover:text-white transition-all hover:scale-110 p-1" title="Rewind 5s">
                  <SkipBack size={15} className="sm:w-4 sm:h-4" />
                </button>
                <button 
                  onClick={togglePlay} 
                  className="text-white hover:text-indigo-300 transition-all bg-white/10 hover:bg-white/20 rounded-full border border-white/10 shadow-md hover:scale-105 p-1.5 sm:p-2 flex items-center justify-center" 
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={15} className="sm:w-4 sm:h-4" /> : <Play size={15} className="sm:w-4 sm:h-4 ml-0.5" />}
                </button>
                <button onClick={() => skip(5)} className="text-zinc-300 hover:text-white transition-all hover:scale-110 p-1" title="Forward 5s">
                  <SkipForward size={15} className="sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Right: Actions Responsive */}
              <div className="flex items-center justify-end gap-1 sm:gap-1.5 min-w-0">
                {/* Draw on Frame Button */}
                <button 
                  onClick={onToggleDraw} 
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isDrawingMode 
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30' 
                      : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10'
                  }`}
                  title={isDrawingMode ? "Exit Drawing Mode" : "Draw on Video Frame (P)"}
                >
                  <Pencil size={13} className={isDrawingMode ? "text-black fill-black" : "text-white"} />
                  <span className="hidden md:inline">{isDrawingMode ? 'Drawing' : 'Draw'}</span>
                </button>

                {/* Toggle Annotations Visibility */}
                {onToggleAnnotations && (
                  <button 
                    onClick={onToggleAnnotations} 
                    className={`p-1 rounded-lg transition-colors shrink-0 ${
                      showAnnotations ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/10'
                    }`}
                    title={showAnnotations ? "Hide Annotations on Video" : "Show Annotations on Video"}
                  >
                    {showAnnotations ? <Eye size={15} className="sm:w-4 sm:h-4" /> : <EyeOff size={15} className="sm:w-4 sm:h-4" />}
                  </button>
                )}

                {/* Playback Speed: Desktop has - 1x +, small screens have quick badge */}
                <div className="hidden sm:flex items-center bg-white/10 rounded-full px-1.5 py-0.5 border border-white/10 shrink-0">
                  <button onClick={() => changeSpeed(-0.25)} className="text-zinc-300 hover:text-white p-0.5"><Minus size={11} /></button>
                  <span className="text-white/90 text-[10px] sm:text-[11px] font-mono font-medium w-5 sm:w-6 text-center">{speed}x</span>
                  <button onClick={() => changeSpeed(0.25)} className="text-zinc-300 hover:text-white p-0.5"><Plus size={11} /></button>
                </div>

                {/* Mobile Speed Button (cycles speed on tap) */}
                <button
                  onClick={cycleSpeed}
                  className="sm:hidden flex items-center bg-white/10 hover:bg-white/20 rounded-full px-1.5 py-0.5 border border-white/10 text-[10px] font-mono text-white/90 shrink-0"
                  title="Change Speed"
                >
                  {speed}x
                </button>

                {/* Subtitles: hidden on narrow screens */}
                <button 
                  onClick={toggleSubtitles} 
                  className="hidden xs:flex text-zinc-300 hover:text-white transition-all hover:scale-110 p-1 sm:p-1.5 rounded hover:bg-white/10 shrink-0" 
                  title="Subtitles"
                >
                  <Subtitles size={15} className="sm:w-4 sm:h-4" />
                </button>

                {/* Expand: Only relevant on desktop wide screens */}
                {!isFullscreen && (
                  <button 
                    onClick={onToggleExpand} 
                    className="hidden lg:flex text-zinc-300 hover:text-white transition-all hover:scale-110 p-1 sm:p-1.5 rounded hover:bg-white/10 shrink-0" 
                    title="Expand View"
                  >
                    <Expand size={15} className="sm:w-4 sm:h-4" />
                  </button>
                )}

                {/* Fullscreen: Always visible */}
                <button 
                  onClick={toggleFullscreen} 
                  className="text-zinc-300 hover:text-white transition-all hover:scale-110 p-1 sm:p-1.5 rounded hover:bg-white/10 shrink-0" 
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  <Maximize size={15} className="sm:w-4 sm:h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
