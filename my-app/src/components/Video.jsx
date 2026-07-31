import React from 'react';

export default function Video() {
  return (
    <div className="w-full max-w-7xl mx-auto rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative bg-black mt-12 mb-20">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto"
      >
        <source src="/video.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
