import React, { useState } from 'react';
import { Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeWedge = (x, y, innerRadius, outerRadius, startAngle, endAngle) => {
  const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
  const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
};

const STATS = [
  { label: 'One review link', value: <div className="flex items-center gap-1 justify-center">1 <Link className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /></div> },
  { label: 'Storage Cost (Your drive)', value: '0$' },
  { label: 'Client Portals on Pro', value: '∞' },
  { label: 'Fewer Revision Rounds', value: '60%' },
];

// Angles: Top (-45 to 45), Right (45 to 135), Bottom (135 to 225), Left (225 to 315)
const WEDGE_ANGLES = [
  { start: -44, end: 44, cx: 0, cy: -1 }, // Top
  { start: 46, end: 134, cx: 1, cy: 0 },  // Right
  { start: 136, end: 224, cx: 0, cy: 1 }, // Bottom
  { start: 226, end: 314, cx: -1, cy: 0 } // Left
];

export default function RadialStats() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  const size = 600;
  const center = size / 2;
  const innerRadius = 100;
  const defaultOuterRadius = 280;
  const activeOuterRadius = 300;

  return (
    <div className="relative w-[340px] h-[340px] md:w-[600px] md:h-[600px] mx-auto my-12 z-50">
      
      {/* Dark mask over everything else when an item is active */}
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[-1] pointer-events-none rounded-[100%]"
            style={{ 
              width: '200vw', height: '200vh', 
              top: '50%', left: '50%', 
              transform: 'translate(-50%, -50%)' 
            }}
          />
        )}
      </AnimatePresence>

      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {WEDGE_ANGLES.map((angles, i) => {
          const isActive = activeIndex === i;
          const isHovered = hoveredIndex === i && !isActive;
          const hasActive = activeIndex !== null;
          const currentOuterRadius = isActive ? activeOuterRadius : defaultOuterRadius;
          
          let fill = 'rgba(24, 24, 27, 0.4)';
          let stroke = 'rgba(255, 255, 255, 0.1)';
          let strokeWidth = "2";
          
          if (isActive) {
            fill = 'rgba(99, 102, 241, 0.2)';
            stroke = 'rgba(99, 102, 241, 0.8)';
            strokeWidth = "3";
          } else if (isHovered && !hasActive) {
            fill = 'rgba(99, 102, 241, 0.15)';
            stroke = 'rgba(99, 102, 241, 0.5)';
          } else if (hasActive) {
            fill = 'rgba(24, 24, 27, 0.1)';
            stroke = 'rgba(255, 255, 255, 0.05)';
          }

          return (
            <motion.path
              key={i}
              animate={{
                d: describeWedge(center, center, innerRadius, currentOuterRadius, angles.start, angles.end),
                fill,
                stroke,
                strokeWidth
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setActiveIndex(isActive ? null : i)}
              className="cursor-pointer pointer-events-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          );
        })}
        {/* Central Hub */}
        <circle 
          cx={center} 
          cy={center} 
          r={innerRadius - 8} 
          fill="rgba(9, 9, 11, 0.9)" // zinc-950
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="2"
          onClick={() => setActiveIndex(null)}
          className="cursor-pointer pointer-events-auto"
        />
        <foreignObject x={center - 60} y={center - 40} width="120" height="80" className="pointer-events-none">
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Built for<br/>editors</span>
          </div>
        </foreignObject>
      </svg>

      {/* HTML Content Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {WEDGE_ANGLES.map((angles, i) => {
          const isActive = activeIndex === i;
          const hasActive = activeIndex !== null;
          
          const currentOuterRadius = isActive ? activeOuterRadius : defaultOuterRadius;
          const midAngle = (angles.start + angles.end) / 2;
          const contentRadius = innerRadius + (currentOuterRadius - innerRadius) / 2;
          const pos = polarToCartesian(center, center, contentRadius, midAngle);
          
          const leftPercent = (pos.x / size) * 100;
          const topPercent = (pos.y / size) * 100;

          const opacity = hasActive && !isActive ? 0.3 : 1;

          return (
            <motion.div 
              key={i}
              className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 w-[140px] text-center"
              animate={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                opacity: opacity
              }}
              transition={{ duration: 0.3 }}
            >
              <div className={`text-2xl md:text-4xl font-bold mb-1 transition-colors duration-300 ${isActive || hoveredIndex === i ? 'text-white' : 'text-zinc-100'}`}>
                {STATS[i].value}
              </div>
              <div className={`text-[10px] md:text-xs transition-colors duration-300 ${isActive || hoveredIndex === i ? 'text-indigo-200' : 'text-zinc-500'}`}>
                {STATS[i].label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
