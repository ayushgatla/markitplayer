// Drawing Helper Utilities for MarkitPlayer
// Handles serialization, deserialization, parsing from comment strings, and vector canvas rendering.

export const DRAWING_PREFIX = '___DRAW:';
export const DRAWING_SUFFIX = '___';

/**
 * Extracts drawing data from a raw comment string.
 * Returns { cleanText, drawingData }
 */
export function extractDrawingFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { cleanText: rawText || '', drawingData: null };
  }

  const regex = new RegExp(`${DRAWING_PREFIX}(.*?)${DRAWING_SUFFIX}`, 's');
  const match = rawText.match(regex);

  if (!match) {
    return { cleanText: rawText, drawingData: null };
  }

  let drawingData = null;
  try {
    const jsonStr = decodeURIComponent(match[1]);
    drawingData = JSON.parse(jsonStr);
  } catch (e) {
    try {
      drawingData = JSON.parse(match[1]);
    } catch (e2) {
      console.warn('Failed to parse drawing data:', e2);
    }
  }

  const cleanText = rawText.replace(match[0], '').trim();
  return { cleanText, drawingData };
}

/**
 * Serializes drawing data and embeds it into a comment text string.
 */
export function injectDrawingIntoText(text, drawingData) {
  if (!drawingData || !drawingData.strokes || drawingData.strokes.length === 0) {
    return text;
  }
  const serialized = encodeURIComponent(JSON.stringify(drawingData));
  return `${DRAWING_PREFIX}${serialized}${DRAWING_SUFFIX}${text ? ' ' + text : ''}`;
}

/**
 * Curated color palette for Frame.io-style annotations
 */
export const DRAWING_COLORS = [
  { id: 'yellow', name: 'Neon Yellow', hex: '#FACC15' },
  { id: 'red', name: 'Electric Red', hex: '#EF4444' },
  { id: 'cyan', name: 'Bright Cyan', hex: '#38BDF8' },
  { id: 'green', name: 'Emerald', hex: '#22C55E' },
  { id: 'purple', name: 'Hot Pink', hex: '#EC4899' },
  { id: 'white', name: 'Pure White', hex: '#FFFFFF' }
];

export const STROKE_WIDTHS = [
  { id: 'thin', label: 'Thin', value: 2 },
  { id: 'medium', label: 'Medium', value: 4 },
  { id: 'thick', label: 'Thick', value: 8 }
];

/**
 * Draw an arrow from (x1, y1) to (x2, y2) with a clean arrowhead
 */
export function drawArrow(ctx, x1, y1, x2, y2, strokeWidth, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 2) return;

  const headLength = Math.max(12, strokeWidth * 3.5);
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead triangle
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a rectangle (box) with rounded or sharp corners
 */
export function drawRect(ctx, x1, y1, x2, y2, strokeWidth, color) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Subtle translucent fill
  ctx.fillStyle = hexToRgba(color, 0.12);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}

/**
 * Draw an ellipse / circle
 */
export function drawCircle(ctx, x1, y1, x2, y2, strokeWidth, color) {
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const radiusX = Math.abs(x2 - x1) / 2;
  const radiusY = Math.abs(y2 - y1) / 2;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  
  // Subtle translucent fill
  ctx.fillStyle = hexToRgba(color, 0.12);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a straight line
 */
export function drawLine(ctx, x1, y1, x2, y2, strokeWidth, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a smooth freehand stroke using quadratic Bézier curve interpolation
 */
export function drawSmoothStroke(ctx, points, strokeWidth, color) {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  // Curve through the last point
  ctx.quadraticCurveTo(
    points[points.length - 2].x,
    points[points.length - 2].y,
    points[points.length - 1].x,
    points[points.length - 1].y
  );

  ctx.stroke();
  ctx.restore();
}

/**
 * Renders an array of normalized strokes onto the canvas context
 */
export function renderStrokes(ctx, strokes, width, height) {
  if (!ctx || !strokes || strokes.length === 0) return;

  strokes.forEach((stroke) => {
    const { type, color, width: sw = 4 } = stroke;
    // Scale stroke width gracefully with canvas dimension (relative to base 1000px)
    const scaledWidth = Math.max(1.5, sw * (width / 1000));

    if (type === 'pen' || type === 'freehand') {
      const denormalizedPoints = (stroke.points || []).map(p => ({
        x: p.x * width,
        y: p.y * height
      }));
      drawSmoothStroke(ctx, denormalizedPoints, scaledWidth, color);
    } else if (type === 'arrow') {
      drawArrow(
        ctx,
        stroke.startX * width,
        stroke.startY * height,
        stroke.endX * width,
        stroke.endY * height,
        scaledWidth,
        color
      );
    } else if (type === 'rect' || type === 'rectangle') {
      drawRect(
        ctx,
        stroke.startX * width,
        stroke.startY * height,
        stroke.endX * width,
        stroke.endY * height,
        scaledWidth,
        color
      );
    } else if (type === 'circle' || type === 'ellipse') {
      drawCircle(
        ctx,
        stroke.startX * width,
        stroke.startY * height,
        stroke.endX * width,
        stroke.endY * height,
        scaledWidth,
        color
      );
    } else if (type === 'line') {
      drawLine(
        ctx,
        stroke.startX * width,
        stroke.startY * height,
        stroke.endX * width,
        stroke.endY * height,
        scaledWidth,
        color
      );
    }
  });
}

function hexToRgba(hex, alpha = 1) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
