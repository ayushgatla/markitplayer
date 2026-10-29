import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Share2, Edit2, UserPlus, Check, ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
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
    <header className="h-14 sm:h-16 border-b border-white/[0.08] bg-[#0e0e11] flex items-center justify-between px-2.5 sm:px-6 text-zinc-100 gap-1.5 sm:gap-2 shrink-0">
      <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
        {!isClient ? (
          <button
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.08] flex items-center justify-center shrink-0 shadow-sm transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-zinc-900/90 border border-white/[0.08] text-zinc-300 flex items-center justify-center shrink-0 shadow-sm">
            {isYouTube ? (
              <img src="/youtube.png" alt="YouTube" className="w-4 h-4 object-contain" />
            ) : isDrive ? (
              <img src="/drive.png" alt="Drive" className="w-4 h-4 object-contain" />
            ) : isInstagram ? (
              <img src="/instagram.png" alt="Instagram" className="w-4 h-4 object-contain" />
            ) : (
              <Film size={15} className="text-zinc-400" />
            )}
          </div>
        )}

        {isEditing && !isClient ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="font-medium text-xs bg-zinc-900 border border-purple-500/50 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 text-white w-48 sm:w-64 max-w-full"
          />
        ) : (
          <div
            className={`flex items-center gap-1.5 group min-w-0 ${!isClient ? 'cursor-pointer' : ''}`}
            onClick={() => !isClient && setIsEditing(true)}
            title={!isClient ? "Click to rename" : ""}
          >
            <h1 className="font-medium text-xs sm:text-sm text-zinc-200 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[240px] md:max-w-xs group-hover:text-white transition-colors">
              {title}
            </h1>
            {!isClient && <Edit2 size={12} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden xs:inline" />}
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

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {!isClient && (
          <>
            {onUpdateLink && (
              <div
                className="hidden md:flex items-center rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-900/90 shadow-sm"
                title="Add new video version"
              >
                <button 
                  onClick={() => onUpdateLink('drive')}
                  className="flex items-center justify-center px-2.5 py-1.5 hover:bg-white/[0.08] transition-colors"
                  title="Add Google Drive version"
                >
                  <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain opacity-80 hover:opacity-100" />
                </button>
                <div className="w-[1px] h-4 bg-white/[0.08]" />
                <button 
                  onClick={() => onUpdateLink('youtube')}
                  className="flex items-center justify-center px-2.5 py-1.5 hover:bg-white/[0.08] transition-colors"
                  title="Add YouTube version"
                >
                  <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain opacity-80 hover:opacity-100" />
                </button>
              </div>
            )}
            <button
              onClick={handleCopyClientLink}
              title={copied ? "Link copied!" : "Copy client invite link"}
              className="flex items-center gap-1.5 sm:gap-2 text-xs text-zinc-900 font-semibold transition-all bg-white hover:bg-zinc-200 px-2.5 sm:px-3 py-1.5 rounded-lg shadow-sm shrink-0 cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-purple-600 font-bold" /> : <UserPlus className="w-3.5 h-3.5 text-zinc-900" />}
              <span className="hidden sm:inline">{copied ? 'Copied Link' : 'Add Client'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default ProjectHeader;

