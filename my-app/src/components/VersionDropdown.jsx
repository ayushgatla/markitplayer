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
      {/* Minimal Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-none text-xs font-semibold bg-[#07050e] hover:bg-white/10 text-purple-300 hover:text-white border border-purple-950/50 transition-colors cursor-pointer"
        title="Switch version"
      >
        <span className="font-mono text-[11px]">{activeVersionObj?.title || `V${currentVersionNum}`}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Minimal Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 bg-[#0c0a14] border border-purple-950/60 rounded-none shadow-2xl z-[150] overflow-hidden py-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-purple-950/40 flex items-center justify-between">
            <span>Versions</span>
            <span>{versions.length} total</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-purple-950/30">
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
                      isActive ? 'bg-purple-950/40 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-4 flex items-center justify-center shrink-0">
                        {isActive && <Check size={13} className="text-purple-400 font-bold" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold truncate text-zinc-200">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity ml-1"
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
            <div className="border-t border-purple-950/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddVersion('drive');
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-purple-300 hover:text-white hover:bg-white/5 rounded-none transition-colors font-semibold"
              >
                <Plus size={13} />
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
