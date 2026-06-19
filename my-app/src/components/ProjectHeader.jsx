import React, { useState, useRef, useEffect } from 'react';
import { Film, MoreHorizontal, Share2, Edit2 } from 'lucide-react';

export const ProjectHeader = ({ title, onRename }) => {
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

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 text-zinc-100">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Film size={18} />
        </div>
        
        {isEditing ? (
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
            className="flex items-center gap-2 group cursor-pointer" 
            onClick={() => setIsEditing(true)}
            title="Click to rename"
          >
            <h1 className="font-medium truncate max-w-[300px]">{title}</h1>
            <Edit2 size={14} className="text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2 shrink-0">V2.1</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700/50">
          <Share2 size={16} />
          Share
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
    </header>
  );
};

export default ProjectHeader;
