import { supabase } from '../supabaseClient.js';

/**
 * Admin access control and management utility for MarkIt Player.
 */

export const PRIMARY_ADMIN_EMAIL = 'ayushgatla@gmail.com';

const STORAGE_KEY = 'markit_admin_emails';
const CONFIG_FOLDER = '__system_admin_config__';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                     (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
                     'https://yfhpubzwhrvvyspswizj.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                          (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
                          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHB1Ynp3aHJ2dnlzcHN3aXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzA2OTcsImV4cCI6MjA5NzQ0NjY5N30.vPCSohWRyqsAnvjZD1ux4f1CldwmWGRg8IDI0N4j6XE';

/**
 * Normalize an email address (trims, converts to lowercase, fixes common Gmail domain typos).
 * @param {string | null | undefined} email 
 * @returns {string}
 */
export const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  let clean = email.toLowerCase().trim();
  // Auto-correct common Gmail typo variations (e.g., @gamil.com -> @gmail.com)
  clean = clean.replace(/@(gamil|gmai|gmaill|gmial|gmaii|googlemail)\.com$/i, '@gmail.com');
  return clean;
};

let inMemoryAdmins = [normalizeEmail(PRIMARY_ADMIN_EMAIL)];

/**
 * Get all current administrator emails from memory and local cache.
 * Always guarantees PRIMARY_ADMIN_EMAIL is present.
 * @returns {string[]}
 */
export const getAdminEmails = () => {
  try {
    let customAdmins = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          customAdmins = parsed.map(normalizeEmail);
        }
      }
    }
    const all = [
      normalizeEmail(PRIMARY_ADMIN_EMAIL),
      ...inMemoryAdmins,
      ...customAdmins
    ];
    return Array.from(new Set(all.map(normalizeEmail).filter(Boolean)));
  } catch (e) {
    console.warn('Error reading admin emails:', e);
    return Array.from(new Set([normalizeEmail(PRIMARY_ADMIN_EMAIL), ...inMemoryAdmins]));
  }
};

/**
 * Fetch and sync admin emails from Supabase so all devices and sessions share the exact dynamic admin list.
 * Uses REST fetch with anon key to bypass user-scoped RLS, followed by Supabase client fallback.
 * @returns {Promise<string[]>}
 */
export const syncAdminEmailsWithDatabase = async () => {
  let dbAdminList = null;

  // 1. Fetch via REST API with anon key to ensure non-owner users can always read the system admin config
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?folder=eq.${CONFIG_FOLDER}&select=id,video_url,created_at&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          if (row.video_url) {
            try {
              const parsed = JSON.parse(row.video_url);
              if (Array.isArray(parsed) && parsed.length > 0) {
                dbAdminList = parsed.map(normalizeEmail).filter(Boolean);
                break; // Take the latest valid config
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }
  } catch (e) {
    console.debug('REST admin sync fallback to Supabase client:', e);
  }

  // 2. Fallback to Supabase client query
  if (!dbAdminList) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, video_url, created_at')
        .eq('folder', CONFIG_FOLDER)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (row.video_url) {
            try {
              const parsed = JSON.parse(row.video_url);
              if (Array.isArray(parsed) && parsed.length > 0) {
                dbAdminList = parsed.map(normalizeEmail).filter(Boolean);
                break;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync admins from database client:', e);
    }
  }

  // If we retrieved admin list from database, merge with primary admin and cache locally
  if (dbAdminList) {
    const merged = Array.from(new Set([
      normalizeEmail(PRIMARY_ADMIN_EMAIL),
      ...dbAdminList
    ].filter(Boolean)));

    inMemoryAdmins = merged;

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  }

  return getAdminEmails();
};

/**
 * Check if a given email has admin privileges.
 * @param {string | null | undefined} email 
 * @returns {boolean}
 */
export const isAdmin = (email) => {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return false;
  const admins = getAdminEmails().map(normalizeEmail);
  return admins.includes(cleanEmail);
};

/**
 * Check if the email is the primary super admin.
 * @param {string | null | undefined} email 
 * @returns {boolean}
 */
export const isPrimaryAdmin = (email) => {
  if (!email || typeof email !== 'string') return false;
  return normalizeEmail(email) === normalizeEmail(PRIMARY_ADMIN_EMAIL);
};

/**
 * Internal helper to save admin emails to Supabase and update local storage.
 * @param {string[]} emails 
 * @param {string} [userId]
 */
export const saveAdminEmailsToDatabase = async (emails, userId = null) => {
  const cleanEmails = Array.from(new Set([
    normalizeEmail(PRIMARY_ADMIN_EMAIL),
    ...emails.map(normalizeEmail)
  ].filter(Boolean)));

  inMemoryAdmins = cleanEmails;

  const jsonPayload = JSON.stringify(cleanEmails);

  // Update local storage immediately
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, jsonPayload);
    window.dispatchEvent(new CustomEvent('markit_admin_update', { detail: cleanEmails }));
  }

  try {
    // 1. Check existing rows in database
    const { data: existing, error: selectErr } = await supabase
      .from('rooms')
      .select('id, user_id')
      .eq('folder', CONFIG_FOLDER);

    if (!selectErr && existing && existing.length > 0) {
      for (const row of existing) {
        await supabase
          .from('rooms')
          .update({
            title: 'Admin Access Config',
            video_url: jsonPayload
          })
          .eq('id', row.id);
      }
    } else {
      let uid = userId;
      if (!uid) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          uid = authData?.user?.id;
        } catch {}
      }
      if (!uid) {
        uid = 'af48cd0a-7f52-4fef-b797-0be624fa7bd0';
      }

      await supabase
        .from('rooms')
        .insert([{
          title: 'Admin Access Config',
          folder: CONFIG_FOLDER,
          video_url: jsonPayload,
          user_id: uid
        }]);
    }
  } catch (e) {
    console.warn('Failed to persist admin list to DB:', e);
  }

  return cleanEmails;
};

/**
 * Add a new administrator email and sync to Supabase.
 * @param {string} newEmail 
 * @param {string} [userId]
 * @returns {Promise<{ success: boolean, message: string, admins: string[], corrected?: boolean }>}
 */
export const addAdminEmail = async (newEmail, userId = null) => {
  if (!newEmail || typeof newEmail !== 'string') {
    return { success: false, message: 'Invalid email address', admins: getAdminEmails() };
  }
  
  const rawClean = newEmail.toLowerCase().trim();
  const clean = normalizeEmail(rawClean);
  const wasCorrected = rawClean !== clean;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { success: false, message: 'Please enter a valid email format', admins: getAdminEmails() };
  }

  // Always sync latest list from database first to avoid overwriting recent updates
  const current = await syncAdminEmailsWithDatabase();
  if (current.map(normalizeEmail).includes(clean)) {
    return { success: false, message: 'This user is already an administrator', admins: current };
  }

  const updated = Array.from(new Set([
    normalizeEmail(PRIMARY_ADMIN_EMAIL),
    ...current,
    clean
  ].filter(Boolean)));

  await saveAdminEmailsToDatabase(updated, userId);

  const message = wasCorrected 
    ? `Granted admin access to ${clean} (auto-corrected domain typo)`
    : `Granted admin access to ${clean}`;

  return { success: true, message, admins: updated, corrected: wasCorrected };
};

/**
 * Remove an administrator and sync to Supabase.
 * @param {string} emailToRemove 
 * @param {string} [userId]
 * @returns {Promise<{ success: boolean, message: string, admins: string[] }>}
 */
export const removeAdminEmail = async (emailToRemove, userId = null) => {
  if (!emailToRemove || typeof emailToRemove !== 'string') {
    return { success: false, message: 'Invalid email address', admins: getAdminEmails() };
  }
  const clean = normalizeEmail(emailToRemove);
  if (clean === normalizeEmail(PRIMARY_ADMIN_EMAIL)) {
    return { success: false, message: 'Cannot remove primary super admin', admins: getAdminEmails() };
  }

  // Always sync latest list from database first
  const current = await syncAdminEmailsWithDatabase();
  const updated = Array.from(new Set([
    normalizeEmail(PRIMARY_ADMIN_EMAIL),
    ...current.filter(e => normalizeEmail(e) !== clean)
  ].filter(Boolean)));

  await saveAdminEmailsToDatabase(updated, userId);

  return { success: true, message: `Revoked admin access for ${clean}`, admins: updated };
};
