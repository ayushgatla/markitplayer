import React from 'react';
import { Film, MoreHorizontal, Share2 } from 'lucide-react';

export const ProjectHeader = ({ title }) => {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 text-zinc-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Film size={18} />
        </div>
        <h1 className="font-medium">{title}</h1>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-2">V2.1</span>
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
