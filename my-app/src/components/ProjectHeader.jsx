import React, { useState, useRef, useEffect } from 'react';
import { Film, Share2, Edit2, UserPlus, Check } from 'lucide-react';
import VersionDropdown from './VersionDropdown';
import { getActiveVideoUrl, detectPlatform } from '../utils/versionHelper';

export const ProjectHeader = ({
  title,
  onRename,
  isClient,
  roomId,
  onUpdateLink,
  videoUrl,
  onSwitchVersion,
  onDeleteVersion
}) => {
  const activeUrl = getActiveVideoUrl(videoUrl);
  const platform = detectPlatform(activeUrl);
  const isYouTube = platform === 'youtube';
  const isDrive = platform === 'drive';
  const isInstagram = platform === 'instagram';

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
    <header className="h-14 sm:h-16 border-b border-purple-950/40 bg-[#0c0a14] flex items-center justify-between px-3 sm:px-6 text-zinc-100 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-none bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 shadow-sm">
          {isYouTube ? (
            <img src="/youtube.png" alt="YouTube" className="w-4 h-4 object-contain" />
          ) : isDrive ? (
            <img src="/drive.png" alt="Drive" className="w-4 h-4 object-contain" />
          ) : isInstagram ? (
            <img src="/instagram.png" alt="Instagram" className="w-4 h-4 object-contain" />
          ) : (
            <Film size={16} />
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
            className="font-semibold text-xs bg-[#07050e] border border-purple-500/60 rounded-none px-2 py-1 focus:outline-none text-white w-64 max-w-full"
          />
        ) : (
          <div
            className={`flex items-center gap-2 group min-w-0 ${!isClient ? 'cursor-pointer' : ''}`}
            onClick={() => !isClient && setIsEditing(true)}
            title={!isClient ? "Click to rename" : ""}
          >
            <h1 className="font-semibold text-xs sm:text-sm text-zinc-100 truncate max-w-[200px] sm:max-w-[300px] group-hover:text-purple-300 transition-colors">{title}</h1>
            {!isClient && <Edit2 size={13} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </div>
        )}

        {/* Version Switcher Dropdown */}
        <VersionDropdown
          videoUrl={videoUrl}
          onSwitchVersion={onSwitchVersion}
          onOpenAddVersion={onUpdateLink}
          onDeleteVersion={onDeleteVersion}
          isClient={isClient}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {!isClient && (
          <>
            {onUpdateLink && (
              <div
                className="flex items-center rounded-none overflow-hidden border border-purple-950/50 bg-[#07050e]"
                title="Add new video version"
              >
                <button 
                  onClick={() => onUpdateLink('drive')}
                  className="flex items-center justify-center px-2.5 py-1.5 hover:bg-white/5 transition-colors"
                  title="Add Google Drive version"
                >
                  <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain opacity-80 hover:opacity-100" />
                </button>
                <div className="w-[1px] h-4 bg-purple-950/60" />
                <button 
                  onClick={() => onUpdateLink('youtube')}
                  className="flex items-center justify-center px-2.5 py-1.5 hover:bg-white/5 transition-colors"
                  title="Add YouTube version"
                >
                  <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain opacity-80 hover:opacity-100" />
                </button>
              </div>
            )}
            <button
              onClick={handleCopyClientLink}
              className="flex items-center gap-1.5 sm:gap-2 text-xs text-black font-semibold transition-colors bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-none shadow-sm shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied Link' : 'Add Client'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default ProjectHeader;

