import React, { useState } from 'react';
import clsx from 'clsx';

export const TimelineMarkers = ({ duration, comments, onMarkerClick }) => {
  const [hoveredComment, setHoveredComment] = useState(null);

  if (!duration || duration === 0) return null;

  return (
    <div className="absolute bottom-[35px] left-0 right-0 h-4 w-full px-4 z-50 pointer-events-none">
      <div className="relative w-full h-full">
        {comments.map((comment) => {
          const leftPercent = (comment.timestamp / duration) * 100;
          return (
            <div
              key={comment.id}
              className="absolute top-1 w-3 h-3 bg-indigo-500 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 hover:scale-125 hover:bg-indigo-400 transition-all shadow-[0_0_8px_rgba(99,102,241,0.8)] border-2 border-zinc-900"
              style={{ left: `${leftPercent}%` }}
              onClick={() => onMarkerClick(comment)}
              onMouseEnter={() => setHoveredComment(comment)}
              onMouseLeave={() => setHoveredComment(null)}
            >
              {hoveredComment?.id === comment.id && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-100 text-xs py-1 px-2 rounded w-48 shadow-lg z-20 break-words pointer-events-none">
                  <div className="font-semibold text-[10px] text-zinc-400 mb-0.5">{comment.author}</div>
                  {comment.comment_text}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineMarkers;
