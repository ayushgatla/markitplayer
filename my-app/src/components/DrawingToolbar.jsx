import React from 'react';
import { 
  Pencil, 
  ArrowUpRight, 
  Square, 
  Circle, 
  Minus, 
  Undo2, 
  Redo2, 
  Trash2, 
  Check, 
  X,
  Palette
} from 'lucide-react';
import { DRAWING_COLORS, STROKE_WIDTHS } from '../utils/drawingHelper';

export const DrawingToolbar = ({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onDone,
  onClose,
  strokeCount = 0
}) => {
  const tools = [
    { id: 'pen', label: 'Freehand Pen (P)', icon: Pencil },
    { id: 'arrow', label: 'Arrow (A)', icon: ArrowUpRight },
    { id: 'rect', label: 'Rectangle (R)', icon: Square },
    { id: 'circle', label: 'Circle / Oval (C)', icon: Circle },
    { id: 'line', label: 'Straight Line (L)', icon: Minus }
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-black/75 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-3 duration-200 select-none max-w-[95vw] overflow-x-auto custom-scrollbar">
      
      {/* Tool Selector */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
              className={`p-2 rounded-lg transition-all flex items-center justify-center relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="h-6 w-[1px] bg-white/10 mx-0.5 shrink-0" />

      {/* Color Palette */}
      <div className="flex items-center gap-1.5 bg-white/5 p-1 px-1.5 rounded-xl border border-white/5">
        {DRAWING_COLORS.map((col) => {
          const isSelected = currentColor.toLowerCase() === col.hex.toLowerCase();
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setCurrentColor(col.hex)}
              title={col.name}
              className={`w-5 h-5 rounded-full transition-all flex items-center justify-center relative ${
                isSelected
                  ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black'
                  : 'hover:scale-110 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: col.hex }}
            />
          );
        })}

        {/* Custom Color Picker */}
        <label
          className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative overflow-hidden bg-gradient-to-tr from-indigo-500 via-pink-500 to-yellow-500"
          title="Custom Color"
        >
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>

      <div className="h-6 w-[1px] bg-white/10 mx-0.5 shrink-0" />

      {/* Stroke Width Selector */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
        {STROKE_WIDTHS.map((sw) => {
          const isSelected = currentWidth === sw.value;
          return (
            <button
              key={sw.id}
              type="button"
              onClick={() => setCurrentWidth(sw.value)}
              title={`Stroke: ${sw.label}`}
              className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{
                  width: sw.value === 2 ? 4 : sw.value === 4 ? 7 : 10,
                  height: sw.value === 2 ? 4 : sw.value === 4 ? 7 : 10
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-6 w-[1px] bg-white/10 mx-0.5 shrink-0" />

      {/* Undo / Redo / Clear */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 rounded-lg transition-all"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 rounded-lg transition-all"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={strokeCount === 0}
          title="Clear all drawings"
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-[1px] bg-white/10 mx-0.5 shrink-0" />

      {/* Done / Close Actions */}
      <div className="flex items-center gap-1.5 pl-1">
        <button
          type="button"
          onClick={onDone}
          title="Done & Attach to comment"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close drawing mode"
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DrawingToolbar;
