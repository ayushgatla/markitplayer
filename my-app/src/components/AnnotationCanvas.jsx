import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  renderStrokes, 
  drawSmoothStroke, 
  drawArrow, 
  drawRect, 
  drawCircle, 
  drawLine 
} from '../utils/drawingHelper';

export const AnnotationCanvas = forwardRef(({
  isDrawingMode = false,
  activeTool = 'pen',
  currentColor = '#FACC15',
  currentWidth = 4,
  onStrokesChange,
  initialStrokes = [],
  readOnlyStrokes = null,
  showAnnotations = true
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // In-memory list of strokes created in current drawing session
  const [strokes, setStrokes] = useState(initialStrokes);
  const [redoStack, setRedoStack] = useState([]);
  const [isPointerDown, setIsPointerDown] = useState(false);

  // Temporary stroke currently being dragged/drawn
  const activeStrokeRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  // Sync initial strokes when prop changes (e.g. editing an existing attached drawing)
  useEffect(() => {
    setStrokes(initialStrokes || []);
    setRedoStack([]);
  }, [initialStrokes]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getStrokes: () => strokes,
    clear: () => {
      setStrokes([]);
      setRedoStack([]);
      if (onStrokesChange) onStrokesChange([]);
    },
    undo: () => handleUndo(),
    redo: () => handleRedo(),
    canUndo: strokes.length > 0,
    canRedo: redoStack.length > 0,
    strokeCount: strokes.length
  }));

  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    setRedoStack((prev) => [...prev, last]);
    if (onStrokesChange) onStrokesChange(newStrokes);
  }, [strokes, onStrokesChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const item = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newStrokes = [...strokes, item];
    setStrokes(newStrokes);
    setRedoStack(newRedo);
    if (onStrokesChange) onStrokesChange(newStrokes);
  }, [strokes, redoStack, onStrokesChange]);

  // Master redraw function
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    if (isDrawingMode) {
      // Render committed strokes in this drawing session
      renderStrokes(ctx, strokes, width, height);

      // Render active live stroke if dragging
      if (activeStrokeRef.current) {
        const stroke = activeStrokeRef.current;
        const scaledWidth = Math.max(1.5, stroke.width * (width / 1000));
        
        if (stroke.type === 'pen') {
          const denormalizedPoints = (stroke.points || []).map(p => ({
            x: p.x * width,
            y: p.y * height
          }));
          drawSmoothStroke(ctx, denormalizedPoints, scaledWidth, stroke.color);
        } else if (stroke.type === 'arrow') {
          drawArrow(
            ctx,
            stroke.startX * width,
            stroke.startY * height,
            stroke.endX * width,
            stroke.endY * height,
            scaledWidth,
            stroke.color
          );
        } else if (stroke.type === 'rect') {
          drawRect(
            ctx,
            stroke.startX * width,
            stroke.startY * height,
            stroke.endX * width,
            stroke.endY * height,
            scaledWidth,
            stroke.color
          );
        } else if (stroke.type === 'circle') {
          drawCircle(
            ctx,
            stroke.startX * width,
            stroke.startY * height,
            stroke.endX * width,
            stroke.endY * height,
            scaledWidth,
            stroke.color
          );
        } else if (stroke.type === 'line') {
          drawLine(
            ctx,
            stroke.startX * width,
            stroke.startY * height,
            stroke.endX * width,
            stroke.endY * height,
            scaledWidth,
            stroke.color
          );
        }
      }
    } else if (showAnnotations && readOnlyStrokes && readOnlyStrokes.length > 0) {
      // Render static annotations from selected/current comment
      renderStrokes(ctx, readOnlyStrokes, width, height);
    }
  }, [isDrawingMode, showAnnotations, strokes, readOnlyStrokes]);

  // Handle Resize & DPI Scaling
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        sizeRef.current = { width: rect.width, height: rect.height };

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        redraw();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [redraw]);

  // Redraw when strokes or modes change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Normalized coordinate helper
  const getNormalizedPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Pointer event handlers
  const handlePointerDown = (e) => {
    if (!isDrawingMode) return;
    if (e.button !== 0 && e.button !== undefined) return; // Only primary button

    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const { x, y } = getNormalizedPos(e);
    setIsPointerDown(true);

    if (activeTool === 'pen') {
      activeStrokeRef.current = {
        type: 'pen',
        color: currentColor,
        width: currentWidth,
        points: [{ x, y }]
      };
    } else {
      activeStrokeRef.current = {
        type: activeTool,
        color: currentColor,
        width: currentWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y
      };
    }

    redraw();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingMode || !isPointerDown || !activeStrokeRef.current) return;

    const { x, y } = getNormalizedPos(e);
    const stroke = activeStrokeRef.current;

    if (stroke.type === 'pen') {
      stroke.points.push({ x, y });
    } else {
      stroke.endX = x;
      stroke.endY = y;
    }

    redraw();
  };

  const handlePointerUp = (e) => {
    if (!isDrawingMode || !isPointerDown || !activeStrokeRef.current) return;

    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    const stroke = activeStrokeRef.current;
    let isValid = false;

    if (stroke.type === 'pen') {
      isValid = stroke.points && stroke.points.length > 0;
    } else {
      const dx = stroke.endX - stroke.startX;
      const dy = stroke.endY - stroke.startY;
      // Discard accidental clicks with 0 distance
      isValid = Math.sqrt(dx * dx + dy * dy) > 0.005;
    }

    if (isValid) {
      const newStrokes = [...strokes, stroke];
      setStrokes(newStrokes);
      setRedoStack([]); // Clear redo on new action
      if (onStrokesChange) onStrokesChange(newStrokes);
    }

    activeStrokeRef.current = null;
    setIsPointerDown(false);
    redraw();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full ${
        isDrawingMode ? 'pointer-events-auto z-40 cursor-crosshair' : 'pointer-events-none z-30'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';
export default AnnotationCanvas;
