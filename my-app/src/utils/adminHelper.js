/**
 * Admin access control and management utility for MarkIt Player.
 */

export const PRIMARY_ADMIN_EMAIL = 'ayushgatla@gmail.com';

const STORAGE_KEY = 'markit_admin_emails';

/**
 * Get all current administrator emails.
 * @returns {string[]}
 */
export const getAdminEmails = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const customAdmins = stored ? JSON.parse(stored) : [];
      const all = [PRIMARY_ADMIN_EMAIL, ...customAdmins.map(e => (e || '').toLowerCase().trim())];
      return Array.from(new Set(all.map(e => e.toLowerCase()).filter(Boolean)));
    }
    return [PRIMARY_ADMIN_EMAIL];
  } catch (e) {
    console.warn('Error reading admin emails:', e);
    return [PRIMARY_ADMIN_EMAIL];
  }
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
 * Add a new administrator email.
 * @param {string} newEmail 
 * @returns {{ success: boolean, message: string, admins: string[] }}
 */
export const addAdminEmail = (newEmail) => {
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

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const customAdmins = stored ? JSON.parse(stored) : [];
      customAdmins.push(clean);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customAdmins));
    }
    return { success: true, message: `Granted admin access to ${clean}`, admins: getAdminEmails() };
  } catch (e) {
    return { success: false, message: 'Failed to save admin access', admins: current };
  }
};

/**
 * Remove an administrator.
 * @param {string} emailToRemove 
 * @returns {{ success: boolean, message: string, admins: string[] }}
 */
export const removeAdminEmail = (emailToRemove) => {
  if (!emailToRemove || typeof emailToRemove !== 'string') {
    return { success: false, message: 'Invalid email address', admins: getAdminEmails() };
  }
  const clean = emailToRemove.toLowerCase().trim();
  if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'Cannot remove primary super admin', admins: getAdminEmails() };
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      let customAdmins = stored ? JSON.parse(stored) : [];
      customAdmins = customAdmins.filter(e => (e || '').toLowerCase().trim() !== clean);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customAdmins));
    }
    return { success: true, message: `Revoked admin access for ${clean}`, admins: getAdminEmails() };
  } catch (e) {
    return { success: false, message: 'Failed to update admin access', admins: getAdminEmails() };
  }
};
