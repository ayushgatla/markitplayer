import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { parseVideoData } from '../utils/versionHelper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const VersionDropdown = ({
  videoUrl,
  onSwitchVersion,
  onOpenAddVersion,
  onDeleteVersion,
  isClient = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const videoData = parseVideoData(videoUrl);
  const versions = videoData.versions || [];
  const currentVersionNum = videoData.currentVersion || 1;
  const activeVersionObj = versions.find(v => v.version === currentVersionNum) || versions[versions.length - 1];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (versions.length === 0) {
    return null;
  }

  const getPlatformLabel = (platform, url) => {
    if (platform === 'drive' || url?.includes('drive.google.com')) return 'Drive';
    if (platform === 'youtube' || url?.includes('youtube.com') || url?.includes('youtu.be')) return 'YouTube';
    return 'Video';
  };

  const handleSelectVersion = (versionNum) => {
    if (onSwitchVersion) {
      onSwitchVersion(versionNum);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Studio Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/[0.08] transition-colors cursor-pointer shadow-sm"
        title="Switch version"
      >
        <span className="font-mono text-[11px] text-zinc-100">{activeVersionObj?.title || `V${currentVersionNum}`}</span>
        <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Studio Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-[#141417] border border-white/[0.1] rounded-xl shadow-2xl z-[150] overflow-hidden py-1 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/[0.06] flex items-center justify-between">
            <span>Versions</span>
            <span className="font-mono text-zinc-500">{versions.length} total</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
            {versions
              .slice()
              .reverse()
              .map((ver) => {
                const isActive = ver.version === currentVersionNum;
                return (
                  <div
                    key={ver.version}
                    onClick={() => handleSelectVersion(ver.version)}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors group ${
                      isActive ? 'bg-purple-500/15 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-4 flex items-center justify-center shrink-0">
                        {isActive && <Check size={13} className="text-purple-400 font-bold" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`truncate ${isActive ? 'font-semibold text-white' : 'text-zinc-300'}`}>
                            {ver.title || `Version ${ver.version}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                          <span>{getPlatformLabel(ver.platform, ver.url)}</span>
                          <span>•</span>
                          <span>{ver.created_at ? dayjs(ver.created_at).fromNow() : 'Original'}</span>
                        </div>
                      </div>
                    </div>

                    {!isClient && versions.length > 1 && onDeleteVersion && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete ${ver.title || `V${ver.version}`}?`)) {
                            onDeleteVersion(ver.version);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-all ml-1"
                        title="Delete version"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {!isClient && onOpenAddVersion && (
            <div className="border-t border-white/[0.06] p-1 bg-zinc-950/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddVersion('drive');
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors font-medium cursor-pointer"
              >
                <Plus size={13} className="text-zinc-400" />
                <span>Add new version</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionDropdown;
