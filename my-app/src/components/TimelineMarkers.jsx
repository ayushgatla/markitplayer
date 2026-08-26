import React, { useState } from 'react';
import clsx from 'clsx';
import { parseComment } from '../utils/commentHelper';
import { Pencil } from 'lucide-react';

export const TimelineMarkers = ({ duration, comments, onMarkerClick }) => {
  const [hoveredComment, setHoveredComment] = useState(null);

  if (!duration || duration === 0) return null;

  return (
    <div className="absolute bottom-[35px] left-0 right-0 h-4 w-full px-4 z-50 pointer-events-none">
      <div className="relative w-full h-full">
        {comments.filter(c => c.timestamp !== -1 && !c.comment_text?.startsWith('___REPLY:')).map((comment) => {
          const leftPercent = (comment.timestamp / duration) * 100;
          const parsed = parseComment(comment);

          return (
            <div
              key={comment.id}
              className={`absolute top-1 w-3 h-3 rounded-full cursor-pointer pointer-events-auto transform -translate-x-1/2 hover:scale-125 transition-all shadow-[0_0_8px_rgba(0,0,0,0.8)] border-2 border-zinc-900 ${
                comment.resolved 
                  ? 'bg-green-500 hover:bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]' 
                  : parsed.hasDrawing
                    ? 'bg-white hover:bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                    : 'bg-indigo-500 hover:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
              }`}
              style={{ left: `${leftPercent}%` }}
              onClick={() => onMarkerClick(comment)}
              onMouseEnter={() => setHoveredComment(comment)}
              onMouseLeave={() => setHoveredComment(null)}
            >
              {hoveredComment?.id === comment.id && (() => {
                const hParsed = parseComment(hoveredComment);
                const percent = Math.max(0, Math.min(100, leftPercent));
                return (
                  <div 
                    className="absolute bottom-4 bg-zinc-900 border border-white/15 text-zinc-100 text-xs py-1.5 px-2.5 rounded-lg w-52 shadow-2xl z-50 break-words pointer-events-none"
                    style={{
                      left: '50%',
                      transform: `translateX(-${percent}%)`
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="font-semibold text-[10px] text-zinc-400 truncate">
                        {hoveredComment.author_name || hoveredComment.author || 'User'}
                      </div>
                      <div className="flex items-center gap-1">
                        {hParsed.version && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                            v{hParsed.version}
                          </span>
                        )}
                        {hParsed.hasDrawing && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white border border-white/20 flex items-center gap-0.5">
                            <Pencil className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-200">
                      {hParsed.plainText || hParsed.previewText}
                    </div>
                    <div 
                      className="absolute -bottom-1 w-2 h-2 bg-zinc-900 border-b border-r border-white/15 -translate-x-1/2 rotate-45"
                      style={{ left: `${Math.max(10, Math.min(90, percent))}%` }}
                    />
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineMarkers;
