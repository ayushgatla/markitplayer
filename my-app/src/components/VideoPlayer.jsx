import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';

export const VideoPlayer = forwardRef(({ options, onReady, onTimeUpdate }, ref) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      if (playerRef.current) {
        playerRef.current.currentTime(time);
      }
    },
    pause: () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    },
    getCurrentTime: () => {
      if (playerRef.current) {
        return playerRef.current.currentTime();
      }
      return 0;
    },
    getDuration: () => {
      if (playerRef.current) {
        return playerRef.current.duration();
      }
      return 0;
    }
  }));

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        if (onReady) {
          onReady(player);
        }
      });

      player.on('timeupdate', () => {
        if (onTimeUpdate) {
          onTimeUpdate(player.currentTime());
        }
      });
    }

    // You could update an existing player in the `else` block here
    // on prop change.
  }, [options, videoRef, onReady, onTimeUpdate]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player className="w-full h-full relative">
      <div ref={videoRef} className="w-full h-full" />
    </div>
  );
});

export default VideoPlayer;
