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

  const showControls = isMouseInside || !isPlaying;

  return (
    <div className={`w-full transition-all duration-500 ease-in-out mx-auto ${showControls ? (isFullscreen ? 'w-[calc(100%-1rem)] lg:w-[calc(100%-3rem)]' : 'lg:w-[calc(100%-3rem)]') : (isFullscreen ? 'w-[60%] max-w-2xl' : 'lg:w-[60%] lg:max-w-2xl')}`}>
      {/* Control Bar Container */}
      <div className="relative w-full rounded-[20px] lg:rounded-[24px]">
        {/* Glass Background for Both Mobile and Desktop */}
        <div className="absolute inset-0 w-full h-full rounded-[20px] lg:rounded-[24px] bg-white/5 lg:bg-black/40 backdrop-blur-xl lg:backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 ease-in-out" />

        {/* Content Wrapper */}
        <div className={`w-full flex flex-col relative z-10 px-4 lg:px-6 transition-all duration-500 ease-in-out ${showControls ? (isFullscreen ? 'gap-2 py-2' : 'gap-4 lg:gap-3 py-4 lg:py-4') : (isFullscreen ? 'gap-2 py-2' : 'gap-4 lg:gap-0 py-4 lg:py-3')}`}>
          {/* Progress Bar & Timeline Markers & Range Spans */}
          <div className="w-full relative h-6 flex items-center group pointer-events-auto">
            {/* Hovered Comment Tooltip positioned relative to progress bar */}
            {hoveredComment && duration > 0 && (() => {
              const parsed = parseComment(hoveredComment);
              const percent = Math.max(0, Math.min(100, (hoveredComment.timestamp / duration) * 100));

              return (
                <div 
                  className="absolute bottom-full mb-3 bg-zinc-900 text-zinc-100 text-xs py-2 px-3 rounded-xl border border-white/15 shadow-2xl z-[70] break-words pointer-events-none text-left backdrop-blur-md min-w-[170px] max-w-xs transition-opacity duration-150"
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
            <div className="absolute w-full h-2 bg-white/20 rounded-full overflow-hidden pointer-events-none shadow-inner">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* In-Progress Range Creation Preview */}
            {activeRangePreview && activeRangePreview.end > activeRangePreview.start && duration > 0 && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full pointer-events-none z-20 bg-white/30 border border-dashed border-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"
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
                      className={`absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full cursor-pointer pointer-events-auto transition-all z-25 border hover:scale-y-150 hover:z-30 shadow-md ${
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
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 hover:scale-150 transition-transform border z-30 ${
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

          {/* Controls Row */}
          <div className={`flex items-center justify-between pointer-events-auto w-full drop-shadow-md transition-all duration-500 ease-in-out overflow-hidden ${
            isFullscreen 
              ? `flex-col md:flex-row gap-2.5 md:gap-0 ${showControls ? 'opacity-100 max-h-48 md:max-h-16 py-1.5 md:py-1' : 'opacity-0 max-h-0 py-0'}`
              : `flex-col lg:flex-row gap-4 lg:gap-0 ${showControls ? 'opacity-100 lg:max-h-16 pt-2 pb-2 lg:py-1' : 'opacity-100 lg:opacity-0 lg:max-h-0 pt-2 lg:pt-0 pb-2 lg:pb-0'}`
          }`}>
            
            {/* MOBILE / COMPACT: Top Row | DESKTOP: Left Side */}
            <div className={`flex items-center justify-between ${isFullscreen ? 'w-full md:w-[30%]' : 'w-full lg:w-[30%]'}`}>
              
              {/* Left: Time & Volume */}
              <div className="flex items-center justify-start gap-2 lg:gap-3">
                <div className="text-white/90 text-xs lg:text-sm font-medium font-mono tracking-wide whitespace-nowrap">
                  {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                </div>
                <div className="flex items-center gap-1 lg:gap-3 group">
                  <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors p-1" title="Mute/Unmute">
                    {isMuted || volume === 0 ? <VolumeX size={16} className="w-4 h-4 lg:w-[18px] lg:h-[18px]" /> : <Volume2 size={16} className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="hidden xl:block w-0 opacity-0 group-hover:w-20 group-hover:opacity-100 transition-all duration-300 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Hidden file input for subtitles (Used by both Mobile and Desktop) */}
              <input 
                type="file" 
                accept=".vtt" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleSubtitleUpload}
              />

              {/* MOBILE ONLY / COMPACT RESPONSIVE: Draw, Eye, Speed, CC, Expand, Fullscreen */}
              <div className={`${isFullscreen ? 'flex md:hidden' : 'flex lg:hidden'} items-center justify-end gap-1.5 sm:gap-2`}>
                <button 
                  onClick={onToggleDraw} 
                  className={`p-1.5 rounded-lg transition-all ${isDrawingMode ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40' : 'text-white hover:text-white bg-white/5 border border-white/10'}`}
                  title={isDrawingMode ? "Exit Drawing Mode" : "Draw on frame"}
                >
                  <Pencil size={15} className={isDrawingMode ? "text-black fill-black" : "text-white"} />
                </button>
                {onToggleAnnotations && (
                  <button 
                    onClick={onToggleAnnotations} 
                    className={`p-1.5 rounded-lg transition-all ${showAnnotations ? 'text-white hover:text-indigo-400 bg-white/5 border border-white/10' : 'text-zinc-500 hover:text-zinc-300 bg-white/5 border border-white/10'}`}
                    title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
                  >
                    {showAnnotations ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                )}
                <div className="flex items-center bg-white/10 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 border border-white/10">
                  <button onClick={() => changeSpeed(-0.25)} className="text-white hover:text-indigo-400 p-0.5"><Minus size={11} /></button>
                  <span className="text-white/90 text-[10px] font-mono font-medium w-5 sm:w-6 text-center">{speed}x</span>
                  <button onClick={() => changeSpeed(0.25)} className="text-white hover:text-indigo-400 p-0.5"><Plus size={11} /></button>
                </div>
                <button onClick={toggleSubtitles} className="text-white hover:text-indigo-400 p-1" title="Subtitles"><Subtitles size={16} /></button>
                <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 p-1" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}><Maximize size={16} /></button>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className={`flex items-center justify-center gap-4 lg:gap-6 flex-shrink-0 ${isFullscreen ? 'w-full md:w-[40%]' : 'w-full lg:w-[40%]'}`}>
              <button onClick={() => skip(-5)} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1" title="Rewind 5s">
                <SkipBack size={20} className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <button onClick={togglePlay} className={`text-white hover:text-indigo-400 transition-all bg-white/10 hover:bg-white/20 rounded-full border border-white/10 shadow-lg hover:shadow-indigo-500/20 hover:scale-105 ${isFullscreen ? 'p-2.5 lg:p-3' : 'p-3 lg:p-3'}`} title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={20} className="w-5 h-5 lg:w-6 lg:h-6" /> : <Play size={20} className="ml-0.5 w-5 h-5 lg:w-6 lg:h-6" />}
              </button>
              <button onClick={() => skip(5)} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1" title="Forward 5s">
                <SkipForward size={20} className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            {/* DESKTOP / WIDE: Draw, Annotations, Speed, CC, Expand, Fullscreen */}
            <div className={`${isFullscreen ? 'hidden md:flex' : 'hidden lg:flex'} items-center justify-end gap-2 lg:gap-3.5 md:w-[30%]`}>
              {/* Draw on Frame Button */}
              <button 
                onClick={onToggleDraw} 
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isDrawingMode 
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 scale-105' 
                    : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10'
                }`}
                title={isDrawingMode ? "Exit Drawing Mode" : "Draw on Video Frame (P)"}
              >
                <Pencil size={14} className={isDrawingMode ? "text-black fill-black" : "text-white"} />
                <span>{isDrawingMode ? 'Drawing' : 'Draw'}</span>
              </button>

              {/* Toggle Annotations Visibility */}
              {onToggleAnnotations && (
                <button 
                  onClick={onToggleAnnotations} 
                  className={`p-1.5 rounded-lg transition-colors ${
                    showAnnotations ? 'text-zinc-300 hover:text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={showAnnotations ? "Hide Annotations on Video" : "Show Annotations on Video"}
                >
                  {showAnnotations ? <Eye size={18} /> : <EyeOff size={18} className="text-zinc-500" />}
                </button>
              )}

              <div className="flex items-center bg-white/10 rounded-full px-2 py-1 lg:py-1.5 border border-white/10 shadow-lg">
                <button onClick={() => changeSpeed(-0.25)} className="text-white hover:text-indigo-400 p-1"><Minus size={14} className="w-3 h-3 lg:w-3.5 lg:h-3.5" /></button>
                <span className="text-white/90 text-[10px] lg:text-xs font-mono font-medium w-6 lg:w-9 text-center">{speed}x</span>
                <button onClick={() => changeSpeed(0.25)} className="text-white hover:text-indigo-400 p-1"><Plus size={14} className="w-3 h-3 lg:w-3.5 lg:h-3.5" /></button>
              </div>
              <button onClick={toggleSubtitles} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1" title="Subtitles"><Subtitles size={19} className="w-4 h-4 lg:w-5 lg:h-5" /></button>
              {!isFullscreen && (
                <button onClick={onToggleExpand} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1" title="Expand View"><Expand size={19} className="w-4 h-4 lg:w-5 lg:h-5" /></button>
              )}
              <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}><Maximize size={19} className="w-4 h-4 lg:w-5 lg:h-5" /></button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
