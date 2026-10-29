import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Layers, Check, Plus, Trash2, ChevronDown, ChevronUp, MessageSquare, Clock, Film } from 'lucide-react';
import { parseVideoData } from '../utils/versionHelper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const RoomVersionBox = ({
  videoUrl,
  currentVersionNum = 1,
  onSwitchVersion,
  onOpenAddVersion,
  onDeleteVersion,
  isClient = false,
  comments = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  const videoData = parseVideoData(videoUrl);
  const versions = videoData.versions || [];
  const activeVerNum = currentVersionNum || videoData.currentVersion || 1;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Compute comment counts per version
  const commentsCountByVersion = useMemo(() => {
    const counts = {};
    (comments || []).forEach(c => {
      if (c.timestamp === -1) return; // ignore general chat
      const match = c.comment_text?.match(/^___VER:(\d+)___/);
      const ver = match ? parseInt(match[1], 10) : 1;
      counts[ver] = (counts[ver] || 0) + 1;
    });
    return counts;
  }, [comments]);

  if (versions.length === 0) {
    return null;
  }

  const getPlatformInfo = (ver) => {
    const platform = ver.platform;
    const url = ver.url || '';
    if (platform === 'drive' || url.includes('drive.google.com')) {
      return { label: 'Google Drive', icon: '/drive.png', isCustomIcon: true };
    }
    if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      return { label: 'YouTube', icon: '/youtube.png', isCustomIcon: true };
    }
    return { label: 'Video', icon: null, isCustomIcon: false };
  };

  const handleSelect = (verNum) => {
    if (verNum === activeVerNum) return;
    if (onSwitchVersion) {
      onSwitchVersion(verNum);
    }
    setIsExpanded(false);
  };

  const handleDelete = (e, ver) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${ver.title || `V${ver.version}`}? This cannot be undone.`)) {
      if (onDeleteVersion) {
        onDeleteVersion(ver.version);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#0e0e11] border-b border-white/[0.08] px-3 sm:px-6 py-2 flex items-center justify-between text-xs text-white z-30 relative shrink-0 select-none shadow-sm"
    >
      {/* Left: Versions Header & Horizontal Pills */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto scrollbar-none py-0.5">
        {/* Badge Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-white/[0.08] text-zinc-300 rounded-lg shrink-0">
          <Layers size={13} className="text-zinc-400" />
          <span className="font-medium tracking-wide text-[11px] uppercase">
            Versions
          </span>
          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded-md font-mono">
            {versions.length}
          </span>
        </div>

        {/* Version Pills Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {versions.map((ver) => {
            const isActive = ver.version === activeVerNum;
            const commentsCount = commentsCountByVersion[ver.version] || 0;
            return (
              <button
                key={ver.version}
                type="button"
                onClick={() => handleSelect(ver.version)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer shrink-0 font-medium ${
                  isActive
                    ? 'bg-purple-600 text-white border border-purple-400/30 shadow-sm'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08]'
                }`}
                title={`Switch to ${ver.title || `V${ver.version}`}${commentsCount > 0 ? ` (${commentsCount} comments)` : ''}`}
              >
                {isActive && <Check size={12} className="text-white font-bold" />}
                <span className="font-mono text-[11px] tracking-tight">
                  {ver.title || `V${ver.version}`}
                </span>
                {commentsCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-purple-950/80 text-purple-200' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {commentsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Add Version Button & Details Drawer Expander */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {!isClient && onOpenAddVersion && (
          <button
            type="button"
            onClick={() => onOpenAddVersion('drive')}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-900 text-[11px] font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Upload or link a new video version"
          >
            <Plus size={12} className="stroke-[2.5]" />
            <span className="hidden sm:inline">Add Version</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.08] rounded-lg transition-colors cursor-pointer text-[11px] ${
            isExpanded ? 'bg-zinc-800 text-white border-white/[0.15]' : ''
          }`}
          title={isExpanded ? 'Collapse version list' : 'View full version list and details'}
        >
          <span className="hidden md:inline">Details</span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Expanded Detailed Version Dropdown Panel */}
      {isExpanded && (
        <div className="absolute top-full left-2 sm:left-6 mt-1.5 w-[calc(100vw-16px)] max-w-sm sm:max-w-md bg-[#141417]/98 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-zinc-950/60 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Room Video Versions
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {versions.length} available
            </span>
          </div>

          {/* Versions List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
            {versions
              .slice()
              .reverse()
              .map((ver) => {
                const isActive = ver.version === activeVerNum;
                const platformInfo = getPlatformInfo(ver);
                const commentsCount = commentsCountByVersion[ver.version] || 0;

                return (
                  <div
                    key={ver.version}
                    onClick={() => handleSelect(ver.version)}
                    className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 group ${
                      isActive
                        ? 'bg-purple-500/10 border-l-2 border-purple-500'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Platform Icon & Main Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center shrink-0">
                        {platformInfo.isCustomIcon ? (
                          <img
                            src={platformInfo.icon}
                            alt={platformInfo.label}
                            className="w-4 h-4 object-contain"
                          />
                        ) : (
                          <Film size={14} className="text-zinc-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-xs truncate ${isActive ? 'text-white font-semibold' : 'text-zinc-300 group-hover:text-white'}`}>
                            {ver.title || `Version ${ver.version}`}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md shrink-0 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 font-mono">
                          <span>{platformInfo.label}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {ver.created_at ? dayjs(ver.created_at).fromNow() : 'Original'}
                          </span>
                          {commentsCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-zinc-300">
                                <MessageSquare size={10} />
                                {commentsCount}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on item */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(ver.version);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-white/[0.08] rounded-lg transition-colors cursor-pointer"
                        >
                          Switch
                        </button>
                      )}

                      {!isClient && versions.length > 1 && onDeleteVersion && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, ver)}
                          className="p-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title={`Delete ${ver.title || `V${ver.version}`}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer Quick Add Actions (Host only) */}
          {!isClient && onOpenAddVersion && (
            <div className="p-2 bg-zinc-950/60 border-t border-white/[0.06] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenAddVersion('drive');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium bg-zinc-900 hover:bg-zinc-850 border border-white/[0.08] text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                <span>+ Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenAddVersion('youtube');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium bg-zinc-900 hover:bg-zinc-850 border border-white/[0.08] text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                <span>+ YouTube</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomVersionBox;
