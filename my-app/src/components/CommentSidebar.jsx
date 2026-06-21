import React, { useState } from 'react';
import { Send, Play, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const CommentSidebar = ({ comments, currentTime, onAddComment, onCommentClick, currentUserIdentity }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div className="mt-4 w-full flex-shrink-0 min-h-[50vh] lg:min-h-0 lg:h-full bg-transparent border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center gap-2 text-zinc-100 font-medium">
        <MessageSquare size={18} className="text-indigo-400" />
        Comments
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-zinc-400 text-sm text-center mt-10 bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/5">
            No comments yet. Pause the video to add one!
          </div>
        ) : (
          [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((comment) => {
            const isMine = currentUserIdentity?.isClient 
              ? comment.author_name === currentUserIdentity.name 
              : (comment.user_id ? comment.user_id === currentUserIdentity?.id : comment.author_name === currentUserIdentity?.name);
            
            return (
              <div
                key={comment.id}
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] backdrop-blur-sm rounded-2xl p-3 border transition-colors group cursor-pointer shadow-lg ${
                    isMine 
                      ? 'bg-indigo-600/30 border-indigo-500/30 hover:border-indigo-400/50 rounded-br-sm' 
                      : 'bg-black/40 border-white/10 hover:border-white/30 rounded-bl-sm'
                  }`}
                  onClick={() => onCommentClick(comment)}
                >
                  <div className={`flex items-start mb-1 gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && <span className="font-semibold text-xs text-zinc-100 opacity-80">{comment.author_name || comment.author}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                      isMine 
                        ? 'bg-indigo-500/20 text-indigo-200 group-hover:bg-indigo-500/40' 
                        : 'bg-white/10 text-zinc-300 group-hover:bg-white/20'
                    }`}>
                      <Play size={8} />
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed break-words ${isMine ? 'text-indigo-100 text-right' : 'text-zinc-300 text-left'}`}>
                    {comment.comment_text}
                  </p>
                  <div className={`text-[9px] mt-1.5 opacity-60 ${isMine ? 'text-indigo-300 text-right' : 'text-zinc-500 text-left'}`}>
                    {dayjs(comment.created_at).format('MMM D, h:mm A')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="text-xs text-zinc-300 flex justify-between px-1">
            <span>Adding comment at:</span>
            <span className="font-mono text-indigo-300 font-medium">{formatTime(currentTime)}</span>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-black/50 border border-white/20 rounded-xl p-3 pr-10 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none shadow-inner"
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
              className="absolute bottom-3 right-3 text-zinc-400 hover:text-indigo-400 disabled:opacity-50 disabled:hover:text-zinc-500 transition-colors bg-white/10 p-1.5 rounded-lg hover:bg-white/20"
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
