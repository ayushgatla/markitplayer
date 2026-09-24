import { supabase } from '../supabaseClient.js';
import { normalizeEmail } from './adminHelper.js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                     (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
                     'https://yfhpubzwhrvvyspswizj.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                          (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
                          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHB1Ynp3aHJ2dnlzcHN3aXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzA2OTcsImV4cCI6MjA5NzQ0NjY5N30.vPCSohWRyqsAnvjZD1ux4f1CldwmWGRg8IDI0N4j6XE';

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
  },
  {
    id: 'auth-user-achuchannelvloger',
    name: 'Achu Channel Vloger',
    email: 'achuchannelvloger@gmail.com',
    provider: 'Google',
    created_at: '2026-07-08T10:00:00.000Z'
  },
  {
    id: 'auth-user-amitanshupadhee',
    name: 'Amitanshu Padhee',
    email: 'amitanshupadhee205@gmail.com',
    provider: 'Google',
    created_at: '2026-07-09T11:00:00.000Z'
  },
  {
    id: 'auth-user-arijitbose',
    name: 'Arijit Bose',
    email: 'arijit.bose@mastersunion.org',
    provider: 'Email, Google',
    created_at: '2026-07-10T12:00:00.000Z'
  },
  {
    id: 'auth-user-ayushgatla07',
    name: 'Ayush Gatla',
    email: 'ayushgatla07@gmail.com',
    provider: 'Google',
    created_at: '2026-07-11T13:00:00.000Z'
  },
  {
    id: 'auth-user-bkkartik',
    name: 'Kartik BK',
    email: 'bkkartik0407@gmail.com',
    provider: 'Google',
    created_at: '2026-07-12T14:00:00.000Z'
  },
  {
    id: 'auth-user-creativeforcemedia',
    name: 'Creative Force Media',
    email: 'creativeforcemediaofficial@gmail.com',
    provider: 'Google',
    created_at: '2026-07-13T15:00:00.000Z'
  },
  {
    id: 'auth-user-designsindiratrade',
    name: 'Indira Trade Designs',
    email: 'designs@indiratrade.com',
    provider: 'Email',
    created_at: '2026-07-14T16:00:00.000Z'
  },
  {
    id: 'auth-user-editsbyalex',
    name: 'Edits by Alex',
    email: 'editsbyalex.ced@gmail.com',
    provider: 'Google',
    created_at: '2026-07-15T17:00:00.000Z'
  },
  {
    id: 'auth-user-fahvocruz',
    name: 'Fahvo Cruz',
    email: 'fahvocruz@gmail.com',
    provider: 'Google',
    created_at: '2026-07-16T18:00:00.000Z'
  },
  {
    id: 'auth-user-garv250904',
    name: 'Garv',
    email: 'garv250904@gmail.com',
    provider: 'Google',
    created_at: '2026-07-17T19:00:00.000Z'
  },
  {
    id: 'auth-user-garvitbalbirsingh',
    name: 'Garvit Balbir Singh',
    email: 'garvitbalbirsingh@gmail.com',
    provider: 'Google',
    created_at: '2026-07-18T10:00:00.000Z'
  },
  {
    id: 'auth-user-garvjain',
    name: 'Garv Jain',
    email: 'garvjain.work@gmail.com',
    provider: 'Google',
    created_at: '2026-07-19T11:00:00.000Z'
  },
  {
    id: 'auth-user-harshshah',
    name: 'Harsh Shah',
    email: 'harshshah9975@gmail.com',
    provider: 'Google',
    created_at: '2026-07-20T12:00:00.000Z'
  },
  {
    id: 'auth-user-khalil',
    name: 'Khalil',
    email: 'khalil030922@gmail.com',
    provider: 'Google',
    created_at: '2026-07-21T13:00:00.000Z'
  },
  {
    id: 'auth-user-kishorepadda',
    name: 'Kishore Padda',
    email: 'kishorepadda50@gmail.com',
    provider: 'Google',
    created_at: '2026-07-22T14:00:00.000Z'
  },
  {
    id: 'auth-user-mei',
    name: 'Mei',
    email: 'mei979144@gmail.com',
    provider: 'Google',
    created_at: '2026-07-23T15:00:00.000Z'
  },
  {
    id: 'auth-user-narulaaryan',
    name: 'Aryan Narula',
    email: 'narulaaryan703@gmail.com',
    provider: 'Google',
    created_at: '2026-07-24T16:00:00.000Z'
  },
  {
    id: 'auth-user-novalagecy',
    name: 'Nova Legacy',
    email: 'novalagecy@gmail.com',
    provider: 'Google',
    created_at: '2026-07-25T17:00:00.000Z'
  },
  {
    id: 'auth-user-prathameshj',
    name: 'Prathamesh J',
    email: 'prathameshj899@gmail.com',
    provider: 'Google',
    created_at: '2026-07-26T18:00:00.000Z'
  },
  {
    id: 'auth-user-rahulmuraleedharan',
    name: 'Rahul Muraleedharan',
    email: 'rahulmuraleedharanhere@gmail.com',
    provider: 'Google',
    created_at: '2026-07-27T19:00:00.000Z'
  },
  {
    id: 'auth-user-shaheen',
    name: 'Shaheen',
    email: 'shaheen201@gmail.com',
    provider: 'Google',
    created_at: '2026-07-28T20:00:00.000Z'
  },
  {
    id: 'auth-user-venginoski',
    name: 'Venginoski G',
    email: 'venginoskig@gmail.com',
    provider: 'Google',
    created_at: '2026-07-29T21:00:00.000Z'
  },
  {
    id: 'auth-user-vrushabhshivankar',
    name: 'Vrushabh Shivankar',
    email: 'vrushabhshivankar78@gmail.com',
    provider: 'Google',
    created_at: '2026-07-30T22:00:00.000Z'
  },
  {
    id: 'auth-user-workmaqsoodrai',
    name: 'Maqsood Rai',
    email: 'work.maqsoodraisk@gmail.com',
    provider: 'Google',
    created_at: '2026-07-31T23:00:00.000Z'
  },
  {
    id: 'auth-user-yadavnarayan',
    name: 'Narayan Yadav',
    email: 'yadavnarayann@gmail.com',
    provider: 'Google',
    created_at: '2026-08-01T10:00:00.000Z'
  }
];

/**
 * Get all cached user profiles (only real logged-in editors).
 */
export const getCachedUserProfiles = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanProfiles = parsed.filter(u => u && u.id && !u.id.startsWith('seed-mock-'));
          return mergeUserLists(SEED_SUPABASE_USERS, cleanProfiles);
        }
      }
    }
  } catch (e) {
    console.warn('Error loading cached user profiles:', e);
  }
  return [...SEED_SUPABASE_USERS];
};

/**
 * Merge two user lists by ID or email without duplicates.
 * Guarantees strict uniqueness by email and ID, prioritizing real Supabase UUIDs over placeholder IDs.
 */
export const mergeUserLists = (baseList, incomingList) => {
  const idMap = new Map();
  const emailMap = new Map();

  const processUser = (u) => {
    if (!u) return;
    const cleanEmail = u.email ? normalizeEmail(u.email) : null;
    let existing = (cleanEmail && emailMap.get(cleanEmail)) || (u.id && idMap.get(u.id));

    if (existing) {
      // If incoming user has a real UUID and existing has a placeholder auth-user-*, upgrade the ID
      const isIncomingRealId = u.id && !u.id.startsWith('auth-user-') && !u.id.startsWith('seed-mock-');
      const isExistingPlaceholder = existing.id && (existing.id.startsWith('auth-user-') || existing.id.startsWith('seed-mock-'));

      if (isIncomingRealId && isExistingPlaceholder) {
        idMap.delete(existing.id);
        existing.id = u.id;
        idMap.set(u.id, existing);
      }

      existing.name = (u.name && !u.name.startsWith('Editor_')) ? u.name : (existing.name || u.name);
      if (cleanEmail) existing.email = u.email;
      if (u.avatar_url) existing.avatar_url = u.avatar_url || existing.avatar_url;
      if (u.provider) existing.provider = u.provider || existing.provider;
      if (u.created_at) existing.created_at = existing.created_at || u.created_at;
      if (u.last_sign_in_at) existing.last_sign_in_at = u.last_sign_in_at || existing.last_sign_in_at;

      if (cleanEmail) emailMap.set(cleanEmail, existing);
      if (existing.id) idMap.set(existing.id, existing);
    } else {
      const userObj = { ...u };
      if (cleanEmail) {
        userObj.email = u.email;
        emailMap.set(cleanEmail, userObj);
      }
      if (userObj.id) {
        idMap.set(userObj.id, userObj);
      }
    }
  };

  (baseList || []).forEach(processUser);
  (incomingList || []).forEach(processUser);

  const uniqueUsers = [];
  const seenIds = new Set();
  const seenEmails = new Set();

  const allRecords = [...idMap.values(), ...emailMap.values()];
  for (const user of allRecords) {
    if (!user) continue;
    const cleanEmail = user.email ? normalizeEmail(user.email) : null;
    const idKey = user.id;

    if (idKey && seenIds.has(idKey)) continue;
    if (cleanEmail && seenEmails.has(cleanEmail)) continue;

    if (idKey) seenIds.add(idKey);
    if (cleanEmail) seenEmails.add(cleanEmail);

    uniqueUsers.push(user);
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
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', REGISTRY_FOLDER)
      .eq('user_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('rooms')
        .update({
          title: `Profile: ${fullName}`,
          video_url: JSON.stringify(userProfile)
        })
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('rooms')
        .insert([{
          title: `Profile: ${fullName}`,
          user_id: user.id,
          folder: REGISTRY_FOLDER,
          video_url: JSON.stringify(userProfile)
        }]);
    }
  } catch (e) {
    console.warn('Could not sync user profile to database:', e);
  }
};

/**
 * Live-fetches all authenticated users directly from Supabase.
 * Attempts:
 * 1. Supabase Postgres RPC function `get_auth_users()` or `get_users()` (fetches directly from auth.users).
 * 2. Backend API / Cloudflare Worker endpoint if available.
 * 3. Database user registry saved in `rooms` table (folder = '__system_user_registry__').
 * 4. Fallback to cached profiles and seed list.
 *
 * @returns {Promise<Array<{id: string, name: string, email: string, provider?: string, created_at?: string, last_sign_in_at?: string}>>}
 */
export const fetchLiveAuthenticatedUsers = async () => {
  let liveUsers = [];

  // Strategy 1: Supabase RPC (Postgres function querying auth.users with SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_auth_users');
    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      liveUsers = rpcData.map(u => {
        const meta = u.raw_user_meta_data || u.user_metadata || {};
        const email = u.email || meta.email || '';
        const name = meta.full_name || meta.name || (email ? email.split('@')[0] : 'User');
        const provider = meta.provider || (u.identities?.[0]?.provider) || (email.includes('@gmail') ? 'Google' : 'Email');
        return {
          id: u.id,
          name: name,
          email: email,
          avatar_url: meta.avatar_url || meta.picture || '',
          provider: provider.charAt(0).toUpperCase() + provider.slice(1),
          created_at: u.created_at || new Date().toISOString(),
          last_sign_in_at: u.last_sign_in_at || null
        };
      });
    }
  } catch (err) {
    console.debug('RPC get_auth_users not available:', err?.message || err);
  }

  // Strategy 2: Check standard users / profiles table if present
  if (liveUsers.length === 0) {
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*');
      if (!profErr && Array.isArray(profiles) && profiles.length > 0) {
        liveUsers = profiles.map(p => ({
          id: p.id || p.user_id,
          name: p.full_name || p.name || p.username || (p.email ? p.email.split('@')[0] : 'User'),
          email: p.email || '',
          avatar_url: p.avatar_url || '',
          provider: p.provider || 'Google',
          created_at: p.created_at || new Date().toISOString()
        }));
      }
    } catch {
      // Table doesn't exist, proceed to next strategy
    }
  }

  // Strategy 3: Query Supabase Database Registry in `rooms` table
  try {
    const { data: regData, error: regError } = await supabase
      .from('rooms')
      .select('id, user_id, video_url')
      .eq('folder', REGISTRY_FOLDER);

    if (!regError && Array.isArray(regData) && regData.length > 0) {
      const dbUsers = [];
      regData.forEach(row => {
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
      liveUsers = mergeUserLists(liveUsers, dbUsers);
    }
  } catch (err) {
    console.warn('Could not fetch registered users from database registry:', err);
  }

  // Strategy 4: Merge with hardcoded seed list & localStorage cache for maximum coverage
  const cached = getCachedUserProfiles();
  const allMergedUsers = mergeUserLists(mergeUserLists(SEED_SUPABASE_USERS, cached), liveUsers);

  // Update localStorage cache
  if (typeof window !== 'undefined' && window.localStorage && allMergedUsers.length > 0) {
    try {
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(allMergedUsers));
    } catch (e) {
      console.warn('Error caching users:', e);
    }
  }

  return allMergedUsers;
};

/**
 * Fetch all registered users from Supabase and cache (alias for fetchLiveAuthenticatedUsers).
 */
export const fetchAllRegisteredUsers = fetchLiveAuthenticatedUsers;

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
  // 1. Try REST API with anon key
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?folder=eq.${EXCLUDED_FOLDER}&select=id,video_url,created_at&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].video_url) {
        const parsed = JSON.parse(rows[0].video_url);
        if (Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    }
  } catch (e) {
    console.debug('REST excluded sync fallback:', e);
  }

  // 2. Client fallback
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

    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', EXCLUDED_FOLDER)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('rooms')
        .update({
          video_url: JSON.stringify(cleanIds)
        })
        .eq('id', existing[0].id);
    } else if (adminUserId && adminUserId !== 'system') {
      await supabase
        .from('rooms')
        .insert([{
          title: 'System Config: Excluded Users',
          user_id: adminUserId,
          folder: EXCLUDED_FOLDER,
          video_url: JSON.stringify(cleanIds)
        }]);
    }
  } catch (e) {
    console.warn('Could not persist excluded users to database:', e);
  }
  return cleanIds;
};

/**
 * Clear all exclusions from both localStorage and Supabase.
 * @param {string} [adminUserId]
 */
export const clearAllExcludedUsers = async (adminUserId) => {
  return saveExcludedUsers([], adminUserId);
};

const MAILED_FOLDER = '__system_mailed_users__';
const MAILED_STORAGE_KEY = 'markit_mailed_users_map';

/**
 * Get locally cached mailed users dictionary.
 * Format: { [userEmailOrId]: { id, email, mailedAt, templateKey } }
 * @returns {Record<string, { id?: string, email?: string, mailedAt: string, templateKey?: string }>}
 */
export const getCachedMailedUsers = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(MAILED_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading cached mailed users:', e);
  }
  return {};
};

/**
 * Sync mailed users from Supabase and cache.
 * @returns {Promise<Record<string, { id?: string, email?: string, mailedAt: string, templateKey?: string }>>}
 */
export const syncMailedUsersWithDatabase = async () => {
  // 1. Try REST API with anon key
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?folder=eq.${MAILED_FOLDER}&select=id,video_url,created_at&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].video_url) {
        const parsed = JSON.parse(rows[0].video_url);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(MAILED_STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    }
  } catch (e) {
    console.debug('REST mailed sync fallback:', e);
  }

  // 2. Client fallback
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, video_url')
      .eq('folder', MAILED_FOLDER)
      .limit(1);

    if (!error && data && data.length > 0 && data[0].video_url) {
      try {
        const parsed = JSON.parse(data[0].video_url);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(MAILED_STORAGE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch {
        // Ignore JSON error
      }
    }
  } catch (e) {
    console.warn('Could not sync mailed users from database:', e);
  }
  return getCachedMailedUsers();
};

/**
 * Save mailed users map to both localStorage and Supabase.
 * @param {Record<string, any>} map 
 * @param {string} [adminUserId]
 */
export const saveMailedUsers = async (map, adminUserId) => {
  const cleanMap = { ...(map || {}) };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MAILED_STORAGE_KEY, JSON.stringify(cleanMap));
    }

    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('folder', MAILED_FOLDER)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('rooms')
        .update({
          video_url: JSON.stringify(cleanMap)
        })
        .eq('id', existing[0].id);
    } else if (adminUserId && adminUserId !== 'system') {
      await supabase
        .from('rooms')
        .insert([{
          title: 'System Config: Mailed Users History',
          user_id: adminUserId,
          folder: MAILED_FOLDER,
          video_url: JSON.stringify(cleanMap)
        }]);
    }
  } catch (e) {
    console.warn('Could not persist mailed users to database:', e);
  }
  return cleanMap;
};

/**
 * Mark a list of users/emails as mailed.
 * @param {Array<{ id?: string, email?: string } | string>} users 
 * @param {string} [templateKey]
 * @param {string} [adminUserId]
 */
export const markUsersAsMailed = async (users, templateKey = 'update', adminUserId) => {
  const current = getCachedMailedUsers();
  const next = { ...current };
  const now = new Date().toISOString();

  users.forEach(item => {
    if (!item) return;
    const email = typeof item === 'string' ? item : item.email;
    const id = typeof item === 'string' ? null : item.id;
    const record = { id: id || null, email: email || null, mailedAt: now, templateKey };

    if (email) {
      next[normalizeEmail(email)] = record;
    }
    if (id) {
      next[id] = record;
    }
  });

  return saveMailedUsers(next, adminUserId);
};

/**
 * Unmark a list of users/emails from mailed.
 * @param {Array<{ id?: string, email?: string } | string>} users 
 * @param {string} [adminUserId]
 */
export const unmarkUsersAsMailed = async (users, adminUserId) => {
  const current = getCachedMailedUsers();
  const next = { ...current };

  users.forEach(item => {
    if (!item) return;
    const email = typeof item === 'string' ? item : item.email;
    const id = typeof item === 'string' ? null : item.id;

    if (email && next[normalizeEmail(email)]) {
      delete next[normalizeEmail(email)];
    }
    if (id && next[id]) {
      delete next[id];
    }
  });

  return saveMailedUsers(next, adminUserId);
};
