import { supabase } from '../supabaseClient.js';

/**
 * Admin access control and management utility for MarkIt Player.
 */

export const PRIMARY_ADMIN_EMAIL = 'ayushgatla@gmail.com';

export const INITIAL_ADMIN_EMAILS = [
  'ayushgatla@gmail.com',
  'harshitkhare607@gmail.com',
  'bajikeisuke8117@gmail.com',
  'bajikeisuke8117@gamil.com'
];

const STORAGE_KEY = 'markit_admin_emails';
const CONFIG_FOLDER = '__system_admin_config__';

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
      ...(Array.isArray(customAdmins) ? customAdmins : []).map(normalizeEmail)
    ];
    return Array.from(new Set(all.map(normalizeEmail).filter(Boolean)));
  } catch (e) {
    console.warn('Error reading admin emails:', e);
    return INITIAL_ADMIN_EMAILS.map(normalizeEmail);
  }
};

/**
 * Fetch and sync admin emails from Supabase so all devices and admins share the exact same admin list.
 * @returns {Promise<string[]>}
 */
export const syncAdminEmailsWithDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, video_url')
      .eq('folder', CONFIG_FOLDER);

    if (!error && data && data.length > 0) {
      const extractedAdmins = [];
      data.forEach(row => {
        if (row.video_url) {
          try {
            const parsed = JSON.parse(row.video_url);
            if (Array.isArray(parsed)) {
              extractedAdmins.push(...parsed.map(normalizeEmail));
            }
          } catch {
            // Ignore non-JSON strings
          }
        }
      });

      const merged = Array.from(new Set([
        ...INITIAL_ADMIN_EMAILS.map(normalizeEmail),
        ...extractedAdmins
      ].filter(Boolean)));

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
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

  const current = getAdminEmails();
  if (current.map(normalizeEmail).includes(clean)) {
    return { success: false, message: 'This user is already an administrator', admins: current };
  }

  // Include both normalized email and raw clean (if slightly different) for safety
  const updated = Array.from(new Set([...current, clean, rawClean].filter(Boolean)));

  // Save to local storage
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Persist to Supabase
  try {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id, user_id')
      .eq('folder', CONFIG_FOLDER);

    if (existing && existing.length > 0) {
      // Update existing records
      for (const row of existing) {
        await supabase
          .from('rooms')
          .update({ video_url: JSON.stringify(updated) })
          .eq('id', row.id);
      }
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

  const message = wasCorrected 
    ? `Granted admin access to ${clean} (auto-corrected domain typo)`
    : `Granted admin access to ${clean}`;

  return { success: true, message, admins: updated, corrected: wasCorrected };
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
  const clean = normalizeEmail(emailToRemove);
  if (clean === normalizeEmail(PRIMARY_ADMIN_EMAIL)) {
    return { success: false, message: 'Cannot remove primary super admin', admins: getAdminEmails() };
  }

  const current = getAdminEmails();
  const updated = current.filter(e => normalizeEmail(e) !== clean);

  // Save to local storage
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Persist to Supabase
  try {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', CONFIG_FOLDER);

    if (existing && existing.length > 0) {
      for (const row of existing) {
        await supabase
          .from('rooms')
          .update({ video_url: JSON.stringify(updated) })
          .eq('id', row.id);
      }
    }
  } catch (e) {
    console.warn('Failed to update admin list in DB:', e);
  }

  return { success: true, message: `Revoked admin access for ${clean}`, admins: updated };
};
