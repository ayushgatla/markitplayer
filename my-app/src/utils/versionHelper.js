/**
 * Utility functions for managing video versions in MarkIt Player.
 * Supports legacy single URL strings and new multi-version JSON structures.
 */

/**
 * Detect video platform from URL
 * @param {string} url 
 * @returns {'youtube' | 'drive' | 'instagram' | 'other'}
 */
export const detectPlatform = (url) => {
  if (!url || typeof url !== 'string') return 'other';
  const cleanUrl = url.trim().toLowerCase();
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'youtube';
  if (cleanUrl.includes('drive.google.com')) return 'drive';
  if (cleanUrl.includes('instagram.com')) return 'instagram';
  return 'other';
};

/**
 * Parse raw video_url field from Supabase room record.
 * Handles null/undefined, legacy plain URL string, and JSON-encoded version structure.
 * 
 * @param {string | null | undefined} rawVideoUrl 
 * @param {string} [roomCreatedAt] 
 * @returns {{ currentVersion: number, versions: Array<{ version: number, url: string, platform: string, title?: string, created_at: string }> }}
 */
export const parseVideoData = (rawVideoUrl, roomCreatedAt) => {
  if (!rawVideoUrl || typeof rawVideoUrl !== 'string' || !rawVideoUrl.trim()) {
    return { currentVersion: 1, versions: [] };
  }

  const trimmed = rawVideoUrl.trim();

  // Try parsing as JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.versions) && parsed.versions.length > 0) {
        return {
          currentVersion: typeof parsed.currentVersion === 'number' ? parsed.currentVersion : parsed.versions[parsed.versions.length - 1].version,
          versions: parsed.versions.map((v, idx) => ({
            version: v.version || idx + 1,
            url: v.url || '',
            platform: v.platform || detectPlatform(v.url),
            title: v.title || `V${v.version || idx + 1}`,
            created_at: v.created_at || v.createdAt || new Date().toISOString()
          }))
        };
      }
    } catch (e) {
      console.warn('Failed to parse video_url as JSON, treating as raw URL:', e);
    }
  }

  // Treat as legacy single plain URL
  return {
    currentVersion: 1,
    versions: [
      {
        version: 1,
        url: trimmed,
        platform: detectPlatform(trimmed),
        title: 'V1',
        created_at: roomCreatedAt || new Date().toISOString()
      }
    ]
  };
};

/**
 * Get active or specific version video URL
 * @param {string | null | undefined} rawVideoUrl 
 * @param {number} [requestedVersion] 
 * @returns {string} Playable URL or empty string
 */
export const getActiveVideoUrl = (rawVideoUrl, requestedVersion = null) => {
  const data = parseVideoData(rawVideoUrl);
  if (!data.versions || data.versions.length === 0) return '';

  if (requestedVersion !== null) {
    const target = data.versions.find(v => v.version === requestedVersion);
    if (target) return target.url;
  }

  const active = data.versions.find(v => v.version === data.currentVersion) || data.versions[data.versions.length - 1];
  return active ? active.url : '';
};

/**
 * Get active version metadata object
 * @param {string | null | undefined} rawVideoUrl 
 * @returns {{ version: number, url: string, platform: string, title: string, created_at: string } | null}
 */
export const getActiveVersionObj = (rawVideoUrl) => {
  const data = parseVideoData(rawVideoUrl);
  if (!data.versions || data.versions.length === 0) return null;

  return data.versions.find(v => v.version === data.currentVersion) || data.versions[data.versions.length - 1] || null;
};

/**
 * Add a new version and make it the active version.
 * Returns the serialized JSON string to store in Supabase room.video_url.
 * 
 * @param {string | null | undefined} rawVideoUrl 
 * @param {string} newUrl 
 * @param {string} [platform] 
 * @param {string} [customTitle] 
 * @returns {string} Serialized JSON string for Supabase
 */
export const addVideoVersion = (rawVideoUrl, newUrl, platform = null, customTitle = '') => {
  const data = parseVideoData(rawVideoUrl);
  const cleanUrl = (newUrl || '').trim();
  if (!cleanUrl) return rawVideoUrl;

  const detectedPlatform = platform || detectPlatform(cleanUrl);
  
  // Calculate next version number
  const maxVersion = data.versions.length > 0
    ? Math.max(...data.versions.map(v => v.version || 0))
    : 0;
  const newVersionNum = maxVersion + 1;

  const newVersionObj = {
    version: newVersionNum,
    url: cleanUrl,
    platform: detectedPlatform,
    title: customTitle.trim() || `V${newVersionNum}`,
    created_at: new Date().toISOString()
  };

  const updatedData = {
    currentVersion: newVersionNum,
    versions: [...data.versions, newVersionObj]
  };

  return JSON.stringify(updatedData);
};

/**
 * Switch active version.
 * Returns the serialized JSON string with updated currentVersion.
 * 
 * @param {string | null | undefined} rawVideoUrl 
 * @param {number} targetVersion 
 * @returns {string} Serialized JSON string
 */
export const switchVideoVersion = (rawVideoUrl, targetVersion) => {
  const data = parseVideoData(rawVideoUrl);
  if (!data.versions || data.versions.length === 0) return rawVideoUrl;

  const exists = data.versions.some(v => v.version === targetVersion);
  if (!exists) return rawVideoUrl;

  const updatedData = {
    ...data,
    currentVersion: targetVersion
  };

  return JSON.stringify(updatedData);
};

/**
 * Delete a specific version (only allowed if >1 version exists).
 * Returns the serialized JSON string with the version removed.
 * 
 * @param {string | null | undefined} rawVideoUrl 
 * @param {number} versionToDelete 
 * @returns {string} Serialized JSON string
 */
export const deleteVideoVersion = (rawVideoUrl, versionToDelete) => {
  const data = parseVideoData(rawVideoUrl);
  if (data.versions.length <= 1) return rawVideoUrl;

  const filtered = data.versions.filter(v => v.version !== versionToDelete);
  let newCurrent = data.currentVersion;
  if (newCurrent === versionToDelete) {
    newCurrent = filtered[filtered.length - 1].version;
  }

  const updatedData = {
    currentVersion: newCurrent,
    versions: filtered
  };

  return JSON.stringify(updatedData);
};
