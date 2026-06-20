import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Subtitles, Volume2, VolumeX, Maximize, Plus, Minus } from 'lucide-react';
import LiquidGlass from 'liquid-glass-react';

export const PlayerControls = ({ playerRef, comments = [], onMarkerClick, isMouseInside, onToggleFullscreen }) => {
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
      if (player.paused()) player.play();
      else player.pause();
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
      player.muted(!player.muted());
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
      
      // Clean up previous tracks to prevent duplicates
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

      // Force track to showing mode, video.js requires this specifically for dynamically added blobs
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
    <div className={`relative sm:absolute bottom-auto sm:bottom-6 left-0 right-0 mx-auto z-50 w-full transition-all duration-500 ease-in-out ${showControls ? 'sm:w-[calc(100%-3rem)]' : 'sm:w-[60%] sm:max-w-2xl'}`}>
      {/* Hovered Comment Tooltip */}
      {hoveredComment && duration > 0 && (
        <div 
          className="absolute bottom-full mb-4 bg-zinc-800 text-zinc-100 text-xs py-1.5 px-3 rounded-md w-48 shadow-xl z-[60] break-words pointer-events-none text-left transform -translate-x-1/2 transition-opacity duration-200"
          style={{ left: `${(hoveredComment.timestamp / duration) * 100}%` }}
        >
          <div className="font-semibold text-[10px] text-zinc-400 mb-0.5 uppercase tracking-wider">
            {hoveredComment.author_name || hoveredComment.author || 'User'}
          </div>
          <div className="text-sm">
            {hoveredComment.comment_text}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-800 rotate-45"></div>
        </div>
      )}

      {/* Control Bar Container */}
      <div className="relative w-full sm:rounded-[24px]">
        {/* Backgrounds */}
        <div className="hidden sm:block absolute inset-0 w-full h-full rounded-[24px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 ease-in-out" />
        <div className="sm:hidden absolute inset-0 w-full h-full bg-zinc-950 border-t border-zinc-900" />

        {/* Content Wrapper */}
        <div className={`w-full flex flex-col relative z-10 px-4 sm:px-6 transition-all duration-500 ease-in-out ${showControls ? 'gap-4 sm:gap-3 py-4 sm:py-4' : 'gap-4 sm:gap-0 py-4 sm:py-3'}`}>
          {/* Progress Bar & Timeline Markers (Always visible) */}
          <div className="w-full relative h-4 flex items-center group pointer-events-auto">
            {/* Base Track */}
            <div className="absolute w-full h-1.5 bg-white/20 rounded-full overflow-hidden pointer-events-none shadow-inner">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Markers */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              {comments.map((comment) => {
                const leftPercent = duration ? (comment.timestamp / duration) * 100 : 0;
                return (
                  <div
                    key={comment.id}
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-400 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 hover:scale-150 transition-transform shadow-[0_0_8px_rgba(99,102,241,0.8)] border-2 border-zinc-900 z-30"
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
          <div className={`flex flex-col sm:flex-row items-center justify-between pointer-events-auto w-full drop-shadow-md transition-all duration-500 ease-in-out overflow-hidden gap-4 sm:gap-0 ${showControls ? 'opacity-100 max-h-[300px] sm:max-h-16 pt-2 pb-2 sm:pb-0' : 'opacity-100 sm:opacity-0 max-h-[300px] sm:max-h-0 pt-2 sm:pt-0 pb-2 sm:pb-0'}`}>
            
            {/* MOBILE: Top Row | DESKTOP: Left Side */}
            <div className="flex items-center justify-between w-full sm:w-[30%]">
              
              {/* Left: Time & Volume */}
              <div className="flex items-center justify-start gap-3">
                <div className="text-white/90 text-xs sm:text-sm font-medium font-mono tracking-wide whitespace-nowrap">
                  {formatTime(currentTime)} <span className="text-white/50 mx-1">/</span> {formatTime(duration)}
                </div>
                <div className="flex items-center gap-1 sm:gap-3 group">
                  <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors p-1" title="Mute/Unmute">
                    {isMuted || volume === 0 ? <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />}
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

              {/* MOBILE ONLY: Speed, CC, Fullscreen */}
              <div className="flex sm:hidden items-center justify-end gap-3">
                <div className="flex items-center bg-white/10 rounded-full px-2 py-1 border border-white/10">
                  <button onClick={() => changeSpeed(-0.25)} className="text-white hover:text-indigo-400 p-0.5"><Minus size={12} /></button>
                  <span className="text-white/90 text-[10px] font-mono font-medium w-6 text-center">{speed}x</span>
                  <button onClick={() => changeSpeed(0.25)} className="text-white hover:text-indigo-400 p-0.5"><Plus size={12} /></button>
                </div>
                <button onClick={toggleSubtitles} className="text-white hover:text-indigo-400 p-1"><Subtitles size={16} /></button>
                <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 p-1"><Maximize size={16} /></button>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center justify-center gap-6 w-full sm:w-[40%] flex-shrink-0">
              <button onClick={() => skip(-5)} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1">
                <SkipBack size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-all bg-white/10 hover:bg-white/20 p-3 sm:p-3 rounded-full border border-white/10 shadow-lg hover:shadow-indigo-500/20 hover:scale-105">
                {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="ml-1 sm:w-6 sm:h-6" />}
              </button>
              <button onClick={() => skip(5)} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1">
                <SkipForward size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* DESKTOP ONLY: Speed, CC, Fullscreen */}
            <div className="hidden sm:flex items-center justify-end gap-5 w-[30%]">
              <div className="flex items-center bg-white/10 rounded-full px-2 py-1.5 border border-white/10 shadow-lg">
                <button onClick={() => changeSpeed(-0.25)} className="text-white hover:text-indigo-400 p-1"><Minus size={14} /></button>
                <span className="text-white/90 text-xs font-mono font-medium w-9 text-center">{speed}x</span>
                <button onClick={() => changeSpeed(0.25)} className="text-white hover:text-indigo-400 p-1"><Plus size={14} /></button>
              </div>
              <button onClick={toggleSubtitles} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1"><Subtitles size={20} /></button>
              <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-transform hover:scale-110 p-1"><Maximize size={20} /></button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
