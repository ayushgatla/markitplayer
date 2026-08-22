import { supabase } from '../supabaseClient.js';
import { normalizeEmail } from './adminHelper.js';

const REGISTRY_FOLDER = '__system_user_registry__';
const REGISTRY_STORAGE_KEY = 'markit_user_profiles_cache';

// Seed list of all 32 Supabase Auth users with their registered UIDs, names, emails, and providers
export const SEED_SUPABASE_USERS = [
  {
    id: 'f1498d4a-8886-492f-a0e6-e6eb89800215',
    name: 'Rizwan Ahmad PSC',
    email: 'amankhan465001@gmail.com',
    provider: 'Google',
    created_at: '2026-06-18T10:20:00.000Z'
  },
  {
    id: 'af48cd0a-7f52-4fef-b797-0be624fa7bd0',
    name: 'Ayush Gatla',
    email: 'ayushgatla@gmail.com',
    provider: 'Email, Google',
    created_at: '2026-05-01T08:00:00.000Z'
  },
  {
    id: '63a27239-46ef-4eb8-8d79-e9b7bd5d8b3e',
    name: 'Baji Keisuke',
    email: 'bajikeisuke8117@gmail.com',
    provider: 'Google',
    created_at: '2026-06-05T14:15:00.000Z'
  },
  {
    id: '486cbb4d-6e2b-402c-a635-6b807490778a',
    name: 'Birding',
    email: 'birding61@gmail.com',
    provider: 'Google',
    created_at: '2026-06-10T12:00:00.000Z'
  },
  {
    id: 'eae68e84-1f69-4ae1-9e31-06fbd425c522',
    name: 'Rohit Kumar',
    email: 'contactrohitjhaa@gmail.com',
    provider: 'Google',
    created_at: '2026-06-12T09:30:00.000Z'
  },
  {
    id: '8c7721f4-7182-48c2-bb81-0df3a22f94e2',
    name: 'Debjit Das',
    email: 'debjitdas842@gmail.com',
    provider: 'Google',
    created_at: '2026-06-15T11:45:00.000Z'
  },
  {
    id: '96ca1219-5b74-483b-b8f1-051b4ddc89da',
    name: 'Deepak Kumar',
    email: 'deepakarora683@gmail.com',
    provider: 'Google',
    created_at: '2026-06-25T16:20:00.000Z'
  },
  {
    id: 'b293cc99-62b7-457d-a39a-ed4b7ca76f50',
    name: 'Naty Man14',
    email: 'eyn44.f@gmail.com',
    provider: 'Google',
    created_at: '2026-06-22T08:10:00.000Z'
  },
  {
    id: 'e221e4ce-3ca5-44f2-ae2e-bdb60ce0e460',
    name: 'Harshit Khare',
    email: 'harshitkhare093@gmail.com',
    provider: 'Email',
    created_at: '2026-05-15T10:00:00.000Z'
  },
  {
    id: '9fee4bf2-07f2-40b2-8f41-b1ad2cd31003',
    name: 'Harshit Khare',
    email: 'harshitkhare607@gmail.com',
    provider: 'Email, Google',
    created_at: '2026-05-20T11:30:00.000Z'
  },
  {
    id: 'c2166e07-c2f7-47b8-8f4e-7399b260ebde',
    name: 'THESIGAN S',
    email: 'iamthesigan@gmail.com',
    provider: 'Google',
    created_at: '2026-06-19T13:40:00.000Z'
  },
  {
    id: '265aac76-c7e2-4194-9a88-60478144dbb9',
    name: 'Chinmay Jain',
    email: 'jain.chinmay.cj23@gmail.com',
    provider: 'Email',
    created_at: '2026-06-14T07:50:00.000Z'
  },
  {
    id: 'ba4125f4-a91d-46e0-a7d2-b05f5f91f48d',
    name: 'karan',
    email: 'jass24952495@gmail.com',
    provider: 'Google',
    created_at: '2026-06-17T15:00:00.000Z'
  },
  {
    id: '9ac0c63f-3fbd-4385-8f12-074e303602fe',
    name: 'Jayanth B M',
    email: 'jayanthbm1201@gmail.com',
    provider: 'Google',
    created_at: '2026-06-28T18:00:00.000Z'
  },
  {
    id: '12c8dd45-64b8-4834-92c8-3acfaf5c9306',
    name: 'JON SNOW',
    email: 'jonsnow8117@gmail.com',
    provider: 'Google',
    created_at: '2026-06-29T12:15:00.000Z'
  },
  {
    id: 'c4d72050-17ae-46fd-985c-255d16339a24',
    name: 'Krishna Khare',
    email: 'krishnakhare70800@gmail.com',
    provider: 'Email',
    created_at: '2026-06-08T09:00:00.000Z'
  },
  {
    id: '56e5ad02-4e42-4867-ba9c-0c2352225f86',
    name: 'Harshit Gaming',
    email: 'krishnakhare722@gmail.com',
    provider: 'Email, Google',
    created_at: '2026-06-09T14:40:00.000Z'
  },
  {
    id: '913ba889-af51-4d0c-9fcb-98743e695755',
    name: 'MahfuZ RehmaN',
    email: 'mahfuzzrehman@gmail.com',
    provider: 'Google',
    created_at: '2026-06-30T10:00:00.000Z'
  },
  {
    id: 'f9865bc5-0020-4c84-9a9d-309f2b1017f7',
    name: 'Otaku iamrealmoshe',
    email: 'moshe07dinakar123@gmail.com',
    provider: 'Google',
    created_at: '2026-07-01T15:30:00.000Z'
  },
  {
    id: '82d9c35d-3db5-4b54-a3d7-40a5d16d72d2',
    name: 'Nafew Islam',
    email: 'nafewislam11@gmail.com',
    provider: 'Google',
    created_at: '2026-07-02T17:45:00.000Z'
  },
  {
    id: '8eab9f83-9d20-4d0b-8845-bfdae5a91edf',
    name: 'Naveenkrishna Nair',
    email: 'naveenkrishnanair79@gmail.com',
    provider: 'Google',
    created_at: '2026-06-16T11:20:00.000Z'
  },
  {
    id: 'bbfac493-a333-4ef0-97fb-81785d98fb47',
    name: 'Omkar Tambe',
    email: 'omkarforott@gmail.com',
    provider: 'Google',
    created_at: '2026-06-13T16:00:00.000Z'
  },
  {
    id: '4d8f7535-61dd-44f2-9ac0-d0b79aaeea4f',
    name: 'Rohit Kumar',
    email: 'rohitmishra00047@gmail.com',
    provider: 'Google',
    created_at: '2026-07-03T09:10:00.000Z'
  },
  {
    id: '22ea5fc2-6950-45b8-a8cc-7d818104359d',
    name: 'Ameen Roshan',
    email: 'roshanameen003@gmail.com',
    provider: 'Google',
    created_at: '2026-06-21T13:00:00.000Z'
  },
  {
    id: 'fa661c76-d57f-4303-b10d-bea298873a4d',
    name: 'Med Salah HB',
    email: 'salah.hajbelgassem09@gmail.com',
    provider: 'Google',
    created_at: '2026-07-04T12:00:00.000Z'
  },
  {
    id: '49faa08f-1dbf-4255-a1c7-a01599de4f2b',
    name: 'Simon J',
    email: 'simonjs2005@gmail.com',
    provider: 'Google',
    created_at: '2026-06-23T14:20:00.000Z'
  },
  {
    id: 'dc16014c-5cc4-469d-8910-3e56a54e40d6',
    name: 'Sree charan Jogula',
    email: 'sunnyjogula1050@gmail.com',
    provider: 'Google',
    created_at: '2026-06-11T10:15:00.000Z'
  },
  {
    id: 'bd83def0-0c07-4b73-a540-7848cd8fce89',
    name: 'syncoes',
    email: 'syncoes93@gmail.com',
    provider: 'Google',
    created_at: '2026-06-24T15:30:00.000Z'
  },
  {
    id: '62a868ad-de89-44cd-a10b-05deea598586',
    name: 'Tanveer Hussain khan',
    email: 'tanveerhk.it@gmail.com',
    provider: 'Google',
    created_at: '2026-07-05T16:00:00.000Z'
  },
  {
    id: '1ce2f900-286b-4207-91dd-a8eeb96c31eb',
    name: 'RiponPlaysHD',
    email: 'toinfinityandripon@gmail.com',
    provider: 'Google',
    created_at: '2026-07-06T18:30:00.000Z'
  },
  {
    id: '4a1750e8-1201-459f-8488-3ec68980c327',
    name: 'Vinay Kumar',
    email: 'vkjnv7@gmail.com',
    provider: 'Google',
    created_at: '2026-07-07T11:00:00.000Z'
  },
  {
    id: 'e47084cd-dcf3-4d78-b7e7-24b8051988e2',
    name: 'Yash Pandey',
    email: 'yashpanday08@gmail.com',
    provider: 'Google',
    created_at: '2026-06-20T17:00:00.000Z'
  }
];

/**
 * Get all cached user profiles.
 */
export const getCachedUserProfiles = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeUserLists(SEED_SUPABASE_USERS, parsed);
        }
      }
    }
  } catch (e) {
    console.warn('Error loading cached user profiles:', e);
  }
  return SEED_SUPABASE_USERS;
};

/**
 * Merge two user lists by ID or email without duplicates.
 */
export const mergeUserLists = (baseList, incomingList) => {
  const map = new Map();

  baseList.forEach(u => {
    map.set(u.id, { ...u });
    if (u.email) map.set(normalizeEmail(u.email), { ...u });
  });

  incomingList.forEach(u => {
    if (!u) return;
    const existing = (u.id && map.get(u.id)) || (u.email && map.get(normalizeEmail(u.email)));
    if (existing) {
      Object.assign(existing, {
        ...u,
        name: u.name || existing.name,
        email: u.email || existing.email,
        provider: u.provider || existing.provider,
        created_at: existing.created_at || u.created_at
      });
      map.set(existing.id, existing);
    } else if (u.id) {
      map.set(u.id, { ...u });
    }
  });

  // Extract unique objects
  const uniqueUsers = [];
  const seenIds = new Set();
  for (const user of map.values()) {
    if (user.id && !seenIds.has(user.id)) {
      seenIds.add(user.id);
      uniqueUsers.push(user);
    }
  }
  return uniqueUsers;
};

/**
 * Sync user profile when authenticated user logs in.
 */
export const syncCurrentUserProfile = async (user) => {
  if (!user || !user.id) return;
  const email = user.email || user.user_metadata?.email || '';
  const fullName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.raw_user_meta_data?.name || 
                   (email ? email.split('@')[0] : 'User');
  const avatarUrl = user.user_metadata?.avatar_url || 
                    user.user_metadata?.picture || 
                    user.raw_user_meta_data?.picture || '';
  const provider = user.app_metadata?.provider || (user.identities?.[0]?.provider) || 'Google';

  const userProfile = {
    id: user.id,
    name: fullName,
    email: email,
    avatar_url: avatarUrl,
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    last_sign_in_at: new Date().toISOString(),
    created_at: user.created_at || new Date().toISOString()
  };

  try {
    const cached = getCachedUserProfiles();
    const updated = mergeUserLists(cached, [userProfile]);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updated));
    }

    // Also persist to Supabase sync config table
    await supabase.from('rooms').upsert([
      {
        id: `usr_${user.id.slice(0, 30)}`,
        title: `Profile: ${fullName}`,
        user_id: user.id,
        folder: REGISTRY_FOLDER,
        video_url: JSON.stringify(userProfile)
      }
    ], { onConflict: 'id' });
  } catch (e) {
    console.warn('Could not sync user profile to database:', e);
  }
};

/**
 * Fetch all registered users from Supabase and cache.
 */
export const fetchAllRegisteredUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, user_id, video_url')
      .eq('folder', REGISTRY_FOLDER);

    if (!error && data && data.length > 0) {
      const dbUsers = [];
      data.forEach(row => {
        if (row.video_url) {
          try {
            const parsed = JSON.parse(row.video_url);
            if (parsed && parsed.id) {
              dbUsers.push(parsed);
            }
          } catch {
            // Ignore non-JSON
          }
        }
      });

      const merged = mergeUserLists(SEED_SUPABASE_USERS, dbUsers);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch registered users from database:', e);
  }
  return getCachedUserProfiles();
};

const EXCLUDED_FOLDER = '__system_excluded_users__';
const EXCLUDED_STORAGE_KEY = 'markit_excluded_user_ids';

/**
 * Get locally cached excluded user IDs.
 * @returns {string[]}
 */
export const getCachedExcludedUserIds = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(EXCLUDED_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading excluded user IDs:', e);
  }
  return [];
};

/**
 * Sync excluded user IDs from Supabase and cache.
 * @returns {Promise<string[]>}
 */
export const syncExcludedUsersWithDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, video_url')
      .eq('folder', EXCLUDED_FOLDER)
      .limit(1);

    if (!error && data && data.length > 0 && data[0].video_url) {
      try {
        const parsed = JSON.parse(data[0].video_url);
        if (Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch {
        // Ignore JSON error
      }
    }
  } catch (e) {
    console.warn('Could not sync excluded users from database:', e);
  }
  return getCachedExcludedUserIds();
};

/**
 * Save excluded user IDs to both localStorage and Supabase.
 * @param {string[]} ids 
 * @param {string} [adminUserId]
 */
export const saveExcludedUsers = async (ids, adminUserId) => {
  const cleanIds = Array.from(new Set(ids.filter(Boolean)));
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(cleanIds));
    }

    await supabase.from('rooms').upsert([
      {
        id: 'cfg_excluded_users',
        title: 'System Config: Excluded Users',
        user_id: adminUserId || 'system',
        folder: EXCLUDED_FOLDER,
        video_url: JSON.stringify(cleanIds)
      }
    ], { onConflict: 'id' });
  } catch (e) {
    console.warn('Could not persist excluded users to database:', e);
  }
  return cleanIds;
};

