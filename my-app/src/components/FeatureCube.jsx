import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function FeatureCube({ features }) {
  const [rotationY, setRotationY] = useState(-20);
  const controls = useAnimation();

  // Auto-rotate the cube
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationY(prev => prev - 90);
    }, 4000); // Rotate every 4 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    controls.start({
      rotateY: rotationY,
      rotateX: -10, // Slight tilt for better 3D effect
      transition: { duration: 1.5, ease: 'easeInOut' }
    });
  }, [rotationY, controls]);

  const handleDragEnd = (event, info) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      // Swipe right
      setRotationY(prev => prev + 90);
    } else if (info.offset.x < -threshold) {
      // Swipe left
      setRotationY(prev => prev - 90);
    }
  };

  const faceClasses = "absolute w-full h-full p-8 bg-zinc-900 border border-zinc-700/50 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden";
  
  // We need all 6 faces to complete the cube, but only 4 have info.
  const faces = [
    { transform: 'rotateY(0deg) translateZ(160px)', feature: features[0] },
    { transform: 'rotateY(90deg) translateZ(160px)', feature: features[1] },
    { transform: 'rotateY(180deg) translateZ(160px)', feature: features[2] },
    { transform: 'rotateY(-90deg) translateZ(160px)', feature: features[3] },
    { transform: 'rotateX(90deg) translateZ(160px)', feature: null }, // Top
    { transform: 'rotateX(-90deg) translateZ(160px)', feature: null }, // Bottom
  ];

  return (
    <div className="w-full flex justify-center items-center py-10" style={{ perspective: '1200px' }}>
      <motion.div
        className="relative w-80 h-80 cursor-grab active:cursor-grabbing"
        style={{ transformStyle: 'preserve-3d' }}
        animate={controls}
        drag="x" // Only drag horizontally
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        whileHover={{ scale: 1.05 }}
      >
        {faces.map((face, index) => (
          <div
            key={index}
            className={faceClasses}
            style={{ 
              transform: face.transform,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
            
            {face.feature && (
              <>
                <div className="relative w-16 h-16 bg-zinc-800 flex items-center justify-center mb-6 shadow-inner z-10">
                  {React.cloneElement(face.feature.icon, { className: "w-8 h-8 text-white" })}
                </div>
                <h3 className="relative text-2xl font-semibold mb-4 text-white z-10">{face.feature.title}</h3>
                <p className="relative text-zinc-400 text-sm leading-relaxed z-10">{face.feature.description}</p>
              </>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
