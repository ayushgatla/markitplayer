import React, { useState } from 'react';
import { Send, Play, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const CommentSidebar = ({ comments, currentTime, onAddComment, onCommentClick }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-100 font-medium">
        <MessageSquare size={18} className="text-indigo-400" />
        Comments
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center mt-10">
            No comments yet. Pause the video to add one!
          </div>
        ) : (
          comments.sort((a,b) => a.timestamp - b.timestamp).map((comment) => (
            <div 
              key={comment.id} 
              className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 hover:border-indigo-500/50 transition-colors group cursor-pointer"
              onClick={() => onCommentClick(comment)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-zinc-200">{comment.author}</span>
                <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                  <Play size={10} />
                  {formatTime(comment.timestamp)}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed break-words">
                {comment.comment_text}
              </p>
              <div className="text-[10px] text-zinc-600 mt-2">
                {dayjs(comment.created_at).format('MMM D, h:mm A')}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="text-xs text-zinc-400 flex justify-between px-1">
            <span>Adding comment at:</span>
            <span className="font-mono text-indigo-400">{formatTime(currentTime)}</span>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 pr-10 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              rows={3}
              placeholder="Type your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="absolute bottom-3 right-3 text-zinc-400 hover:text-indigo-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentSidebar;
