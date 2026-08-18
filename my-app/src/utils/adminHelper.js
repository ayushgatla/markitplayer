import { supabase } from '../supabaseClient.js';

/**
 * Admin access control and management utility for MarkIt Player.
 */

export const PRIMARY_ADMIN_EMAIL = 'ayushgatla@gmail.com';

export const INITIAL_ADMIN_EMAILS = [
  'ayushgatla@gmail.com',
  'harshitkhare607@gmail.com'
];

const STORAGE_KEY = 'markit_admin_emails';
const CONFIG_FOLDER = '__system_admin_config__';

/**
 * Get all current administrator emails (syncs local storage + defaults).
 * @returns {string[]}
 */
export const getAdminEmails = () => {
  try {
    let customAdmins = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      customAdmins = stored ? JSON.parse(stored) : [];
    }
    const all = [
      ...INITIAL_ADMIN_EMAILS,
      ...customAdmins.map(e => (e || '').toLowerCase().trim())
    ];
    return Array.from(new Set(all.map(e => e.toLowerCase()).filter(Boolean)));
  } catch (e) {
    console.warn('Error reading admin emails:', e);
    return INITIAL_ADMIN_EMAILS;
  }
};

/**
 * Fetch and sync admin emails from Supabase so all devices share the same admin list.
 * @returns {Promise<string[]>}
 */
export const syncAdminEmailsWithDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('video_url')
      .eq('folder', CONFIG_FOLDER)
      .limit(1);

    if (!error && data && data.length > 0 && data[0].video_url) {
      const remoteAdmins = JSON.parse(data[0].video_url);
      if (Array.isArray(remoteAdmins)) {
        const merged = Array.from(new Set([
          ...INITIAL_ADMIN_EMAILS,
          ...remoteAdmins.map(e => (e || '').toLowerCase().trim())
        ].filter(Boolean)));

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (e) {
    console.warn('Could not sync admins from database:', e);
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
  const cleanEmail = email.toLowerCase().trim();
  const admins = getAdminEmails();
  return admins.includes(cleanEmail);
};

/**
 * Check if the email is the primary super admin.
 * @param {string | null | undefined} email 
 * @returns {boolean}
 */
export const isPrimaryAdmin = (email) => {
  if (!email || typeof email !== 'string') return false;
  return email.toLowerCase().trim() === PRIMARY_ADMIN_EMAIL.toLowerCase();
};

/**
 * Add a new administrator email and sync to Supabase.
 * @param {string} newEmail 
 * @param {string} [userId]
 * @returns {Promise<{ success: boolean, message: string, admins: string[] }>}
 */
export const addAdminEmail = async (newEmail, userId = null) => {
  if (!newEmail || typeof newEmail !== 'string') {
    return { success: false, message: 'Invalid email address', admins: getAdminEmails() };
  }
  const clean = newEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { success: false, message: 'Please enter a valid email format', admins: getAdminEmails() };
  }

  const current = getAdminEmails();
  if (current.includes(clean)) {
    return { success: false, message: 'This user is already an administrator', admins: current };
  }

  const updated = Array.from(new Set([...current, clean]));

  // Save to local storage
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Persist to Supabase
  try {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', CONFIG_FOLDER)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('rooms')
        .update({ video_url: JSON.stringify(updated) })
        .eq('id', existing[0].id);
    } else if (userId) {
      await supabase
        .from('rooms')
        .insert([{
          title: 'Admin Access Config',
          folder: CONFIG_FOLDER,
          video_url: JSON.stringify(updated),
          user_id: userId
        }]);
    }
  } catch (e) {
    console.warn('Failed to persist admin list to DB:', e);
  }

  return { success: true, message: `Granted admin access to ${clean}`, admins: updated };
};

/**
 * Remove an administrator and sync to Supabase.
 * @param {string} emailToRemove 
 * @returns {Promise<{ success: boolean, message: string, admins: string[] }>}
 */
export const removeAdminEmail = async (emailToRemove) => {
  if (!emailToRemove || typeof emailToRemove !== 'string') {
    return { success: false, message: 'Invalid email address', admins: getAdminEmails() };
  }
  const clean = emailToRemove.toLowerCase().trim();
  if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'Cannot remove primary super admin', admins: getAdminEmails() };
  }

  const current = getAdminEmails();
  const updated = current.filter(e => e.toLowerCase().trim() !== clean);

  // Save to local storage
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Persist to Supabase
  try {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', CONFIG_FOLDER)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('rooms')
        .update({ video_url: JSON.stringify(updated) })
        .eq('id', existing[0].id);
    }
  } catch (e) {
    console.warn('Failed to update admin list in DB:', e);
  }

  return { success: true, message: `Revoked admin access for ${clean}`, admins: updated };
};
