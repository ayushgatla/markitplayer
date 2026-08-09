import React, { useState, useRef, useEffect } from 'react';
import { Film, Share2, Edit2, UserPlus, Check } from 'lucide-react';

export const ProjectHeader = ({ title, onRename, isClient, roomId, onUpdateLink, videoUrl }) => {
  const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
  const isDrive = videoUrl && videoUrl.includes('drive.google.com');
  const isInstagram = videoUrl && videoUrl.includes('instagram.com');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editTitle.trim() !== title && editTitle.trim() !== '') {
      if (onRename) onRename(editTitle.trim());
    } else {
      setEditTitle(title);
    }

  };
  //temp
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(title);
    }
  };

  const handleCopyClientLink = () => {
    if (!roomId) return;
    const clientLink = `${window.location.origin}/room/${roomId}/client`;
    navigator.clipboard.writeText(clientLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="h-14 sm:h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 sm:px-6 text-zinc-100 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          {isYouTube ? (
            <img src="/youtube.png" alt="YouTube" className="w-5 h-5 object-contain" />
          ) : isDrive ? (
            <img src="/drive.png" alt="Drive" className="w-5 h-5 object-contain" />
          ) : isInstagram ? (
            <img src="/instagram.png" alt="Instagram" className="w-5 h-5 object-contain" />
          ) : (
            <Film size={18} />
          )}
        </div>

        {isEditing && !isClient ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="font-medium bg-zinc-900 border border-indigo-500 rounded px-2 py-1 focus:outline-none text-white w-64 max-w-full"
          />
        ) : (
          <div
            className={`flex items-center gap-2 group min-w-0 ${!isClient ? 'cursor-pointer' : ''}`}
            onClick={() => !isClient && setIsEditing(true)}
            title={!isClient ? "Click to rename" : ""}
          >
            <h1 className="font-medium truncate max-w-[300px]">{title}</h1>
            {!isClient && <Edit2 size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </div>
        )}

        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-1 sm:ml-2 shrink-0">V2.1</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {!isClient && (
          <>
            {onUpdateLink && (
              <div
                className="group flex items-center rounded-lg overflow-hidden border border-zinc-700/50 transition-all opacity-80 hover:opacity-100 hover:scale-105 shrink-0"
                title="Update video link for a new version"
              >
                <button 
                  onClick={() => onUpdateLink('drive')}
                  className="flex items-center justify-center px-3 py-1.5 bg-green-500/20 hover:bg-green-500/40 transition-colors"
                >
                  <img src="/drive.png" alt="Drive" className="w-4 h-4 object-contain drop-shadow-md" />
                </button>
                <button 
                  onClick={() => onUpdateLink('youtube')}
                  className="flex items-center justify-center px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 transition-colors"
                >
                  <img src="/youtube.png" alt="YouTube" className="w-4 h-4 object-contain drop-shadow-md" />
                </button>
              </div>
            )}
            <button
              onClick={handleCopyClientLink}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-300 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-700/50 shrink-0"
            >
              {copied ? <Check className="w-4 h-4 sm:w-4 sm:h-4 text-green-400" /> : <UserPlus className="w-4 h-4 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied Link' : 'Add Client'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default ProjectHeader;
