import React, { useState, useRef } from 'react';
import { Send, Globe, MoreHorizontal, CheckCircle, Search, Menu, ListFilter, Trash2, Image as ImageIcon, X, Loader2, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { supabase } from '../supabaseClient';
import { extractDrawingFromText, injectDrawingIntoText } from '../utils/drawingHelper';

dayjs.extend(relativeTime);

const formatTime = (seconds) => {
  if (!seconds || seconds === -1) return '00:00:00:00';
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

// Parse markdown image syntax ![alt](url)
const renderTextWithImages = (text) => {
  if (!text) return null;
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    const match = part.match(/^!\[(.*?)\]\((.*?)\)$/);
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

export const CommentSidebar = ({
  comments,
  currentTime,
  onAddComment,
  onCommentClick,
  currentUserIdentity,
  onDeleteComment,
  onToggleResolve,
  currentVersionNum = 1,
  rawVideoUrl,
  attachedDrawing = [],
  onOpenDrawing,
  onClearAttachedDrawing,
  activeCommentId = null
}) => {
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [inlineReplyingTo, setInlineReplyingTo] = useState(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [versionFilter, setVersionFilter] = useState('all'); // 'all' | 'current' | number
  const [showVersionFilterMenu, setShowVersionFilterMenu] = useState(false);

  const [mainImageFile, setMainImageFile] = useState(null);
  const [inlineImageFile, setInlineImageFile] = useState(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);

  const mainFileInputRef = useRef(null);
  const inlineFileInputRef = useRef(null);

  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image. Make sure the Supabase storage bucket "chat-images" is created and public.');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasDrawing = attachedDrawing && attachedDrawing.length > 0;
    if (!newComment.trim() && !mainImageFile && !hasDrawing) return;
    
    let finalComment = newComment.trim();
    
    if (mainImageFile) {
      setIsUploadingMain(true);
      const imageUrl = await uploadImage(mainImageFile);
      setIsUploadingMain(false);
      if (!imageUrl) return; // Stop if upload failed
      finalComment += `\n\n![image](${imageUrl})`;
    }

    if (hasDrawing && activeTab === 'comments') {
      finalComment = injectDrawingIntoText(finalComment, { v: 1, strokes: attachedDrawing });
    }

    onAddComment(finalComment, activeTab === 'chat');
    setNewComment('');
    setMainImageFile(null);
    if (onClearAttachedDrawing) {
      onClearAttachedDrawing();
    }
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
      finalComment += `\n\n![image](${imageUrl})`;
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
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'comments' ? 'bg-[#2c2d3c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
        >
          Comments
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-[#2c2d3c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
        >
          Chat
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 relative text-xs">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowVersionFilterMenu(!showVersionFilterMenu)}
            className="text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>
              {versionFilter === 'all'
                ? `All ${activeTab}`
                : `V${currentVersionNum} only`}
            </span>
            <ListFilter className="w-3 h-3 text-zinc-400" />
          </button>

          {showVersionFilterMenu && (
            <div className="absolute top-full left-4 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 w-44">
              <button
                type="button"
                onClick={() => { setVersionFilter('all'); setShowVersionFilterMenu(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${versionFilter === 'all' ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}
              >
                <span>All Versions</span>
                {versionFilter === 'all' && <span>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => { setVersionFilter('current'); setShowVersionFilterMenu(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${versionFilter === 'current' ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}
              >
                <span>V{currentVersionNum} only</span>
                {versionFilter === 'current' && <span>✓</span>}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <Search className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Comments/Chat List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {(() => {
          const parsedComments = comments.map(c => {
            let text = c.comment_text || '';
            let version = null;
            let isReply = false;
            let parentId = null;

            // Extract drawing first
            const { cleanText: textAfterDrawing, drawingData } = extractDrawingFromText(text);
            text = textAfterDrawing;

            // Check reply prefix
            const replyMatch = text.match(/^___REPLY:([a-zA-Z0-9-]+)___(.*)/s);
            if (replyMatch) {
              isReply = true;
              parentId = replyMatch[1];
              text = replyMatch[2];
            }

            // Check version prefix
            const verMatch = text.match(/^___VER:(\d+)___(.*)/s);
            if (verMatch) {
              version = parseInt(verMatch[1], 10);
              text = verMatch[2];
            }

            return { ...c, isReply, parentId, version, drawingData, cleanText: text };
          });

          const getReplies = (parentId) => {
            return parsedComments.filter(c => c.isReply && c.parentId === parentId)
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          };

          const displayComments = parsedComments
            .filter(c => {
              if (c.isReply) return false;
              if (activeTab === 'chat') {
                return c.timestamp === -1;
              }
              if (c.timestamp === -1) return false;

              // Apply version filter if set
              if (versionFilter === 'current' && c.version && c.version !== currentVersionNum) {
                return false;
              }
              if (typeof versionFilter === 'number' && c.version && c.version !== versionFilter) {
                return false;
              }
              return true;
            })
            .sort((a, b) => {
              if (activeTab === 'comments') {
                return a.timestamp - b.timestamp;
              }
              return new Date(a.created_at) - new Date(b.created_at);
            });

          if (displayComments.length === 0) {
            return (
              <div className="text-zinc-500 text-sm text-center mt-10 bg-[#1a1b23] p-4 rounded-xl border border-white/5">
                No {activeTab === 'chat' ? 'messages' : 'comments'} yet. {activeTab === 'comments' && 'Pause the video to add one or draw on the frame!'}
              </div>
            );
          }

          return displayComments.map((comment, index) => {
            const isMine = currentUserIdentity?.isClient 
              ? comment.author_name === currentUserIdentity.name 
              : (comment.user_id ? comment.user_id === currentUserIdentity?.id : comment.author_name === currentUserIdentity?.name);
            
            const avatarInitials = (comment.author_name || comment.author || 'U').substring(0, 2).toUpperCase();
            const replies = getReplies(comment.id);
            const isSelected = activeCommentId === comment.id;
            const hasDrawing = comment.drawingData?.strokes?.length > 0;

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
                    className={`flex-1 border rounded-xl p-3 ${
                      activeTab === 'comments' ? 'cursor-pointer hover:bg-[#232430]' : ''
                    } transition-all shadow-sm ${
                      isSelected
                        ? 'bg-[#252438] border-indigo-500/60 ring-1 ring-indigo-500/40'
                        : comment.resolved && activeTab === 'comments'
                          ? 'bg-[#1b3323] border-[#295c3c] hover:bg-[#213e2b]'
                          : 'bg-[#1c1d27] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-zinc-100">{comment.author_name || comment.author}</span>
                        <span className="text-[11px] text-zinc-500 font-medium">{formatRelativeTime(comment.created_at)}</span>
                      </div>
                      {activeTab === 'comments' && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          {hasDrawing && (
                            <span 
                              className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                              title={`${comment.drawingData.strokes.length} drawing annotations`}
                            >
                              <Pencil className="w-2.5 h-2.5 text-amber-400" />
                              <span>Drawing</span>
                            </span>
                          )}
                          {comment.version && (
                            <span className="text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-1.5 py-0.2 rounded font-mono">
                              v{comment.version}
                            </span>
                          )}
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
                      <div className="text-[13px] text-zinc-300 leading-snug flex-1 break-words whitespace-pre-wrap">
                        {renderTextWithImages(comment.cleanText)}
                        {!comment.cleanText && hasDrawing && (
                          <span className="italic text-zinc-400 text-xs">Visual drawing on this frame</span>
                        )}
                      </div>
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
                            className={`w-4 h-4 transition-colors cursor-pointer ${comment.resolved ? 'text-green-400 hover:text-green-300' : 'hover:text-green-400'}`} 
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
                                  setInlineReplyText(`@${reply.author_name || reply.author} `);
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
            <div className="text-[11px] text-zinc-400 flex justify-between px-1 mb-1 font-medium items-center">
              <span>Adding comment at:</span>
              <span className="font-mono text-indigo-400">{formatTime(currentTime)}</span>
            </div>
          )}

          {/* Attached Drawing Indicator Chip */}
          {activeTab === 'comments' && attachedDrawing && attachedDrawing.length > 0 && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs mb-1 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Pencil className="w-3 h-3 text-amber-400" />
                </div>
                <span className="font-medium">
                  Drawing attached ({attachedDrawing.length} {attachedDrawing.length === 1 ? 'shape' : 'shapes'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenDrawing && (
                  <button 
                    type="button" 
                    onClick={onOpenDrawing} 
                    className="text-[11px] font-semibold text-amber-300 hover:text-white underline transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {onClearAttachedDrawing && (
                  <button 
                    type="button" 
                    onClick={onClearAttachedDrawing} 
                    className="text-zinc-400 hover:text-red-400 p-0.5 rounded transition-colors"
                    title="Remove drawing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
              className="w-full bg-transparent p-3 pr-24 text-[13px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
              rows={2}
              placeholder={activeTab === 'chat' ? 'Type a chat message...' : (attachedDrawing?.length > 0 ? 'Add a note to your drawing (optional)...' : 'Type a comment or draw on frame...')}
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
              {/* Draw on Frame Button */}
              {activeTab === 'comments' && onOpenDrawing && (
                <button
                  type="button"
                  onClick={onOpenDrawing}
                  className={`p-1.5 rounded-md transition-colors ${
                    attachedDrawing?.length > 0 
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30' 
                      : 'text-zinc-400 hover:text-amber-400 hover:bg-white/10'
                  }`}
                  title="Draw on frame (P)"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

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
                disabled={(!newComment.trim() && !mainImageFile && (!attachedDrawing || attachedDrawing.length === 0)) || isUploadingMain}
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
