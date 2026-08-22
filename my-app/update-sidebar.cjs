const fs = require('fs');

const content = `import React, { useState, useRef } from 'react';
import { Send, Globe, MoreHorizontal, CheckCircle, Search, Menu, ListFilter, Trash2, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const formatTime = (seconds) => {
  if (!seconds || seconds === -1) return '00:00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const frames = Math.floor((seconds % 1) * 30).toString().padStart(2, '0'); // assuming 30fps
  return \`\${h}:\${m}:\${s}:\${frames}\`;
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

const baseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD
  ? 'https://markitplayer-production-80fd.up.railway.app'
  : 'http://localhost:3001');

// Parse markdown image syntax ![alt](url)
const renderTextWithImages = (text) => {
  const parts = text.split(/(!\\[.*?\\]\\(.*?\\))/g);
  return parts.map((part, index) => {
    const match = part.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
    if (match) {
      return (
        <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={match[2]} alt={match[1] || 'Attached image'} className="max-w-full rounded-md border border-white/10 max-h-48 object-cover" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const CommentSidebar = ({ comments, currentTime, onAddComment, onCommentClick, currentUserIdentity, onDeleteComment, onToggleResolve }) => {
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [inlineReplyingTo, setInlineReplyingTo] = useState(null);
  const [inlineReplyText, setInlineReplyText] = useState('');

  const [mainImageFile, setMainImageFile] = useState(null);
  const [inlineImageFile, setInlineImageFile] = useState(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);

  const mainFileInputRef = useRef(null);
  const inlineFileInputRef = useRef(null);

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(\`\${baseUrl}/api/upload-image\`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      return data.url; // webViewLink
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Make sure the Drive folder ID is set in the backend.');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !mainImageFile) return;
    
    let finalComment = newComment.trim();
    
    if (mainImageFile) {
      setIsUploadingMain(true);
      const imageUrl = await uploadImage(mainImageFile);
      setIsUploadingMain(false);
      if (!imageUrl) return; // Stop if upload failed
      finalComment += \`\\n\\n![image](\${imageUrl})\`;
    }

    onAddComment(finalComment, activeTab === 'chat');
    setNewComment('');
    setMainImageFile(null);
  };

  const handleInlineReplySubmit = async (e, parentId) => {
    e.preventDefault();
    if (!inlineReplyText.trim() && !inlineImageFile) return;
    
    let finalComment = inlineReplyText.trim();

    if (inlineImageFile) {
      setIsUploadingInline(true);
      const imageUrl = await uploadImage(inlineImageFile);
      setIsUploadingInline(false);
      if (!imageUrl) return;
      finalComment += \`\\n\\n![image](\${imageUrl})\`;
    }

    onAddComment(finalComment, activeTab === 'chat', parentId);
    setInlineReplyText('');
    setInlineReplyingTo(null);
    setInlineImageFile(null);
  };

  return (
    <div className="w-full h-full bg-[#0e0f14] flex flex-col font-sans">
      {/* Top Tabs */}
      <div className="flex items-center gap-2 p-3 pb-2 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('comments')}
          className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${activeTab === 'comments' ? 'bg-[#2c2d3c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}\`}
        >
          Comments
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={\`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors \${activeTab === 'chat' ? 'bg-[#2c2d3c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}\`}
        >
          Chat
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="bg-[#1242a6] text-white text-xs font-semibold px-2 py-1 rounded">
          All {activeTab}
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <Menu className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <ListFilter className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Comments/Chat List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {(() => {
          const parsedComments = comments.map(c => {
            const match = c.comment_text.match(/^___REPLY:([a-zA-Z0-9-]+)___(.*)/s);
            if (match) {
              return { ...c, isReply: true, parentId: match[1], cleanText: match[2] };
            }
            return { ...c, isReply: false, cleanText: c.comment_text };
          });

          const getReplies = (parentId) => {
            return parsedComments.filter(c => c.isReply && c.parentId === parentId)
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          };

          const displayComments = parsedComments
            .filter(c => !c.isReply && (activeTab === 'chat' ? c.timestamp === -1 : c.timestamp !== -1))
            .sort((a, b) => {
              if (activeTab === 'comments') {
                return a.timestamp - b.timestamp;
              }
              return new Date(a.created_at) - new Date(b.created_at);
            });

          if (displayComments.length === 0) {
            return (
              <div className="text-zinc-500 text-sm text-center mt-10 bg-[#1a1b23] p-4 rounded-xl border border-white/5">
                No {activeTab === 'chat' ? 'messages' : 'comments'} yet. {activeTab === 'comments' && 'Pause the video to add one!'}
              </div>
            );
          }

          return displayComments.map((comment, index) => {
            const isMine = currentUserIdentity?.isClient 
              ? comment.author_name === currentUserIdentity.name 
              : (comment.user_id ? comment.user_id === currentUserIdentity?.id : comment.author_name === currentUserIdentity?.name);
            
            const avatarInitials = (comment.author_name || comment.author || 'U').substring(0, 2).toUpperCase();
            const replies = getReplies(comment.id);

            return (
              <div key={comment.id} className="flex flex-col mb-4">
                <div className="flex gap-3 group relative">
                  {/* Unread dot + Avatar */}
                  <div className="flex flex-col items-center mt-1 relative pl-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute left-0 top-3"></div>
                    <div className="w-8 h-8 rounded-full bg-[#E57352] text-white flex items-center justify-center text-[10px] font-bold tracking-wider">
                      {avatarInitials}
                    </div>
                  </div>
                  
                  {/* Content Box */}
                  <div 
                    onClick={() => activeTab === 'comments' && onCommentClick(comment)}
                    className={\`flex-1 border rounded-xl p-3 \${activeTab === 'comments' ? 'cursor-pointer hover:bg-[#232430]' : ''} transition-colors shadow-sm \${
                      comment.resolved && activeTab === 'comments'
                        ? 'bg-[#1b3323] border-[#295c3c] hover:bg-[#213e2b]'
                        : 'bg-[#1c1d27] border-white/5'
                    }\`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-zinc-100">{comment.author_name || comment.author}</span>
                        <span className="text-[11px] text-zinc-500 font-medium">{formatRelativeTime(comment.created_at)}</span>
                      </div>
                      {activeTab === 'comments' && (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <span className="text-[11px] font-medium">#{index + 1}</span>
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-2.5 mb-3">
                      {activeTab === 'comments' && (
                        <span className="text-[11px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium tracking-tight mt-0.5 whitespace-nowrap">
                          {formatTime(comment.timestamp)}
                        </span>
                      )}
                      <p className="text-[13px] text-zinc-300 leading-snug flex-1 break-words whitespace-pre-wrap">
                        {renderTextWithImages(comment.cleanText)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span 
                        className="text-[12px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInlineReplyingTo(comment.id);
                          setInlineReplyText('');
                          setInlineImageFile(null);
                        }}
                      >
                        Reply
                      </span>
                      <div className="flex items-center gap-2.5 text-zinc-400">
                        {isMine ? (
                          <Trash2 
                            className="w-4 h-4 hover:text-red-400 transition-colors cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); onDeleteComment(comment.id); }} 
                            title="Delete"
                          />
                        ) : (
                          <MoreHorizontal className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                        )}
                        {activeTab === 'comments' && (
                          <CheckCircle 
                            className={\`w-4 h-4 transition-colors cursor-pointer \${comment.resolved ? 'text-green-400 hover:text-green-300' : 'hover:text-green-400'}\`} 
                            onClick={(e) => { e.stopPropagation(); onToggleResolve && onToggleResolve(comment.id); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies Section */}
                {replies.length > 0 && (
                  <div className="ml-11 mt-3 flex flex-col gap-3 border-l-2 border-white/10 pl-3">
                    {replies.map(reply => {
                      const isMineReply = currentUserIdentity?.isClient 
                        ? reply.author_name === currentUserIdentity.name 
                        : (reply.user_id ? reply.user_id === currentUserIdentity?.id : reply.author_name === currentUserIdentity?.name);
                      const avatarInitialsReply = (reply.author_name || reply.author || 'U').substring(0, 2).toUpperCase();
                      
                      return (
                        <div key={reply.id} className="flex gap-3 group relative">
                          <div className="w-6 h-6 rounded-full bg-[#E57352] text-white flex items-center justify-center text-[9px] font-bold tracking-wider shrink-0 mt-1">
                            {avatarInitialsReply}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-[12px] text-zinc-100">{reply.author_name || reply.author}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">{formatRelativeTime(reply.created_at)}</span>
                            </div>
                            <p className="text-[12px] text-zinc-300 leading-snug flex-1 break-words whitespace-pre-wrap">
                              {renderTextWithImages(reply.cleanText)}
                            </p>
                            
                            <div className="flex items-center justify-between mt-1.5">
                              <span 
                                className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineReplyingTo(comment.id);
                                  setInlineReplyText(\`@\${reply.author_name || reply.author} \`);
                                  setInlineImageFile(null);
                                }}
                              >
                                Reply
                              </span>
                              {isMineReply && (
                                <Trash2 
                                  className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer" 
                                  onClick={(e) => { e.stopPropagation(); onDeleteComment(reply.id); }} 
                                  title="Delete"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Inline Reply Input */}
                {inlineReplyingTo === comment.id && (
                  <div className="ml-11 mt-3 flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold tracking-wider shrink-0 mt-1">
                        {(currentUserIdentity?.name || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <form onSubmit={(e) => handleInlineReplySubmit(e, comment.id)} className="flex-1 relative">
                      <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={inlineFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setInlineImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-full bg-[#1c1d27] border border-white/10 rounded-lg shadow-inner overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                        {inlineImageFile && (
                          <div className="p-2 border-b border-white/5 relative bg-[#14151b]">
                            <img src={URL.createObjectURL(inlineImageFile)} alt="preview" className="h-16 rounded object-cover" />
                            <button 
                              type="button"
                              onClick={() => setInlineImageFile(null)}
                              className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-zinc-300 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <textarea
                          className="w-full bg-transparent p-2 pr-16 text-[12px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
                          rows={1}
                          placeholder="Add a reply..."
                          value={inlineReplyText}
                          onChange={(e) => setInlineReplyText(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleInlineReplySubmit(e, comment.id);
                            }
                          }}
                        />
                      </div>
                      <div className="absolute bottom-1 right-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => inlineFileInputRef.current?.click()}
                          className="text-zinc-400 hover:text-indigo-400 p-1 rounded-md transition-colors"
                          title="Attach Image"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="submit"
                          disabled={(!inlineReplyText.trim() && !inlineImageFile) || isUploadingInline}
                          className="text-zinc-400 hover:text-indigo-400 disabled:opacity-50 disabled:hover:text-zinc-500 p-1 rounded-md transition-colors"
                        >
                          {isUploadingInline ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineReplyingTo(null);
                          setInlineImageFile(null);
                        }}
                        className="absolute -bottom-5 right-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-[#14151b]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {activeTab === 'comments' && (
            <div className="text-[11px] text-zinc-400 flex justify-between px-1 mb-1 font-medium">
              <span>Adding comment at:</span>
              <span className="font-mono text-indigo-400">{formatTime(currentTime)}</span>
            </div>
          )}
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            ref={mainFileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setMainImageFile(e.target.files[0]);
              }
            }}
          />
          <div className="relative bg-[#1c1d27] border border-white/10 rounded-xl shadow-inner focus-within:border-indigo-500/50 transition-colors overflow-hidden">
            {mainImageFile && (
              <div className="p-3 border-b border-white/5 relative bg-[#14151b]">
                <img src={URL.createObjectURL(mainImageFile)} alt="preview" className="h-24 rounded-lg object-cover" />
                <button 
                  type="button"
                  onClick={() => setMainImageFile(null)}
                  className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-zinc-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <textarea
              className="w-full bg-transparent p-3 pr-20 text-[13px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
              rows={2}
              placeholder={\`Type your \${activeTab === 'chat' ? 'message' : 'comment'}...\`}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/5 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => mainFileInputRef.current?.click()}
                className="text-zinc-400 hover:text-indigo-400 hover:bg-white/10 p-1.5 rounded-md transition-colors"
                title="Attach Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={(!newComment.trim() && !mainImageFile) || isUploadingMain}
                className="text-zinc-400 hover:text-indigo-400 disabled:opacity-50 disabled:hover:text-zinc-500 hover:bg-white/10 p-1.5 rounded-md transition-colors"
              >
                {isUploadingMain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentSidebar;
`;

fs.writeFileSync('/home/ayush/Projects/Feedplayer/my-app/src/components/CommentSidebar.jsx', content);
