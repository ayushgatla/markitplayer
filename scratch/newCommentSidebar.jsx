import React, { useState } from 'react';
import { Send, Globe, Smile, MoreHorizontal, CheckCircle, Search, Menu, ListFilter, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const formatTime = (seconds) => {
  if (!seconds) return '00:00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const frames = Math.floor((seconds % 1) * 30).toString().padStart(2, '0'); // assuming 30fps
  return `${h}:${m}:${s}:${frames}`;
};

const formatRelativeTime = (dateStr) => {
  const fromNow = dayjs(dateStr).fromNow(true);
  return fromNow
    .replace(' a few seconds', 'now')
    .replace(' seconds', 's')
    .replace('a minute', '1m')
    .replace(' minutes', 'm')
    .replace('an hour', '1h')
    .replace(' hours', 'h')
    .replace('a day', '1d')
    .replace(' days', 'd')
    .replace('a month', '1mo')
    .replace(' months', 'mo');
};

export const CommentSidebar = ({ comments, currentTime, onAddComment, onCommentClick, currentUserIdentity, onDeleteComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div className="w-full h-full bg-[#0e0f14] flex flex-col font-sans">
      {/* Top Tabs */}
      <div className="flex items-center gap-2 p-3 pb-2 border-b border-white/5">
        <button className="flex-1 py-1.5 bg-[#2c2d3c] text-white text-sm font-medium rounded-md transition-colors">
          Comments
        </button>
        <button className="flex-1 py-1.5 text-zinc-400 text-sm font-medium rounded-md hover:bg-white/5 hover:text-white transition-colors">
          Fields
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="bg-[#1242a6] text-white text-xs font-semibold px-2 py-1 rounded">
          All comments
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <Menu className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <ListFilter className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center mt-10 bg-[#1a1b23] p-4 rounded-xl border border-white/5">
            No comments yet. Pause the video to add one!
          </div>
        ) : (
          [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((comment, index) => {
            const isMine = currentUserIdentity?.isClient 
              ? comment.author_name === currentUserIdentity.name 
              : (comment.user_id ? comment.user_id === currentUserIdentity?.id : comment.author_name === currentUserIdentity?.name);
            
            const avatarInitials = (comment.author_name || comment.author || 'U').substring(0, 2).toUpperCase();

            return (
              <div key={comment.id} className="flex gap-3 mb-4 group relative">
                {/* Unread dot + Avatar */}
                <div className="flex flex-col items-center mt-1 relative pl-2">
                  {/* Unread indicator - visible on newest or randomly for design, here we just show it for all for demo, or remove it */}
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute left-0 top-3"></div>
                  <div className="w-8 h-8 rounded-full bg-[#E57352] text-white flex items-center justify-center text-[10px] font-bold tracking-wider">
                    {avatarInitials}
                  </div>
                </div>
                
                {/* Content Box */}
                <div 
                  onClick={() => onCommentClick(comment)}
                  className="flex-1 bg-[#1c1d27] border border-white/5 rounded-xl p-3 cursor-pointer hover:bg-[#232430] transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-zinc-100">{comment.author_name || comment.author}</span>
                      <span className="text-[11px] text-zinc-500 font-medium">{formatRelativeTime(comment.created_at)}</span>
                      {/* Optional edited badge */}
                      {/* <span className="text-[11px] text-zinc-500 font-medium ml-1 flex items-center gap-1">• Edited</span> */}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="text-[11px] font-medium">#{index + 1}</span>
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className="text-[11px] font-mono bg-[#322a1d] text-[#e0a83a] px-1.5 py-0.5 rounded font-medium tracking-tight mt-0.5 whitespace-nowrap">
                      {formatTime(comment.timestamp)}
                    </span>
                    <p className="text-[13px] text-zinc-300 leading-snug flex-1 break-words">
                      {comment.comment_text}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[12px] font-bold text-zinc-300 hover:text-white transition-colors">Reply</span>
                    <div className="flex items-center gap-2.5 text-zinc-400">
                      <Smile className="w-4 h-4 hover:text-white transition-colors" />
                      {isMine ? (
                        <Trash2 
                          className="w-4 h-4 hover:text-red-400 transition-colors" 
                          onClick={(e) => { e.stopPropagation(); onDeleteComment(comment.id); }} 
                          title="Delete comment"
                        />
                      ) : (
                        <MoreHorizontal className="w-4 h-4 hover:text-white transition-colors" />
                      )}
                      <CheckCircle className="w-4 h-4 hover:text-green-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-[#14151b]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="text-[11px] text-zinc-400 flex justify-between px-1 mb-1 font-medium">
            <span>Adding comment at:</span>
            <span className="font-mono text-indigo-400">{formatTime(currentTime)}</span>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-[#1c1d27] border border-white/10 rounded-xl p-3 pr-10 text-[13px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none shadow-inner transition-colors"
              rows={2}
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
              className="absolute bottom-2 right-2 text-zinc-400 hover:text-indigo-400 disabled:opacity-50 disabled:hover:text-zinc-500 transition-colors bg-white/5 p-1.5 rounded-lg hover:bg-white/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentSidebar;
