// Helper utilities for parsing, cleaning, and formatting MarkitPlayer comments and notifications.
import { formatRangeTime } from './drawingHelper.js';

/**
 * Format a single seconds timestamp into mm:ss or mm:ss.s
 */
export function formatTimestamp(seconds) {
  if (seconds === null || seconds === undefined || seconds < 0 || isNaN(seconds)) {
    return '0:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s < 10 ? '0' : ''}${s}${ms > 0 ? `.${ms}` : ''}`;
}

/**
 * Parses raw comment text and extracts:
 * - version number (from ___VER:X___)
 * - parentId & isReply (from ___REPLY:X___)
 * - drawingData & hasDrawing (from ___DRAW:X___)
 * - endTime & isRange (from ___RANGE:X___)
 * - imageUrl & hasImage (from ![...](url))
 * - cleanText (stripped of system tags, preserves markdown images)
 * - plainText (stripped of system tags and markdown images)
 * - previewText (clean human readable text or contextual fallback description)
 * - formattedTime (e.g. "0:15", "0:15 - 0:25 (10.0s)", or "Chat")
 */
export function parseCommentText(rawText = '', timestamp = null) {
  const isChat = timestamp === -1;

  if (!rawText || typeof rawText !== 'string') {
    return {
      cleanText: '',
      plainText: '',
      previewText: isChat ? 'Chat message' : 'Comment',
      version: null,
      parentId: null,
      isReply: false,
      drawingData: null,
      hasDrawing: false,
      endTime: null,
      isRange: false,
      imageUrl: null,
      hasImage: false,
      isChat,
      formattedTime: isChat ? 'Chat' : (timestamp !== null && timestamp >= 0 ? formatTimestamp(timestamp) : '0:00')
    };
  }

  let text = rawText;
  let version = null;
  let parentId = null;
  let isReply = false;
  let drawingData = null;
  let hasDrawing = false;
  let endTime = null;
  let isRange = false;
  let imageUrl = null;
  let hasImage = false;

  // 1. Version prefix: ___VER:(\d+)___
  const verMatch = text.match(/___VER:(\d+)___/);
  if (verMatch) {
    version = parseInt(verMatch[1], 10);
    text = text.replace(verMatch[0], '');
  }

  // 2. Reply prefix: ___REPLY:([a-zA-Z0-9-]+)___
  const replyMatch = text.match(/___REPLY:([a-zA-Z0-9-]+)___/);
  if (replyMatch) {
    isReply = true;
    parentId = replyMatch[1];
    text = text.replace(replyMatch[0], '');
  }

  // 3. Drawing prefix: ___DRAW:(.*?)___
  const drawMatch = text.match(/___DRAW:(.*?)___/s);
  if (drawMatch) {
    try {
      const jsonStr = decodeURIComponent(drawMatch[1]);
      drawingData = JSON.parse(jsonStr);
    } catch (e) {
      try {
        drawingData = JSON.parse(drawMatch[1]);
      } catch (e2) {
        // ignore parse error
      }
    }
    if (drawingData) {
      if (Array.isArray(drawingData.strokes) && drawingData.strokes.length > 0) {
        hasDrawing = true;
      } else if (Array.isArray(drawingData) && drawingData.length > 0) {
        hasDrawing = true;
      } else if (drawingData.v || drawingData.strokes) {
        hasDrawing = true;
      }
    } else {
      hasDrawing = true;
    }
    text = text.replace(drawMatch[0], '');
  }

  // 4. Range prefix: ___RANGE:([0-9.]+)___
  const rangeMatch = text.match(/___RANGE:([0-9.]+)___/s);
  if (rangeMatch) {
    const parsed = parseFloat(rangeMatch[1]);
    if (!isNaN(parsed) && parsed >= 0) {
      endTime = parsed;
      isRange = timestamp !== null && timestamp !== undefined ? endTime > timestamp : true;
    }
    text = text.replace(rangeMatch[0], '');
  }

  // Clean text with markdown formatting & images preserved
  const cleanText = text.trim();

  // 5. Image markdown check & extraction: ![alt](url)
  const imageMatch = cleanText.match(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/);
  if (imageMatch) {
    imageUrl = imageMatch[2];
    hasImage = true;
  }

  // Plain text (with markdown images removed)
  const plainText = cleanText.replace(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g, '').trim();

  let formattedTime = '0:00';
  if (isChat) {
    formattedTime = 'Chat';
  } else if (isRange && endTime !== null && timestamp !== null && timestamp !== undefined && endTime > timestamp) {
    formattedTime = formatRangeTime(timestamp, endTime);
  } else if (timestamp !== null && timestamp !== undefined && timestamp >= 0) {
    formattedTime = formatTimestamp(timestamp);
  }

  // Generate clean preview text
  let previewText = plainText;
  if (!previewText) {
    if (hasDrawing && hasImage) {
      previewText = 'Visual drawing with attached image';
    } else if (hasDrawing) {
      previewText = 'Visual drawing annotation';
    } else if (hasImage) {
      previewText = 'Attached image';
    } else if (isRange) {
      previewText = 'Time range feedback';
    } else if (isReply) {
      previewText = 'Replied to comment';
    } else if (isChat) {
      previewText = 'Chat message';
    } else {
      previewText = 'Comment';
    }
  }

  return {
    cleanText,
    plainText,
    previewText,
    version,
    parentId,
    isReply,
    drawingData,
    hasDrawing,
    endTime,
    isRange,
    imageUrl,
    hasImage,
    isChat,
    formattedTime
  };
}

/**
 * Parses a full comment object
 */
export function parseComment(comment) {
  if (!comment) return null;
  const parsed = parseCommentText(comment.comment_text, comment.timestamp);
  return {
    ...comment,
    ...parsed,
    rawText: comment.comment_text
  };
}
