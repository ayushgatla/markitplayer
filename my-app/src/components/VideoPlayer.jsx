import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';

export const VideoPlayer = forwardRef(({ options, onReady, onTimeUpdate }, ref) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.currentTime(time);
      }
    },
    pause: () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.pause();
      }
    },
    play: () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.play();
      }
    },
    getCurrentTime: () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        return playerRef.current.currentTime();
      }
      return 0;
    },
    getDuration: () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        return playerRef.current.duration();
      }
      return 0;
    },
    getRawPlayer: () => {
      return playerRef.current;
    }
  }));

  const src = options?.sources?.[0]?.src;
  const tech = options?.techOrder?.[0];

  useEffect(() => {
    if (!videoRef.current || !src) return;

    // Clean up previous instance before mounting new one
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const videoElement = document.createElement("video-js");
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.innerHTML = '';
    videoRef.current.appendChild(videoElement);

    const player = playerRef.current = videojs(videoElement, options, () => {
      videojs.log('player is ready');
      if (onReady) {
        onReady(player);
      }
    });

    player.on('timeupdate', () => {
      if (onTimeUpdate && !player.isDisposed()) {
        onTimeUpdate(player.currentTime());
      }
    });

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [src, tech]);

  return (
    <div data-vjs-player className="absolute inset-0 w-full h-full">
      <div ref={videoRef} className="w-full h-full" />
    </div>
  );
});

export default VideoPlayer;
