import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Film,
  MessageSquare,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ExternalLink,
  Layers,
  BarChart3,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Crown,
  ChevronRight,
  TrendingUp,
  EyeOff,
  Eye,
  UserMinus,
  UserPlus,
  Check,
  Filter,
  Menu,
  X,
  Bell,
  Star,
  Moon,
  Folder,
  LayoutGrid,
  Activity,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  ChevronDown,
  Mail,
  Send,
  Copy,
  Inbox,
  AtSign,
  CheckCheck,
  Trophy,
  Flame,
  Zap,
  Medal,
  Award
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  isAdmin,
  isPrimaryAdmin,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  syncAdminEmailsWithDatabase,
  normalizeEmail,
  PRIMARY_ADMIN_EMAIL
} from '../utils/adminHelper';
import { parseVideoData, getActiveVideoUrl, detectPlatform } from '../utils/versionHelper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import {
  fetchAllRegisteredUsers,
  fetchLiveAuthenticatedUsers,
  getCachedUserProfiles,
  syncExcludedUsersWithDatabase,
  saveExcludedUsers,
  getCachedExcludedUserIds,
  getCachedMailedUsers,
  syncMailedUsersWithDatabase,
  markUsersAsMailed,
  unmarkUsersAsMailed
} from '../utils/userRegistry';

dayjs.extend(relativeTime);

export const EMAIL_TEMPLATES = {
  update: {
    name: 'Product Update & Features',
    subject: '[Blasync] Major Update: Video Version Switching & Performance Upgrades',
    body: `Hi {{name}},\n\nWe've released important new features on Blasync to speed up your video revision workflow:\n\n• Multi-Version Video Management: Add V1, V2, and new video versions right inside your project without creating separate links.\n• Instant Streaming: High-speed video playback and timeline markers.\n• Client Review Mode: Gather frame-accurate notes, drawings, and approvals seamlessly.\n\nLog in and try out the new tools on your dashboard:\nhttps://blasync.in/dashboard\n\nIf you have any questions or feedback, just reply to this email!\n\nBest regards,\nAyush & the Blasync Team`
  },
  feedback: {
    name: 'Feedback & Feature Request',
    subject: '[Blasync] How has your video review experience been?',
    body: `Hi {{name}},\n\nWe're building Blasync specifically with video editors, and your feedback is essential to making it the best collaboration platform.\n\nWe'd love to know:\n1. What has been your favorite part of using Blasync so far?\n2. What feature, shortcut, or integration would save you the most time?\n\nSimply reply directly to this email with your thoughts — we read and respond to every note!\n\nBest regards,\nAyush from Blasync`
  },
  welcome: {
    name: 'Welcome to Blasync Beta',
    subject: 'Welcome to Blasync: The Modern Video Collaboration Tool',
    body: `Hi {{name}},\n\nWelcome to Blasync! You're all set to share your video edits with clients, collect timeline notes, and streamline client approvals.\n\nGet started in 30 seconds:\n1. Go to https://blasync.in/dashboard\n2. Create a session and paste a Google Drive or YouTube link\n3. Share the client review link to start getting frame-accurate comments!\n\nIf you need any support, reach out to us at support@blasync.in.\n\nBest regards,\nThe Blasync Team`
  },
  custom: {
    name: 'Custom Email',
    subject: '[Blasync] Important Notice for Video Editors',
    body: `Hi {{name}},\n\n\n\nBest regards,\nThe Blasync Team`
  }
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'users' | 'emails' | 'admins' | 'analytics'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [comments, setComments] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState(getCachedUserProfiles());
  const [excludedUserIds, setExcludedUserIds] = useState(() => new Set(getCachedExcludedUserIds()));
  const [mailedUsersData, setMailedUsersData] = useState(() => getCachedMailedUsers());
  const [userFilterTab, setUserFilterTab] = useState('all'); // 'all' | 'active' | 'excluded'
  const [adminList, setAdminList] = useState(getAdminEmails());
  const [newAdminInput, setNewAdminInput] = useState('');
  const [adminMessage, setAdminMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [userSortBy, setUserSortBy] = useState('activity-desc'); // 'activity-desc' | 'rooms-desc' | 'comments-desc' | 'active-desc' | 'joined-desc' | 'joined-asc'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('monthly'); // 'all' | 'monthly' | 'weekly' | 'today'

  // Email Broadcast State
  const [selectedEmailUserIds, setSelectedEmailUserIds] = useState(() => new Set());
  const [emailFilter, setEmailFilter] = useState('unmailed'); // 'unmailed' | 'all' | 'mailed' | 'active' | 'google' | 'email'
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState('all'); // 'all' | 'selected' | 'single'
  const [singleTargetUser, setSingleTargetUser] = useState(null);
  const [emailSubject, setEmailSubject] = useState(EMAIL_TEMPLATES.update.subject);
  const [emailBody, setEmailBody] = useState(EMAIL_TEMPLATES.update.body);
  const [emailTemplateKey, setEmailTemplateKey] = useState('update');
  const [emailCopiedFeedback, setEmailCopiedFeedback] = useState(null);
  const [singleCopiedEmail, setSingleCopiedEmail] = useState(null);
  const [autoMarkMailed, setAutoMarkMailed] = useState(true);

  const userEmail = user?.email || user?.user_metadata?.email || user?.raw_user_meta_data?.email || '';

  const userIsAdmin = useMemo(() => {
    if (!userEmail) return false;
    const cleanUser = normalizeEmail(userEmail);
    return isAdmin(cleanUser) || adminList.map(normalizeEmail).includes(cleanUser);
  }, [userEmail, adminList]);

  // Global data fetching helper to ensure admin sees all rooms across all editors (bypassing user-scoped RLS)
  const fetchGlobalRooms = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfhpubzwhrvvyspswizj.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHB1Ynp3aHJ2dnlzcHN3aXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzA2OTcsImV4cCI6MjA5NzQ0NjY5N30.vPCSohWRyqsAnvjZD1ux4f1CldwmWGRg8IDI0N4j6XE';
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rooms?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('REST rooms fetch error, falling back to client:', e);
    }
    const fallback = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
    return fallback.data || [];
  };

  const fetchGlobalComments = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfhpubzwhrvvyspswizj.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaHB1Ynp3aHJ2dnlzcHN3aXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzA2OTcsImV4cCI6MjA5NzQ0NjY5N30.vPCSohWRyqsAnvjZD1ux4f1CldwmWGRg8IDI0N4j6XE';
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/comments?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('REST comments fetch error, falling back to client:', e);
    }
    const fallback = await supabase.from('comments').select('*').order('created_at', { ascending: false });
    return fallback.data || [];
  };

  // Robust data fetching from Supabase
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [allRooms, allComments, syncedAdmins, syncedUsers, syncedExcluded, syncedMailed] = await Promise.all([
        fetchGlobalRooms(),
        fetchGlobalComments(),
        syncAdminEmailsWithDatabase(),
        fetchLiveAuthenticatedUsers(),
        syncExcludedUsersWithDatabase(),
        syncMailedUsersWithDatabase()
      ]);

      if (allRooms && Array.isArray(allRooms)) {
        const realRooms = allRooms.filter(
          r => r.folder !== '__system_admin_config__' && 
               r.folder !== '__system_user_registry__' &&
               r.folder !== '__system_excluded_users__' &&
               r.folder !== '__system_mailed_users__'
        );
        setRooms(realRooms);
      }
      if (allComments && Array.isArray(allComments)) setComments(allComments);
      if (syncedAdmins) setAdminList(syncedAdmins);
      if (syncedUsers) setRegisteredUsers(syncedUsers);
      if (syncedExcluded) setExcludedUserIds(new Set(syncedExcluded));
      if (syncedMailed) setMailedUsersData(syncedMailed);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      setLoading(true);
      try {
        const [syncedAdmins, initialUsers, syncedExcluded, syncedMailed] = await Promise.all([
          syncAdminEmailsWithDatabase(),
          fetchLiveAuthenticatedUsers(),
          syncExcludedUsersWithDatabase(),
          syncMailedUsersWithDatabase()
        ]);
        if (isMounted) {
          if (syncedAdmins) setAdminList(syncedAdmins);
          if (initialUsers) setRegisteredUsers(initialUsers);
          if (syncedExcluded) setExcludedUserIds(new Set(syncedExcluded));
          if (syncedMailed) setMailedUsersData(syncedMailed);
        }
        const cleanUser = normalizeEmail(userEmail);
        const hasAccess = isAdmin(cleanUser) || (syncedAdmins || []).map(normalizeEmail).includes(cleanUser);
        if (hasAccess) {
          await fetchData();
        }
      } catch (err) {
        console.error('Admin init error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();
    return () => { isMounted = false; };
  }, [user, userEmail]);

  // Real-time synchronization for Admin Console & Privilege Revocation
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, async (payload) => {
        if (payload?.new?.folder === '__system_admin_config__' || payload?.old?.folder === '__system_admin_config__') {
          const synced = await syncAdminEmailsWithDatabase();
          if (synced) setAdminList(synced);
        }
        if (userIsAdmin) {
          fetchData();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        if (userIsAdmin) {
          fetchData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userIsAdmin]);

  const handleToggleUserExclusion = async (userId, uEmail) => {
    const next = new Set(excludedUserIds);
    const idKey = userId;
    const emailKey = uEmail ? normalizeEmail(uEmail) : null;

    const isExcluded = next.has(idKey) || (emailKey && next.has(emailKey));
    if (isExcluded) {
      next.delete(idKey);
      if (emailKey) next.delete(emailKey);
    } else {
      next.add(idKey);
      if (emailKey) next.add(emailKey);
    }

    setExcludedUserIds(next);
    await saveExcludedUsers(Array.from(next), user?.id);
  };

  const handleUpdateRoomState = async (roomId, newState) => {
    try {
      const { error } = await supabase.from('rooms').update({ state: newState }).eq('id', roomId);
      if (error) throw error;
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, state: newState } : r));
    } catch (e) {
      alert(`Failed to update state: ${e.message}`);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (e) {
      alert(`Failed to delete session: ${e.message}`);
    }
  };

  // Live Statistics Calculation with Dynamic User Extraction
  const stats = useMemo(() => {
    const idMap = new Map();
    const emailMap = new Map();

    const insertOrUpdateUser = (u) => {
      if (!u || !u.id) return;
      const cleanEmail = u.email ? normalizeEmail(u.email) : null;
      let existing = (cleanEmail && emailMap.get(cleanEmail)) || idMap.get(u.id);

      const isExcluded = excludedUserIds.has(u.id) || (cleanEmail && excludedUserIds.has(cleanEmail));

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
        if (u.created_at) existing.firstSeen = existing.firstSeen || u.created_at;
        if (u.last_sign_in_at) existing.lastActive = u.last_sign_in_at || existing.lastActive;
        existing.isExcluded = isExcluded || existing.isExcluded;

        if (cleanEmail) emailMap.set(cleanEmail, existing);
        if (existing.id) idMap.set(existing.id, existing);
      } else {
        const userObj = {
          id: u.id,
          name: u.name || (cleanEmail ? cleanEmail.split('@')[0] : `Editor_${u.id.slice(0, 6)}`),
          email: u.email || null,
          avatar_url: u.avatar_url || '',
          provider: u.provider || 'Google',
          roomsCount: 0,
          commentsCount: 0,
          firstSeen: u.created_at || new Date().toISOString(),
          lastActive: u.last_sign_in_at || u.created_at || new Date().toISOString(),
          rooms: [],
          isExcluded
        };

        if (cleanEmail) emailMap.set(cleanEmail, userObj);
        if (userObj.id) idMap.set(userObj.id, userObj);
      }
    };

    // 1. Seed with registered / logged-in editors only
    (registeredUsers || []).forEach(insertOrUpdateUser);

    // 2. Include current admin user if authenticated and not yet in map
    if (user && user.id) {
      const email = user.email || user.user_metadata?.email || '';
      const name = user.user_metadata?.full_name || user.user_metadata?.name || (email ? email.split('@')[0] : 'Admin');
      insertOrUpdateUser({
        id: user.id,
        name,
        email: email || null,
        avatar_url: user.user_metadata?.avatar_url || '',
        provider: user.app_metadata?.provider || 'Google',
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: new Date().toISOString()
      });
    }

    // 3. Attach rooms to their respective editor creator
    rooms.forEach(room => {
      const uId = room.user_id;
      if (!uId) return;

      const u = idMap.get(uId);
      if (u) {
        u.roomsCount += 1;
        u.rooms.push(room);
        if (room.created_at && new Date(room.created_at) < new Date(u.firstSeen)) u.firstSeen = room.created_at;
        if (room.created_at && new Date(room.created_at) > new Date(u.lastActive)) u.lastActive = room.created_at;
      } else {
        const isExcluded = excludedUserIds.has(uId);
        const newU = {
          id: uId,
          name: `Editor_${uId.slice(0, 6)}`,
          email: null,
          avatar_url: '',
          provider: 'Supabase User',
          roomsCount: 1,
          commentsCount: 0,
          firstSeen: room.created_at || new Date().toISOString(),
          lastActive: room.created_at || new Date().toISOString(),
          rooms: [room],
          isExcluded
        };
        idMap.set(uId, newU);
      }
    });

    // 4. Attach comments count
    comments.forEach(comment => {
      const uId = comment.user_id;
      if (uId && idMap.has(uId)) {
        const u = idMap.get(uId);
        u.commentsCount += 1;
        if (comment.created_at && new Date(comment.created_at) > new Date(u.lastActive)) {
          u.lastActive = comment.created_at;
        }
      }
    });

    // Extract deduplicated unique user records across idMap and emailMap
    const uniqueMap = new Map();
    const seenEmails = new Set();

    for (const u of [...idMap.values(), ...emailMap.values()]) {
      if (!u || !u.id) continue;
      const cleanEmail = u.email ? normalizeEmail(u.email) : null;
      if (cleanEmail && seenEmails.has(cleanEmail)) continue;
      if (uniqueMap.has(u.id)) continue;

      if (cleanEmail) seenEmails.add(cleanEmail);
      uniqueMap.set(u.id, u);
    }

    // Calculate comprehensive activity score & metrics for each user
    const now = dayjs();
    const scoredUsers = Array.from(uniqueMap.values()).map(u => {
      const firstSeenDay = u.firstSeen ? dayjs(u.firstSeen) : now;
      const lastActiveDay = u.lastActive ? dayjs(u.lastActive) : firstSeenDay;
      
      const activeSpanHours = Math.max(0, lastActiveDay.diff(firstSeenDay, 'hour', true));
      const activeSpanDays = Math.max(0, lastActiveDay.diff(firstSeenDay, 'day', true));
      
      const daysSinceActive = Math.max(0, now.diff(lastActiveDay, 'day'));
      
      let recencyMultiplier = 1.0;
      if (daysSinceActive <= 1) recencyMultiplier = 1.6;
      else if (daysSinceActive <= 7) recencyMultiplier = 1.3;
      else if (daysSinceActive <= 30) recencyMultiplier = 1.0;
      else recencyMultiplier = 0.7;

      // Activity Formula: Rooms (x35) + Comments (x15) + Lifespan Active Days (x10) + Active Session Bonus
      const rawActivityScore = (u.roomsCount * 35) + 
                               (u.commentsCount * 15) + 
                               (Math.min(activeSpanDays, 60) * 10) + 
                               (activeSpanHours > 0 ? 5 : 0);
      
      const activityScore = Math.max(1, Math.round(rawActivityScore * recencyMultiplier));

      let activityTier = 'Starter';
      let tierColor = 'text-zinc-400 border-zinc-700 bg-zinc-800/40';
      if (activityScore >= 200) {
        activityTier = 'Elite Champion';
        tierColor = 'text-amber-300 border-amber-500/40 bg-amber-500/10';
      } else if (activityScore >= 100) {
        activityTier = 'Power Editor';
        tierColor = 'text-purple-300 border-purple-500/40 bg-purple-500/10';
      } else if (activityScore >= 40) {
        activityTier = 'Active Contributor';
        tierColor = 'text-pink-300 border-pink-500/40 bg-pink-500/10';
      }

      return {
        ...u,
        activeSpanHours: Math.round(activeSpanHours * 10) / 10,
        activeSpanDays: Math.round(activeSpanDays * 10) / 10,
        rawActivityScore,
        activityScore,
        activityTier,
        tierColor,
        daysSinceActive
      };
    });

    // Rank all users by activityScore
    scoredUsers.sort((a, b) => b.activityScore - a.activityScore);
    scoredUsers.forEach((u, index) => {
      u.activityRank = index + 1;
    });

    const allUsersList = scoredUsers;
    const activeUsersList = allUsersList.filter(u => !u.isExcluded);
    const excludedUsersList = allUsersList.filter(u => u.isExcluded);
    const topActiveUsers = activeUsersList.slice(0, 3);

    // Platform distribution
    let driveCount = 0;
    let ytCount = 0;
    let instaCount = 0;
    let otherCount = 0;
    let totalVersions = 0;

    rooms.forEach(r => {
      const vData = parseVideoData(r.video_url, r.created_at);
      totalVersions += Math.max(1, vData.versions.length);
      const activeUrl = getActiveVideoUrl(r.video_url);
      const p = detectPlatform(activeUrl);
      if (p === 'drive') driveCount++;
      else if (p === 'youtube') ytCount++;
      else if (p === 'instagram') instaCount++;
      else if (activeUrl) otherCount++;
    });

    // State distribution
    const approvedCount = rooms.filter(r => (r.state || 'In Progress') === 'Approved').length;
    const inProgressCount = rooms.filter(r => (r.state || 'In Progress') === 'In Progress').length;
    const rejectedCount = rooms.filter(r => (r.state || 'In Progress') === 'Rejected').length;
    const completionRate = rooms.length > 0 ? Math.round((approvedCount / rooms.length) * 100) : 0;

    return {
      totalUsers: activeUsersList.length,
      totalRegistered: allUsersList.length,
      totalExcluded: excludedUsersList.length,
      users: allUsersList,
      activeUsers: activeUsersList,
      excludedUsers: excludedUsersList,
      topActiveUsers,
      totalRooms: rooms.length,
      totalComments: comments.length,
      totalVersions,
      completionRate,
      platforms: {
        drive: driveCount,
        youtube: ytCount,
        instagram: instaCount,
        other: otherCount,
        totalWithVideo: driveCount + ytCount + instaCount + otherCount
      },
      states: {
        approved: approvedCount,
        inProgress: inProgressCount,
        rejected: rejectedCount
      }
    };
  }, [rooms, comments, registeredUsers, excludedUserIds, user]);

  // Handle Admin Add / Remove
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminInput.trim()) return;
    const res = await addAdminEmail(newAdminInput.trim(), user?.id);
    if (res.success) {
      setAdminList(res.admins);
      setNewAdminInput('');
      setAdminMessage({ type: 'success', text: res.message });
    } else {
      setAdminMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setAdminMessage(null), 4000);
  };

  const handleRemoveAdmin = async (email) => {
    if (window.confirm(`Revoke admin access for ${email}?`)) {
      const res = await removeAdminEmail(email);
      if (res.success) {
        setAdminList(res.admins);
        setAdminMessage({ type: 'success', text: res.message });
      } else {
        setAdminMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setAdminMessage(null), 4000);
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesSearch = searchQuery
        ? (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.video_url || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus = selectedStatusFilter === 'all'
        ? true
        : (r.state || 'In Progress').toLowerCase() === selectedStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, selectedStatusFilter]);

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let list = stats.users;

    if (userFilterTab === 'active') {
      list = list.filter(u => !u.isExcluded);
    } else if (userFilterTab === 'excluded') {
      list = list.filter(u => u.isExcluded);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      if (userSortBy === 'activity-desc') return b.activityScore - a.activityScore;
      if (userSortBy === 'rooms-desc') return b.roomsCount - a.roomsCount;
      if (userSortBy === 'comments-desc') return b.commentsCount - a.commentsCount;
      if (userSortBy === 'span-desc') return (b.activeSpanHours || 0) - (a.activeSpanHours || 0);
      if (userSortBy === 'joined-desc') return new Date(b.firstSeen) - new Date(a.firstSeen);
      if (userSortBy === 'joined-asc') return new Date(a.firstSeen) - new Date(b.firstSeen);
      if (userSortBy === 'active-desc') return new Date(b.lastActive) - new Date(a.lastActive);
      return b.activityScore - a.activityScore;
    });
  }, [stats.users, searchQuery, userSortBy, userFilterTab]);

  // Filtered users for Email Broadcast tab with live Mailed tracking and strict email deduplication
  const usersWithEmail = useMemo(() => {
    const seenEmails = new Set();
    const list = [];

    (stats.users || []).forEach(u => {
      if (!u || !u.email || !u.email.trim() || !u.email.includes('@')) return;
      const cleanEmail = normalizeEmail(u.email);
      if (seenEmails.has(cleanEmail)) return;
      seenEmails.add(cleanEmail);

      const mailedInfo = (u.id && mailedUsersData[u.id]) || (cleanEmail && mailedUsersData[cleanEmail]) || null;
      const isMailed = Boolean(mailedInfo);
      const mailedAt = mailedInfo?.mailedAt || null;

      list.push({
        ...u,
        email: cleanEmail,
        isMailed,
        mailedAt,
        mailedTemplate: mailedInfo?.templateKey || null,
        isNewUnmailed: !isMailed
      });
    });

    return list;
  }, [stats.users, mailedUsersData]);

  const unmailedUsersCount = useMemo(() => {
    return usersWithEmail.filter(u => !u.isMailed && !u.isExcluded).length;
  }, [usersWithEmail]);

  const mailedUsersCount = useMemo(() => {
    return usersWithEmail.filter(u => u.isMailed).length;
  }, [usersWithEmail]);

  const filteredEmailUsers = useMemo(() => {
    return usersWithEmail.filter(u => {
      if (emailFilter === 'unmailed' && u.isMailed) return false;
      if (emailFilter === 'unmailed' && u.isExcluded) return false;
      if (emailFilter === 'mailed' && !u.isMailed) return false;
      if (emailFilter === 'active' && u.isExcluded) return false;
      if (emailFilter === 'excluded' && !u.isExcluded) return false;
      if (emailFilter === 'google' && !u.provider?.toLowerCase().includes('google')) return false;
      if (emailFilter === 'email' && !u.provider?.toLowerCase().includes('email')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        return matchName || matchEmail;
      }
      return true;
    });
  }, [usersWithEmail, emailFilter, searchQuery]);

  const handleIncludeAllUsers = async () => {
    if (window.confirm("Include all users and clear all exclusions?")) {
      setExcludedUserIds(new Set());
      await saveExcludedUsers([], user?.id);
    }
  };

  const handleToggleSelectAllEmails = () => {
    if (selectedEmailUserIds.size === filteredEmailUsers.length) {
      setSelectedEmailUserIds(new Set());
    } else {
      setSelectedEmailUserIds(new Set(filteredEmailUsers.map(u => u.id)));
    }
  };

  const handleToggleUserEmail = (userId) => {
    setSelectedEmailUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleToggleMarkMailed = async (targetUser) => {
    if (!targetUser) return;
    try {
      if (targetUser.isMailed) {
        const updated = await unmarkUsersAsMailed([targetUser], user?.id);
        setMailedUsersData(updated);
        setEmailCopiedFeedback(`Marked ${targetUser.name || targetUser.email} as Unmailed.`);
      } else {
        const updated = await markUsersAsMailed([targetUser], emailTemplateKey, user?.id);
        setMailedUsersData(updated);
        setEmailCopiedFeedback(`Marked ${targetUser.name || targetUser.email} as Mailed!`);
      }
      setTimeout(() => setEmailCopiedFeedback(null), 3000);
    } catch (err) {
      console.error('Error toggling mailed status:', err);
    }
  };

  const handleMarkSelectedAsMailed = async () => {
    const selectedUsers = usersWithEmail.filter(u => selectedEmailUserIds.has(u.id));
    if (selectedUsers.length === 0) return;
    try {
      const updated = await markUsersAsMailed(selectedUsers, emailTemplateKey, user?.id);
      setMailedUsersData(updated);
      setEmailCopiedFeedback(`Marked ${selectedUsers.length} selected users as Mailed!`);
      setTimeout(() => setEmailCopiedFeedback(null), 3000);
    } catch (err) {
      console.error('Error marking selected as mailed:', err);
    }
  };

  const handleUnmarkSelectedAsMailed = async () => {
    const selectedUsers = usersWithEmail.filter(u => selectedEmailUserIds.has(u.id));
    if (selectedUsers.length === 0) return;
    try {
      const updated = await unmarkUsersAsMailed(selectedUsers, user?.id);
      setMailedUsersData(updated);
      setEmailCopiedFeedback(`Marked ${selectedUsers.length} selected users as Unmailed.`);
      setTimeout(() => setEmailCopiedFeedback(null), 3000);
    } catch (err) {
      console.error('Error unmarking selected as mailed:', err);
    }
  };

  const recordMailedRecipients = async (recipientsList) => {
    if (!autoMarkMailed || !recipientsList || recipientsList.length === 0) return;
    try {
      const updated = await markUsersAsMailed(recipientsList, emailTemplateKey, user?.id);
      setMailedUsersData(updated);
      setEmailCopiedFeedback(`Broadcast launched & ${recipientsList.length} recipients marked as Mailed!`);
      setTimeout(() => setEmailCopiedFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to auto-record mailed users:', err);
    }
  };

  const handleCopyEmails = (emailsList, label = 'emails') => {
    if (!emailsList || emailsList.length === 0) return;
    const text = emailsList.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      setEmailCopiedFeedback(`Copied ${emailsList.length} ${label} to clipboard!`);
      setTimeout(() => setEmailCopiedFeedback(null), 3000);
    });
  };

  const handleCopySingleEmail = (email, userId) => {
    navigator.clipboard.writeText(email).then(() => {
      setSingleCopiedEmail(userId);
      setTimeout(() => setSingleCopiedEmail(null), 2000);
    });
  };

  const handleOpenComposer = (mode = 'all', targetUser = null) => {
    setComposerMode(mode);
    setSingleTargetUser(targetUser);
    const tmpl = EMAIL_TEMPLATES[emailTemplateKey] || EMAIL_TEMPLATES.update;
    let nameVal = targetUser ? (targetUser.name || 'there') : 'there';
    setEmailSubject(tmpl.subject);
    setEmailBody(tmpl.body.replace(/\{\{name\}\}/g, nameVal));
    setEmailComposerOpen(true);
  };

  const handleTemplateChange = (key) => {
    setEmailTemplateKey(key);
    const tmpl = EMAIL_TEMPLATES[key] || EMAIL_TEMPLATES.custom;
    let nameVal = singleTargetUser ? (singleTargetUser.name || 'there') : 'there';
    setEmailSubject(tmpl.subject);
    setEmailBody(tmpl.body.replace(/\{\{name\}\}/g, nameVal));
  };

  const handleLaunchGmailWeb = () => {
    let recipients = [];
    let recipientUsers = [];
    if (composerMode === 'single' && singleTargetUser?.email) {
      recipients = [singleTargetUser.email];
      recipientUsers = [singleTargetUser];
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(singleTargetUser.email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      recordMailedRecipients(recipientUsers);
      return;
    }

    if (composerMode === 'selected') {
      recipientUsers = filteredEmailUsers.filter(u => selectedEmailUserIds.has(u.id));
    } else {
      recipientUsers = filteredEmailUsers;
    }

    recipients = recipientUsers.map(u => u.email).filter(Boolean);

    if (recipients.length === 0) {
      alert('No recipients selected to email.');
      return;
    }

    const bccString = recipients.join(',');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent('support@blasync.in')}&bcc=${encodeURIComponent(bccString)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    recordMailedRecipients(recipientUsers);
  };

  const handleLaunchEmailClient = () => {
    let recipients = [];
    let recipientUsers = [];
    let mailtoUrl = '';
    if (composerMode === 'single' && singleTargetUser?.email) {
      recipients = [singleTargetUser.email];
      recipientUsers = [singleTargetUser];
      mailtoUrl = `mailto:${singleTargetUser.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    } else {
      if (composerMode === 'selected') {
        recipientUsers = filteredEmailUsers.filter(u => selectedEmailUserIds.has(u.id));
      } else {
        recipientUsers = filteredEmailUsers;
      }

      recipients = recipientUsers.map(u => u.email).filter(Boolean);

      if (recipients.length === 0) {
        alert('No recipients selected to email.');
        return;
      }

      const bccString = recipients.join(',');
      mailtoUrl = `mailto:support@blasync.in?bcc=${encodeURIComponent(bccString)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    }

    // Use simulated anchor element for clean native OS mail handler triggering
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    recordMailedRecipients(recipientUsers);
  };

  // User Acquisition & Daily Signups Analytics
  const userGrowthStats = useMemo(() => {
    const allUsers = stats.users || [];
    const now = dayjs();
    const todayStr = now.format('YYYY-MM-DD');
    const yesterdayStr = now.subtract(1, 'day').format('YYYY-MM-DD');

    const joinedTodayUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).format('YYYY-MM-DD') === todayStr);
    const joinedYesterdayUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).format('YYYY-MM-DD') === yesterdayStr);
    const joinedThisWeekUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).isAfter(now.subtract(7, 'day')));
    const joinedThisMonthUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).isAfter(now.subtract(30, 'day')));

    return {
      joinedToday: joinedTodayUsers.length,
      joinedTodayUsers,
      joinedYesterday: joinedYesterdayUsers.length,
      joinedYesterdayUsers,
      joinedThisWeek: joinedThisWeekUsers.length,
      joinedThisMonth: joinedThisMonthUsers.length,
      totalUsers: allUsers.length
    };
  }, [stats.users]);

  // Multi-period Chart Bar Data Generator for User Signups & Growth
  const userGrowthChartData = useMemo(() => {
    const allUsers = stats.users || [];
    const now = dayjs();
    const data = [];

    if (chartPeriod === 'today') {
      // 6 time blocks across today
      const slots = [
        { label: '00:00 - 04:00', startHour: 0, endHour: 4 },
        { label: '04:00 - 08:00', startHour: 4, endHour: 8 },
        { label: '08:00 - 12:00', startHour: 8, endHour: 12 },
        { label: '12:00 - 16:00', startHour: 12, endHour: 16 },
        { label: '16:00 - 20:00', startHour: 16, endHour: 20 },
        { label: '20:00 - 23:59', startHour: 20, endHour: 24 }
      ];

      slots.forEach(slot => {
        const matchingUsers = allUsers.filter(u => {
          if (!u.firstSeen) return false;
          const d = dayjs(u.firstSeen);
          if (d.format('YYYY-MM-DD') !== now.format('YYYY-MM-DD')) return false;
          const h = d.hour();
          return h >= slot.startHour && h < slot.endHour;
        });

        data.push({
          label: slot.label.split(' - ')[0],
          fullLabel: `${slot.label} Today`,
          count: matchingUsers.length,
          users: matchingUsers,
          isToday: true
        });
      });
    } else if (chartPeriod === 'weekly') {
      // Past 7 days (including today)
      for (let i = 6; i >= 0; i--) {
        const d = now.subtract(i, 'day');
        const dateKey = d.format('YYYY-MM-DD');
        const isToday = i === 0;
        const matchingUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).format('YYYY-MM-DD') === dateKey);

        data.push({
          label: isToday ? 'Today' : d.format('ddd D'),
          fullLabel: d.format('dddd, MMMM D, YYYY'),
          dateKey,
          count: matchingUsers.length,
          users: matchingUsers,
          isToday
        });
      }
    } else if (chartPeriod === 'monthly') {
      // Past 14 days
      for (let i = 13; i >= 0; i--) {
        const d = now.subtract(i, 'day');
        const dateKey = d.format('YYYY-MM-DD');
        const isToday = i === 0;
        const matchingUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).format('YYYY-MM-DD') === dateKey);

        data.push({
          label: isToday ? 'Today' : d.format('D MMM'),
          fullLabel: d.format('MMMM D, YYYY'),
          dateKey,
          count: matchingUsers.length,
          users: matchingUsers,
          isToday
        });
      }
    } else {
      // All time by month (past 6 months)
      for (let i = 5; i >= 0; i--) {
        const m = now.subtract(i, 'month');
        const monthKey = m.format('YYYY-MM');
        const matchingUsers = allUsers.filter(u => u.firstSeen && dayjs(u.firstSeen).format('YYYY-MM') === monthKey);

        data.push({
          label: m.format('MMM YYYY'),
          fullLabel: m.format('MMMM YYYY'),
          dateKey: monthKey,
          count: matchingUsers.length,
          users: matchingUsers,
          isToday: i === 0
        });
      }
    }

    const maxCount = Math.max(1, ...data.map(d => d.count));
    return data.map(d => {
      const heightPercent = d.count === 0 ? 8 : Math.max(20, Math.min(95, Math.round((d.count / maxCount) * 85) + 10));
      return {
        ...d,
        heightPercent
      };
    });
  }, [stats.users, chartPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center font-sans text-zinc-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-purple-400" />
          <span>Loading Admin Console...</span>
        </div>
      </div>
    );
  }

  // Access Denied State
  if (!userIsAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-[#0c0a14] border border-purple-950/60 rounded-none p-6 md:p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-none bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold mb-2">Access Restricted</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            The Admin Console is restricted to designated administrators. Current account: <span className="font-mono text-purple-300 font-semibold">{userEmail || 'Guest'}</span>.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                setLoading(true);
                const synced = await syncAdminEmailsWithDatabase();
                if (synced) setAdminList(synced);
                const clean = normalizeEmail(userEmail);
                if (isAdmin(clean) || (synced || []).map(normalizeEmail).includes(clean)) {
                  await fetchData();
                }
                setLoading(false);
              }}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-none text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Check Admin Permissions</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 bg-[#07050e] hover:bg-white/5 text-zinc-300 border border-purple-950/50 rounded-none text-xs font-medium transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 font-sans flex flex-col md:flex-row overflow-x-hidden">
      
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#0c0a14] border-r border-purple-950/40 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-purple-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400/40 text-white flex items-center justify-center font-black text-sm shadow-md">
              M
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>markit.</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded-none font-mono font-normal">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">SaaS Console</div>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden text-zinc-400 hover:text-white p-2 rounded-none hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6 custom-scrollbar">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Main Menu</div>
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutGrid size={15} className={activeTab === 'overview' ? 'text-purple-400' : 'text-zinc-500'} />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Film size={15} className={activeTab === 'projects' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Projects & Sessions</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-none font-mono">
                  {stats.totalRooms}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={15} className={activeTab === 'users' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Editors Directory</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-none font-mono">
                  {stats.totalUsers}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('rankings'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'rankings'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trophy size={15} className={activeTab === 'rankings' ? 'text-amber-400' : 'text-zinc-500'} />
                  <span>Active Rankings</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-none font-mono flex items-center gap-0.5">
                  <Flame size={10} className="text-amber-400" />
                  <span>Ranked</span>
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('emails'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'emails'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Mail size={15} className={activeTab === 'emails' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Mail Users</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-none font-mono">
                  {usersWithEmail.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('admins'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'admins'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={15} className={activeTab === 'admins' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Admin Privileges</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded-none font-mono">
                  {adminList.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 size={15} className={activeTab === 'analytics' ? 'text-purple-400' : 'text-zinc-500'} />
                <span>Analytics & Charts</span>
              </button>
            </nav>
          </div>

          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Shortcuts</div>
            <nav className="space-y-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={13} />
                  <span>User Dashboard</span>
                </div>
                <ArrowUpRight size={12} className="text-zinc-500" />
              </button>
              <button
                onClick={() => navigate('/project/new')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Plus size={13} />
                  <span>Create Session</span>
                </div>
                <ArrowUpRight size={12} className="text-zinc-500" />
              </button>
            </nav>
          </div>
        </div>

        {/* Current Admin Footer in Sidebar */}
        <div className="p-3 border-t border-purple-950/40 bg-[#07050e] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/40 flex items-center justify-center font-bold text-xs text-purple-200">
              {(user?.email || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1">
                <span>{user?.email?.split('@')[0] || 'Admin'}</span>
                <Crown size={11} className="text-amber-400 shrink-0" />
              </div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">
                {isPrimaryAdmin(user?.email) ? 'Primary Super Admin' : 'Administrator'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-8 border-b border-purple-950/40 bg-[#0c0a14] flex items-center justify-between sticky top-0 z-30 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-zinc-300 hover:text-white p-2 rounded-none bg-[#07050e] border border-purple-950/60 transition-colors cursor-pointer shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 truncate">
              <h1 className="text-sm md:text-base font-bold text-white tracking-tight capitalize truncate">
                {activeTab === 'overview'
                  ? 'Dashboard'
                  : activeTab === 'projects'
                  ? 'Projects'
                  : activeTab === 'users'
                  ? 'Users'
                  : activeTab === 'rankings'
                  ? 'Active Rankings'
                  : activeTab === 'emails'
                  ? 'Mail Users'
                  : activeTab === 'admins'
                  ? 'Admins'
                  : 'Analytics'}
              </h1>
              <span className="hidden sm:inline text-xs text-zinc-600">/</span>
              <span className="hidden sm:inline text-xs text-zinc-400 font-mono">Live Supabase Sync</span>
            </div>
          </div>

          {/* Search Bar & Quick Icons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop Search Box */}
            <div className="relative hidden md:block w-48 lg:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search here..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white bg-[#07050e] border border-purple-950/50 rounded-none transition-colors cursor-pointer"
              title="Search"
            >
              <Search size={14} />
            </button>

            {/* Quick Refresh Button */}
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 text-zinc-400 hover:text-white bg-[#07050e] hover:bg-white/5 border border-purple-950/50 rounded-none transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
            </button>

            {/* Notifications Pill */}
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 text-zinc-400 hover:text-white bg-[#07050e] hover:bg-white/5 border border-purple-950/50 rounded-none transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500"></span>
            </button>

            {/* User Avatar Badge */}
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img
                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                alt={userEmail}
                className="w-8 h-8 rounded-full object-cover border border-purple-500/40 shadow-md shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1c182c] border border-purple-900/60 text-purple-200 flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                {(userEmail || 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Mobile Dropdown Search Input */}
        {mobileSearchOpen && (
          <div className="md:hidden bg-[#0c0a14] border-b border-purple-950/50 p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search sessions, users, URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs">
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <main className="flex-1 p-3 sm:p-5 md:p-8 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* TOP HERO BANNER & STATS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
                {/* Hero Banner Card (7 cols) */}
                <div className="lg:col-span-7 bg-gradient-to-r from-[#201140] via-[#160d2b] to-[#0c0a14] border border-purple-950/60 rounded-none p-5 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 max-w-md">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2 md:mb-3">
                      Manage your project in <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">one touch</span>
                    </h2>
                    <p className="text-xs md:text-sm text-zinc-300 mb-5 md:mb-6 leading-relaxed">
                      Let MarkIt Player manage your review projects automatically with live Supabase synchronization, timeline markers, and collaborative drawing tools.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-none transition-colors shadow-lg cursor-pointer"
                      >
                        Back to Player
                      </button>
                      <button
                        onClick={fetchData}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 text-white border border-purple-500/30 font-semibold text-xs rounded-none transition-colors cursor-pointer"
                      >
                        Live Sync
                      </button>
                    </div>
                  </div>

                  {/* Visual Illustration on Desktop */}
                  <div className="hidden lg:block absolute right-6 bottom-6 opacity-90 pointer-events-none">
                    <div className="w-36 h-24 bg-purple-950/40 border border-purple-500/20 p-2.5 backdrop-blur-md rounded-none shadow-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
                        <span>Realtime API</span>
                        <Activity size={12} className="text-emerald-400 animate-pulse" />
                      </div>
                      <div className="h-10 flex items-end gap-1 px-1">
                        <div className="flex-1 bg-purple-500/40 h-[40%]"></div>
                        <div className="flex-1 bg-purple-500/60 h-[70%]"></div>
                        <div className="flex-1 bg-pink-500/60 h-[50%]"></div>
                        <div className="flex-1 bg-purple-400 h-[90%]"></div>
                        <div className="flex-1 bg-indigo-400 h-[65%]"></div>
                        <div className="flex-1 bg-pink-400 h-[80%]"></div>
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono truncate">100% Supabase OK</div>
                    </div>
                  </div>
                </div>

                {/* Right Top KPI Cards (5 cols) */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {/* Total Registered Editors */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total Editors</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{stats.totalUsers}</div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold mt-1">
                        <TrendingUp size={12} />
                        <span>+0.5% active</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-purple-950/40 flex items-end gap-1.5 h-8">
                      <div className="w-2 bg-purple-600/40 h-[30%]"></div>
                      <div className="w-2 bg-purple-600/60 h-[50%]"></div>
                      <div className="w-2 bg-purple-500 h-[80%]"></div>
                      <div className="w-2 bg-pink-500 h-[65%]"></div>
                      <div className="w-2 bg-purple-400 h-[95%]"></div>
                    </div>
                  </div>

                  {/* Total Sessions Target */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total Sessions</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{stats.totalRooms}</div>
                      <div className="text-[11px] text-pink-400 font-medium mt-1">
                        {stats.states.approved} approved
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-purple-950/40">
                      <div className="w-full h-1.5 bg-[#07050e] rounded-none overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, (stats.totalRooms / 50) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1.5 text-right">
                        {Math.max(0, 50 - stats.totalRooms)} to milestone
                      </div>
                    </div>
                  </div>

                  {/* Total Comments */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Feedback Comments</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{stats.totalComments}</div>
                      <div className="text-[11px] text-purple-300 font-medium mt-1">
                        Across timeline markers
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-purple-950/40">
                      <svg className="w-full h-6 text-purple-400" viewBox="0 0 100 24" fill="none">
                        <path d="M0 18 Q 20 4, 40 14 T 80 8 T 100 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Revisions & Versions */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total Versions</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{stats.totalVersions}</div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold mt-1">
                        <TrendingUp size={12} />
                        <span>+2% new uploads</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-purple-950/40">
                      <svg className="w-full h-6 text-emerald-400" viewBox="0 0 100 24" fill="none">
                        <path d="M0 20 Q 25 18, 50 10 T 100 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* USER ACQUISITION & DAILY SIGNUPS GROWTH SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-stretch">
                {/* User Signups Bar Chart (8 cols) */}
                <div className="lg:col-span-8 bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-6 shadow-xl flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-tight">User Signups & Daily Growth</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sparkles size={10} className="text-amber-400" />
                          <span>Live Signups</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/30 px-2 py-0.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          <strong className="text-amber-200 font-mono">{userGrowthStats.joinedToday}</strong> Joined Today
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          <strong className="text-purple-200 font-mono">{userGrowthStats.joinedYesterday}</strong> Yesterday
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                          <strong className="text-pink-200 font-mono">{userGrowthStats.joinedThisWeek}</strong> Past 7 Days
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          <strong className="text-indigo-200 font-mono">{userGrowthStats.joinedThisMonth}</strong> Past 30 Days
                        </span>
                        <span className="flex items-center gap-1.5 text-zinc-500">
                          <strong className="text-white font-mono">{userGrowthStats.totalUsers}</strong> Total Users
                        </span>
                      </div>
                    </div>

                    {/* Period Filter Pills */}
                    <div className="inline-flex p-1 bg-[#07050e] border border-purple-950/50 rounded-none text-xs overflow-x-auto max-w-full">
                      {[
                        { key: 'today', label: 'Today' },
                        { key: 'weekly', label: '7 Days' },
                        { key: 'monthly', label: '30 Days' },
                        { key: 'all', label: 'All Time' }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setChartPeriod(key)}
                          className={`px-2.5 sm:px-3 py-1 text-xs font-semibold capitalize transition-colors rounded-none whitespace-nowrap cursor-pointer ${
                            chartPeriod === key
                              ? 'bg-purple-950/80 text-white border border-purple-500/40 shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Bar Chart with Interactive Tooltips */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[320px] h-52 sm:h-56 w-full relative flex items-end justify-between gap-1 sm:gap-2 px-1 sm:px-2 pt-8 pb-2 border-b border-purple-950/40">
                      {userGrowthChartData.map((d, idx) => {
                        const hasUsers = d.count > 0;

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-[#120d24] border border-purple-500/40 text-white text-[10px] p-2 rounded-none shadow-2xl pointer-events-none whitespace-nowrap z-30 font-sans text-center min-w-[120px]">
                              <div className="font-bold text-zinc-300">{d.fullLabel || d.label}</div>
                              <div className="text-purple-300 font-mono mt-0.5 font-bold">
                                {d.count} {d.count === 1 ? 'new user joined' : 'new users joined'}
                              </div>
                              {d.users && d.users.length > 0 && (
                                <div className="text-[9px] text-zinc-400 mt-1 max-w-[180px] truncate">
                                  {d.users.map(u => u.name || u.email).slice(0, 3).join(', ')}
                                  {d.users.length > 3 ? ` +${d.users.length - 3} more` : ''}
                                </div>
                              )}
                            </div>

                            {/* Value Label above Bar */}
                            {hasUsers && (
                              <span className={`text-[10px] font-mono font-bold mb-1 transition-transform group-hover:scale-110 ${
                                d.isToday ? 'text-amber-300' : 'text-purple-300'
                              }`}>
                                +{d.count}
                              </span>
                            )}

                            {/* Bar Column */}
                            <div className="w-full max-w-[32px] flex items-end justify-center h-full">
                              <div
                                className={`w-full rounded-none transition-all duration-500 group-hover:brightness-125 ${
                                  d.isToday
                                    ? 'bg-gradient-to-t from-amber-500 via-pink-500 to-purple-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                    : hasUsers
                                    ? 'bg-gradient-to-t from-purple-800 via-purple-600 to-indigo-400'
                                    : 'bg-zinc-800/40 border-t border-purple-950/40'
                                }`}
                                style={{ height: `${d.heightPercent}%` }}
                              />
                            </div>

                            {/* X-Axis Date Label */}
                            <span className={`text-[9px] sm:text-[10px] font-mono mt-2 truncate max-w-full ${
                              d.isToday ? 'text-amber-300 font-bold' : 'text-zinc-500'
                            }`}>
                              {d.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Project Completion Radial Donut Card (4 cols) */}
                <div className="lg:col-span-4 bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight mb-1">Session Completion</h3>
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                      Approval velocity and review completion across all active video revisions.
                    </p>
                  </div>

                  {/* Radial Gauge Visual */}
                  <div className="flex flex-col items-center justify-center my-4 relative">
                    <svg className="w-32 h-32 sm:w-36 sm:h-36 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#191328"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#radialGradient)"
                        strokeWidth="12"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (stats.completionRate || 5)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="radialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl sm:text-2xl font-black text-white">{stats.completionRate}%</span>
                      <span className="text-[9px] sm:text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Approved</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-purple-950/40 text-center">
                    <div className="bg-[#07050e] p-2 border border-purple-950/40 rounded-none">
                      <div className="text-xs font-bold text-emerald-400">{stats.states.approved}</div>
                      <div className="text-[10px] text-zinc-500">Approved</div>
                    </div>
                    <div className="bg-[#07050e] p-2 border border-purple-950/40 rounded-none">
                      <div className="text-xs font-bold text-pink-400">{stats.states.inProgress}</div>
                      <div className="text-[10px] text-zinc-500">In Progress</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT SESSIONS TABLE SECTION */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Recent Sessions & Projects</h3>
                    <p className="text-xs text-zinc-400">Live review sessions uploaded by creators</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>View all ({stats.totalRooms})</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0 custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[660px]">
                    <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 min-w-[180px]">Session Title</th>
                        <th className="px-4 py-3 min-w-[160px]">Platform & Revisions</th>
                        <th className="px-4 py-3 min-w-[120px]">Status</th>
                        <th className="px-4 py-3 min-w-[100px]">Created</th>
                        <th className="px-4 py-3 text-right min-w-[80px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {rooms.slice(0, 6).map((room) => {
                        const videoData = parseVideoData(room.video_url, room.created_at);
                        const activeUrl = getActiveVideoUrl(room.video_url);
                        const platform = detectPlatform(activeUrl);
                        return (
                          <tr key={room.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-zinc-100 truncate max-w-[180px] sm:max-w-xs">{room.title || 'Untitled Session'}</div>
                              <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[180px] sm:max-w-xs">{room.id}</div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2 flex-nowrap">
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {platform === 'drive' ? (
                                    <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                                  ) : platform === 'youtube' ? (
                                    <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                                  ) : null}
                                  <span className="capitalize text-zinc-300">{platform || 'Direct'}</span>
                                </div>
                                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/20 px-1.5 py-0.5 rounded-none shrink-0 whitespace-nowrap">
                                  V{videoData.currentVersion} ({videoData.versions.length} ver)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-none font-semibold border inline-block whitespace-nowrap ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {room.state || 'In Progress'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-400 font-mono whitespace-nowrap">
                              {dayjs(room.created_at).format('MMM D, YYYY')}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => window.open(`/room/${room.id}`, '_blank')}
                                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Open</span>
                                <ExternalLink size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PROJECTS & SESSIONS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c0a14] p-4 border border-purple-950/50 rounded-none">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search sessions by title, URL or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-2 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <div className="text-xs text-zinc-400 font-mono shrink-0">
                    {filteredRooms.length} of {rooms.length}
                  </div>
                </div>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 min-w-[180px]">Session Details</th>
                        <th className="px-4 py-3 min-w-[180px]">Platform & Revisions</th>
                        <th className="px-4 py-3 min-w-[130px]">Review State</th>
                        <th className="px-4 py-3 min-w-[100px]">Created</th>
                        <th className="px-4 py-3 text-right min-w-[90px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {filteredRooms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                            No sessions found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredRooms.map((room) => {
                          const videoData = parseVideoData(room.video_url, room.created_at);
                          const activeUrl = getActiveVideoUrl(room.video_url);
                          const platform = detectPlatform(activeUrl);
                          return (
                            <tr key={room.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-zinc-100 truncate max-w-[180px] sm:max-w-xs">{room.title || 'Untitled Session'}</div>
                                <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[180px] sm:max-w-xs">{room.id}</div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2 flex-nowrap">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {platform === 'drive' ? (
                                      <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                                    ) : platform === 'youtube' ? (
                                      <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                                    ) : null}
                                    <span className="capitalize text-zinc-300">{platform || 'Direct'}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/20 px-1.5 py-0.5 rounded-none shrink-0 whitespace-nowrap">
                                    V{videoData.currentVersion} ({videoData.versions.length} ver)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <select
                                  value={room.state || 'In Progress'}
                                  onChange={(e) => handleUpdateRoomState(room.id, e.target.value)}
                                  className="bg-[#07050e] border border-purple-950/50 text-xs px-2.5 py-1.5 rounded-none text-zinc-200 cursor-pointer focus:outline-none min-w-[115px]"
                                >
                                  <option value="In Progress">In Progress</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </td>
                              <td className="px-4 py-3.5 text-zinc-400 font-mono whitespace-nowrap">
                                {dayjs(room.created_at).format('MMM D, YYYY')}
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => window.open(`/room/${room.id}`, '_blank')}
                                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Open</span>
                                  <ExternalLink size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(room.id)}
                                  className="text-xs text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                  title="Delete session"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 bg-[#0c0a14] p-4 border border-purple-950/50 rounded-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Account Inclusion Filter Tabs */}
                  <div className="flex items-center p-1 bg-[#07050e] border border-purple-950/50 rounded-none text-xs overflow-x-auto max-w-full">
                    <button
                      onClick={() => setUserFilterTab('all')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all whitespace-nowrap cursor-pointer ${
                        userFilterTab === 'all'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      All Editors ({stats.totalRegistered})
                    </button>
                    <button
                      onClick={() => setUserFilterTab('active')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all whitespace-nowrap cursor-pointer ${
                        userFilterTab === 'active'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Active ({stats.totalUsers})
                    </button>
                    <button
                      onClick={() => setUserFilterTab('excluded')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all whitespace-nowrap cursor-pointer ${
                        userFilterTab === 'excluded'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Excluded ({stats.totalExcluded})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {stats.totalExcluded > 0 && (
                      <button
                        onClick={handleIncludeAllUsers}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-none transition-colors cursor-pointer flex items-center gap-1"
                        title="Include all excluded users"
                      >
                        <UserPlus size={12} />
                        <span>Include All ({stats.totalExcluded})</span>
                      </button>
                    )}
                    <div className="text-xs text-zinc-400 font-mono">
                      Showing {filteredUsers.length} of {stats.totalRegistered} editors
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search editors by name, email or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">Sort:</span>
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value)}
                      className="bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer w-full sm:w-auto"
                    >
                      <option value="joined-desc">Joined: Newest First</option>
                      <option value="joined-asc">Joined: Oldest First</option>
                      <option value="active-desc">Last Active</option>
                      <option value="rooms-desc">Most Sessions Created</option>
                      <option value="comments-desc">Most Comments Left</option>
                      <option value="activity-desc">🔥 Activity Score</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Editor & Account</th>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3">Joined Date</th>
                        <th className="px-4 py-3">Sessions</th>
                        <th className="px-4 py-3">Comments</th>
                        <th className="px-4 py-3">Last Active</th>
                        <th className="px-4 py-3">Inclusion</th>
                        <th className="px-4 py-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/30">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                            No registered editors match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isUserAdmin = u.email && isAdmin(u.email);
                          const provider = u.provider || (u.email?.includes('gmail') ? 'Google' : 'Email');
                          return (
                            <tr
                              key={u.id}
                              className={`transition-colors ${
                                u.isExcluded
                                  ? 'bg-amber-950/10 hover:bg-amber-950/20 text-zinc-400'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  {u.avatar_url && !u.isExcluded ? (
                                    <img
                                      src={u.avatar_url}
                                      alt={u.name}
                                      className="w-8 h-8 rounded-full object-cover border border-purple-500/40 shadow-sm shrink-0"
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                                      u.isExcluded
                                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                        : 'bg-[#1c182c] border-purple-900/60 text-purple-200'
                                    }`}>
                                      {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold flex items-center gap-1.5 truncate">
                                      <span className={u.isExcluded ? 'text-zinc-400 line-through' : 'text-zinc-100'}>
                                        {u.name}
                                      </span>
                                      {isUserAdmin && <Crown size={11} className="text-amber-400 shrink-0" />}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 truncate">{u.email || 'No email associated'}</div>
                                    <div className="text-[9px] font-mono text-zinc-600 truncate">ID: {u.id.slice(0, 16)}...</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-none font-semibold border bg-purple-950/40 text-purple-300 border-purple-500/30">
                                  {provider}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="text-zinc-200 font-medium">{dayjs(u.firstSeen).fromNow()}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{dayjs(u.firstSeen).format('MMM D, YYYY')}</div>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-purple-300 font-bold whitespace-nowrap">
                                {u.roomsCount}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-pink-300 font-bold whitespace-nowrap">
                                {u.commentsCount}
                              </td>
                              <td className="px-4 py-3.5 text-zinc-400 whitespace-nowrap">{dayjs(u.lastActive).fromNow()}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleUserExclusion(u.id, u.email)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-semibold border transition-all cursor-pointer ${
                                    u.isExcluded
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-emerald-500/10 hover:bg-white/10 text-emerald-300 hover:text-white border-emerald-500/20'
                                  }`}
                                >
                                  {u.isExcluded ? (
                                    <>
                                      <UserPlus size={12} />
                                      <span>Include</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} className="text-emerald-400" />
                                      <span>Included</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {isUserAdmin ? (
                                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-none font-mono font-bold">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/40 px-2 py-0.5 rounded-none">
                                    Member
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACTIVE RANKINGS & LEADERBOARD */}
          {activeTab === 'rankings' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0a14] p-5 border border-purple-950/60 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      Most Active Editors Leaderboard
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950/60 border border-amber-500/30 text-amber-300">
                        Live Activity Ranking
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Ranked by composite score: retention lifespan (joined vs last active), session creations, notes left, and recency multipliers.
                    </p>
                  </div>
                </div>

                {/* Top Quick Badges */}
                <div className="flex items-center gap-2">
                  <div className="text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 flex items-center gap-2">
                    <Flame size={13} className="text-amber-400 animate-pulse" />
                    <span>{stats.topActiveUsers.length} Champions on Podium</span>
                  </div>
                </div>
              </div>

              {/* Controls Bar: Search & Multi-Criteria Ordering */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0c0a14] p-4 border border-purple-950/50">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search editors by name, email or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                {/* Ordering & Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 whitespace-nowrap font-medium flex items-center gap-1.5">
                    <Filter size={12} className="text-purple-400" />
                    Order By:
                  </span>
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value)}
                    className="bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="activity-desc">🔥 Our Formula (Activity Score)</option>
                    <option value="rooms-desc">🎬 Most Rooms / Sessions Created</option>
                    <option value="comments-desc">💬 Most Comments / Notes Left</option>
                    <option value="span-desc">⏳ Diff of Joined & Last Active (Active Span)</option>
                    <option value="active-desc">🕒 Last Active (Recent First)</option>
                    <option value="joined-desc">📅 Joined Date: Newest First</option>
                    <option value="joined-asc">📅 Joined Date: Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Split Layout: Full Rankings Table on Left (7 cols), Scrollable All-Editors Cards on Right (5 cols) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* LEFT AREA: Full Rankings Table (7 cols) */}
                <div className="xl:col-span-7 space-y-4">
                  <div className="bg-[#0c0a14] border border-purple-950/50 overflow-hidden shadow-xl">
                    <div className="p-3 border-b border-purple-950/40 flex items-center justify-between bg-[#07050e]">
                      <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Users size={13} className="text-purple-400" />
                        <span>All Ranked Editors Directory</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        Showing {filteredUsers.filter(u => !u.isExcluded).length} of {stats.totalUsers} active editors
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[620px]">
                        <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Rank & Score</th>
                            <th className="px-4 py-3">Editor</th>
                            <th className="px-4 py-3">Tier</th>
                            <th className="px-4 py-3">Active Span</th>
                            <th className="px-4 py-3">Rooms</th>
                            <th className="px-4 py-3">Comments</th>
                            <th className="px-4 py-3">Last Active</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950/30">
                          {filteredUsers.filter(u => !u.isExcluded).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                                No active editors match the query.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.filter(u => !u.isExcluded).map((u, idx) => {
                              const isUserAdmin = u.email && isAdmin(u.email);
                              const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                              return (
                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-xs rounded-none border ${
                                          idx === 0
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                            : idx === 1
                                            ? 'bg-zinc-700/30 border-zinc-500/40 text-zinc-200'
                                            : idx === 2
                                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-400'
                                            : 'bg-[#07050e] border-purple-950/60 text-zinc-400'
                                        }`}
                                      >
                                        {rankIcon || `#${idx + 1}`}
                                      </span>
                                      <div className="font-mono font-bold text-amber-300 flex items-center gap-1">
                                        <Flame size={11} className="text-orange-400" />
                                        <span>{u.activityScore} pts</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {u.avatar_url ? (
                                        <img
                                          src={u.avatar_url}
                                          alt={u.name}
                                          className="w-7 h-7 rounded-full object-cover border border-purple-500/40 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 bg-[#1c182c] border border-purple-900/60 text-purple-200">
                                          {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-semibold text-zinc-100 truncate flex items-center gap-1">
                                          <span>{u.name}</span>
                                          {isUserAdmin && <Crown size={11} className="text-amber-400 shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-zinc-400 truncate">{u.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`text-[10px] px-2 py-0.5 font-semibold border ${u.tierColor}`}>
                                      {u.activityTier}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-zinc-300 font-mono whitespace-nowrap">
                                    {u.activeSpanDays > 0 ? `${u.activeSpanDays}d` : `${u.activeSpanHours}h`}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-purple-300 font-bold whitespace-nowrap">
                                    {u.roomsCount}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-pink-300 font-bold whitespace-nowrap">
                                    {u.commentsCount}
                                  </td>
                                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                                    {dayjs(u.lastActive).fromNow()}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE PANEL: Scrollable All-Editors Cards Feed (5 cols) */}
                <div className="xl:col-span-5 space-y-4">
                  <div className="bg-[#0c0a14] border border-purple-950/60 p-4 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between pb-2.5 border-b border-purple-950/40">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                        <Trophy size={14} className="text-amber-400" />
                        <span>Ranked Editors Cards Feed</span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 px-2 py-0.5 border border-amber-500/20">
                        {filteredUsers.filter(u => !u.isExcluded).length} Editors • Scrollable
                      </span>
                    </div>

                    {/* Scrollable Container for All Ranked Editors Cards */}
                    <div className="max-h-[580px] overflow-y-auto pr-1.5 space-y-2.5 custom-scrollbar">
                      {filteredUsers.filter(u => !u.isExcluded).length === 0 ? (
                        <div className="p-6 text-center text-xs text-zinc-500">
                          No editors found matching filter.
                        </div>
                      ) : (
                        filteredUsers.filter(u => !u.isExcluded).map((user, idx) => {
                          const isFirst = idx === 0;
                          const isSecond = idx === 1;
                          const isThird = idx === 2;
                          const medalIcon = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : null;
                          const medalLabel = isFirst
                            ? 'Gold • #1 Overall'
                            : isSecond
                            ? 'Silver • #2 Contributor'
                            : isThird
                            ? 'Bronze • #3 Contributor'
                            : `#${idx + 1} Contributor`;

                          const cardBorder = isFirst
                            ? 'border-amber-500/50 bg-amber-950/15 shadow-sm'
                            : isSecond
                            ? 'border-zinc-400/40 bg-zinc-900/20'
                            : isThird
                            ? 'border-amber-700/30 bg-amber-950/10'
                            : 'border-purple-950/50 bg-[#07050e]/90 hover:border-purple-500/30';

                          return (
                            <div key={user.id} className={`p-3 border transition-all ${cardBorder}`}>
                              {/* Rank Header */}
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <span className="text-[11px] font-bold font-mono text-zinc-200 flex items-center gap-1.5">
                                  {medalIcon ? <span>{medalIcon}</span> : <span className="text-[10px] text-zinc-400 font-mono">#{idx + 1}</span>}
                                  <span>{medalLabel}</span>
                                </span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 border ${user.tierColor}`}>
                                  {user.activityTier}
                                </span>
                              </div>

                              {/* User row */}
                              <div className="flex items-center gap-2 mb-2">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className={`w-7 h-7 rounded-full object-cover shrink-0 border ${
                                      isFirst ? 'border-amber-400' : 'border-purple-500/40'
                                    }`}
                                  />
                                ) : (
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border ${
                                      isFirst
                                        ? 'bg-amber-950/60 border-amber-400 text-amber-300'
                                        : 'bg-[#1c182c] border-purple-500/40 text-purple-200'
                                    }`}
                                  >
                                    {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-zinc-100 text-[11px] truncate flex items-center gap-1">
                                    <span>{user.name}</span>
                                    {user.email && isAdmin(user.email) && <Crown size={10} className="text-amber-400 shrink-0" />}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 truncate">{user.email || 'No email'}</div>
                                  <div className="text-[9px] text-zinc-500 font-mono">
                                    Joined {dayjs(user.firstSeen).format('MMM D, YYYY')} • Active {dayjs(user.lastActive).fromNow()}
                                  </div>
                                </div>
                              </div>

                              {/* Score pill */}
                              <div className="mb-2 px-2 py-1 bg-[#07050e] border border-purple-950/40 flex items-center justify-between text-xs">
                                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                  <Zap size={10} className="text-purple-400" />
                                  Score:
                                </span>
                                <span className="font-bold font-mono text-amber-400 flex items-center gap-1 text-xs">
                                  <Flame size={11} className="text-orange-500" />
                                  {user.activityScore.toLocaleString()} pts
                                </span>
                              </div>

                              {/* Mini Stats (Span, Rooms, Comments) */}
                              <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t border-purple-950/30">
                                <div className="bg-white/[0.02] p-1">
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold" title="Diff of joined date and last active">
                                    Span
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-purple-300">
                                    {user.activeSpanDays > 0 ? `${user.activeSpanDays}d` : `${user.activeSpanHours}h`}
                                  </div>
                                </div>
                                <div className="bg-white/[0.02] p-1">
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold" title="Rooms and sessions created">
                                    Rooms
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-purple-300">{user.roomsCount}</div>
                                </div>
                                <div className="bg-white/[0.02] p-1">
                                  <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold" title="Comments and feedback left">
                                    Comments
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-pink-300">{user.commentsCount}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Formula breakdown card */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 p-3.5 space-y-2 text-xs shadow-xl">
                    <div className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                      <Activity size={13} />
                      <span>Ranking Formula Parameters</span>
                    </div>
                    <div className="p-2 bg-[#07050e] border border-purple-950/40 text-[10px] font-mono text-zinc-300 space-y-1">
                      <div className="text-amber-300 font-semibold">• Sessions Weight: 35 pts / room created</div>
                      <div className="text-pink-300 font-semibold">• Comments Weight: 15 pts / note or comment</div>
                      <div className="text-purple-300 font-semibold">• Retention Lifespan: 10 pts / active day (joined vs last active)</div>
                      <div className="text-zinc-400 font-semibold">• Recency Bonus: up to 1.6x multiplier for activity in last 24h</div>
                    </div>
                    <div className="text-[9px] text-zinc-500 leading-tight">
                      Combines user tenure, engagement duration from joined date to latest action, room creations, and feedback volume.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EMAIL BROADCAST & MAIL USERS */}
          {activeTab === 'emails' && (
            <div className="space-y-6">
              {/* Feedback toast notification */}
              {emailCopiedFeedback && (
                <div className="p-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span>{emailCopiedFeedback}</span>
                  </div>
                  <button onClick={() => setEmailCopiedFeedback(null)} className="text-emerald-400 hover:text-white">✕</button>
                </div>
              )}

              {/* Top Action Bar & Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Reachable User Emails */}
                <div className="bg-[#0c0a14] border border-purple-950/50 p-4 flex items-center justify-between shadow-xl">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total User Emails</div>
                    <div className="text-xl font-bold text-white mt-1 font-mono">{usersWithEmail.length}</div>
                    <div className="text-[10px] text-purple-400 mt-0.5">Synced Supabase Auth</div>
                  </div>
                  <div className="w-10 h-10 rounded-none bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                </div>

                {/* 2. New & Unmailed Users (Special Highlight) */}
                <div
                  onClick={() => setEmailFilter('unmailed')}
                  className={`border p-4 flex items-center justify-between shadow-xl cursor-pointer transition-all ${
                    emailFilter === 'unmailed'
                      ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-[#0c0a14] border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>New & Unmailed</span>
                    </div>
                    <div className="text-xl font-bold text-amber-200 mt-1 font-mono">
                      {unmailedUsersCount}
                    </div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">
                      Never received any email
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-none bg-amber-950/50 border border-amber-500/40 text-amber-300 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                </div>

                {/* 3. Selected Recipients */}
                <div className="bg-[#0c0a14] border border-purple-950/50 p-4 flex items-center justify-between shadow-xl">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Recipients</div>
                    <div className="text-xl font-bold text-white mt-1 font-mono">
                      {selectedEmailUserIds.size > 0 ? selectedEmailUserIds.size : filteredEmailUsers.length}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {selectedEmailUserIds.size > 0 ? 'Custom checked batch' : `Active tab (${emailFilter})`}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-none bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>

                {/* 4. Quick Actions */}
                <div className="bg-[#0c0a14] border border-purple-950/50 p-4 flex flex-col justify-between shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quick Actions</div>
                    <span className="text-[10px] text-emerald-400 font-mono">BCC Ready</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {unmailedUsersCount > 0 ? (
                      <button
                        onClick={() => {
                          setEmailFilter('unmailed');
                          handleOpenComposer('all');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Mail all unmailed users at once"
                      >
                        <Sparkles size={12} />
                        <span>Mail Unmailed ({unmailedUsersCount})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenComposer('all')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Mail all users in view at once"
                      >
                        <Send size={12} />
                        <span>Mail All</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyEmails(filteredEmailUsers.map(u => u.email), 'user emails')}
                      className="px-3 py-1.5 bg-[#07050e] hover:bg-white/10 text-zinc-300 hover:text-white border border-purple-950/60 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Copy all currently filtered emails to clipboard"
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none shadow-xl overflow-hidden">
                {/* Header Filter / Search Bar */}
                <div className="p-4 border-b border-purple-950/40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#07050e]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                      <Mail size={14} className="text-purple-400" />
                      <span>Email Directory</span>
                      <span className="text-zinc-500 font-normal">({filteredEmailUsers.length})</span>
                    </span>

                    {/* Filter Tabs / Chips */}
                    <div className="flex items-center gap-1 ml-0 sm:ml-2 flex-wrap">
                      <button
                        onClick={() => setEmailFilter('unmailed')}
                        className={`px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          emailFilter === 'unmailed'
                            ? 'bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-sm'
                            : 'bg-black/40 text-amber-400/90 border-amber-950/50 hover:bg-amber-950/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>New & Unmailed</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${emailFilter === 'unmailed' ? 'bg-amber-500/20 text-amber-300' : 'bg-black/60 text-zinc-400'}`}>
                          {unmailedUsersCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setEmailFilter('all')}
                        className={`px-2.5 py-1 text-[11px] font-semibold border transition-all cursor-pointer ${
                          emailFilter === 'all'
                            ? 'bg-purple-950/60 text-purple-200 border-purple-500/50'
                            : 'bg-black/40 text-zinc-400 border-purple-950/40 hover:text-zinc-200'
                        }`}
                      >
                        All ({usersWithEmail.length})
                      </button>

                      <button
                        onClick={() => setEmailFilter('mailed')}
                        className={`px-2.5 py-1 text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                          emailFilter === 'mailed'
                            ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/50'
                            : 'bg-black/40 text-zinc-400 border-purple-950/40 hover:text-zinc-200'
                        }`}
                      >
                        <Check size={11} className="text-emerald-400" />
                        <span>Mailed ({mailedUsersCount})</span>
                      </button>

                      {['active', 'excluded', 'google', 'email'].map((tabKey) => (
                        <button
                          key={tabKey}
                          onClick={() => setEmailFilter(tabKey)}
                          className={`px-2 py-0.5 text-[11px] font-semibold border transition-all cursor-pointer capitalize ${
                            emailFilter === tabKey
                              ? 'bg-purple-950/60 text-purple-200 border-purple-500/50'
                              : 'bg-black/40 text-zinc-400 border-purple-950/40 hover:text-zinc-200'
                          }`}
                        >
                          {tabKey}
                        </button>
                      ))}

                      {stats.totalExcluded > 0 && (
                        <button
                          onClick={handleIncludeAllUsers}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                          title="Include all excluded users"
                        >
                          <UserPlus size={11} />
                          <span>Include All ({stats.totalExcluded})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {selectedEmailUserIds.size > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenComposer('selected')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Send size={12} />
                          <span>Mail Selected ({selectedEmailUserIds.size})</span>
                        </button>

                        <button
                          onClick={handleMarkSelectedAsMailed}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                          title="Mark selected users as mailed"
                        >
                          <Check size={12} />
                          <span>Mark Mailed</span>
                        </button>

                        <button
                          onClick={handleUnmarkSelectedAsMailed}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition-colors cursor-pointer"
                          title="Unmark selected users from mailed"
                        >
                          <span>Unmark</span>
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenComposer('all')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Send size={12} />
                      <span>
                        {emailFilter === 'unmailed'
                          ? `Mail Unmailed (${filteredEmailUsers.length})`
                          : `Mail All (${filteredEmailUsers.length})`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#090712] border-b border-purple-950/40 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={filteredEmailUsers.length > 0 && selectedEmailUserIds.size === filteredEmailUsers.length}
                            onChange={handleToggleSelectAllEmails}
                            className="rounded-none accent-purple-500 cursor-pointer"
                            title="Select / Deselect all"
                          />
                        </th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Mail Status</th>
                        <th className="px-4 py-3">Auth Method</th>
                        <th className="px-4 py-3">Registered</th>
                        <th className="px-4 py-3">Activity</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/20">
                      {filteredEmailUsers.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-4 py-12 text-center text-zinc-500">
                            {emailFilter === 'unmailed'
                              ? '🎉 Great job! All registered users have been mailed.'
                              : 'No user emails found matching criteria.'}
                          </td>
                        </tr>
                      ) : (
                        filteredEmailUsers.map((u) => {
                          const isSelected = selectedEmailUserIds.has(u.id);
                          const isCopied = singleCopiedEmail === u.id;

                          return (
                            <tr
                              key={u.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-purple-950/30' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="px-4 py-3.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleUserEmail(u.id)}
                                  className="rounded-none accent-purple-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  {u.avatar_url ? (
                                    <img
                                      src={u.avatar_url}
                                      alt={u.name}
                                      className="w-8 h-8 rounded-full object-cover border border-purple-500/30 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#1b172a] border border-purple-900/60 text-purple-200 flex items-center justify-center font-bold text-xs shrink-0">
                                      {(u.name || 'U').slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                      <span>{u.name || 'Anonymous User'}</span>
                                      {isAdmin(u.email) && <Crown size={11} className="text-amber-400 shrink-0" />}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono truncate">ID: {u.id.slice(0, 12)}...</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2 group">
                                  <span className="font-mono text-xs text-purple-200 font-medium select-all">
                                    {u.email}
                                  </span>
                                  <button
                                    onClick={() => handleCopySingleEmail(u.email, u.id)}
                                    className="text-zinc-500 hover:text-white transition-colors p-1 cursor-pointer"
                                    title="Copy email"
                                  >
                                    {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {u.isMailed ? (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                                      title={u.mailedAt ? `Mailed on ${dayjs(u.mailedAt).format('YYYY-MM-DD HH:mm')}` : 'Mailed'}
                                    >
                                      <Check size={10} className="text-emerald-400" />
                                      <span>Mailed {u.mailedAt ? dayjs(u.mailedAt).fromNow() : ''}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                                    <Sparkles size={10} className="text-amber-400" />
                                    <span>Never Mailed</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-none font-semibold border bg-purple-950/40 text-purple-300 border-purple-500/30">
                                  {u.provider || 'Google'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="text-zinc-300">{dayjs(u.firstSeen).fromNow()}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{dayjs(u.firstSeen).format('MMM D, YYYY')}</div>
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs">
                                <span className="text-purple-300">{u.roomsCount} rooms</span>
                                <span className="text-zinc-600 mx-1">•</span>
                                <span className="text-pink-300">{u.commentsCount} notes</span>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenComposer('single', u)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 rounded-none text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                                    title={`Send email to ${u.email}`}
                                  >
                                    <Mail size={12} className="text-purple-400" />
                                    <span>Mail</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleMarkMailed(u)}
                                    className={`p-1 border transition-colors cursor-pointer ${
                                      u.isMailed
                                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                                        : 'text-zinc-500 border-purple-950/40 hover:text-amber-300 hover:border-amber-500/30'
                                    }`}
                                    title={u.isMailed ? "Click to mark as Unmailed" : "Click to mark as Mailed"}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <a
                                    href={`mailto:${u.email}?subject=${encodeURIComponent('[Blasync] Video Collaboration')}`}
                                    className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                                    title="Direct mailto link"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BROADCAST / COMPOSE EMAIL MODAL */}
              {emailComposerOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="bg-[#0c0a14] border border-purple-950/70 rounded-none p-5 sm:p-6 w-full max-w-2xl shadow-2xl relative animate-in fade-in duration-200 max-h-[90vh] flex flex-col">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-purple-950/40 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-none bg-purple-950/60 border border-purple-500/40 text-purple-300 flex items-center justify-center">
                          <Mail size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">
                            {composerMode === 'single'
                              ? `Send Email to ${singleTargetUser?.name || 'User'}`
                              : composerMode === 'selected'
                              ? `Mail Selected Recipients (${selectedEmailUserIds.size})`
                              : `Broadcast to Users (${filteredEmailUsers.length})`}
                          </h3>
                          <p className="text-[11px] text-zinc-400">
                            {composerMode === 'single'
                              ? singleTargetUser?.email
                              : `Opens your email client with ${
                                  composerMode === 'selected' ? selectedEmailUserIds.size : filteredEmailUsers.length
                                } recipient emails in BCC`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEmailComposerOpen(false)}
                        className="text-zinc-500 hover:text-zinc-300 p-1.5 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
                      {/* Templates Selection */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                          Choose Email Template
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {Object.entries(EMAIL_TEMPLATES).map(([key, t]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleTemplateChange(key)}
                              className={`px-2.5 py-2 text-left text-xs border rounded-none transition-all cursor-pointer ${
                                emailTemplateKey === key
                                  ? 'bg-purple-950/80 text-white border-purple-500/60 shadow-sm'
                                  : 'bg-[#07050e] text-zinc-400 border-purple-950/40 hover:text-zinc-200 hover:bg-white/5'
                              }`}
                            >
                              <div className="font-semibold truncate">{t.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subject Input */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Enter email subject..."
                          className="w-full bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                        />
                      </div>

                      {/* Message Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Message Body
                          </label>
                          <span className="text-[10px] text-zinc-500 font-mono">Use {'{{name}}'} for recipient name</span>
                        </div>
                        <textarea
                          rows={8}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Write your email message here..."
                          className="w-full bg-[#07050e] border border-purple-950/60 rounded-none p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 font-sans leading-relaxed"
                        />
                      </div>

                      {/* Auto-mark as Mailed toggle */}
                      <div className="p-2.5 bg-[#07050e] border border-purple-950/50 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoMarkMailed}
                            onChange={(e) => setAutoMarkMailed(e.target.checked)}
                            className="rounded-none accent-purple-500 cursor-pointer"
                          />
                          <span>Automatically mark recipient(s) as <strong>Mailed</strong> upon sending</span>
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono">Syncs to DB</span>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="pt-3 border-t border-purple-950/40 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 bg-[#0c0a14]">
                      <button
                        type="button"
                        onClick={() => {
                          const list =
                            composerMode === 'single'
                              ? [singleTargetUser?.email]
                              : composerMode === 'selected'
                              ? filteredEmailUsers.filter(u => selectedEmailUserIds.has(u.id)).map(u => u.email)
                              : filteredEmailUsers.map(u => u.email);
                          handleCopyEmails(list.filter(Boolean), 'recipients');
                        }}
                        className="w-full sm:w-auto px-3 py-2 bg-[#07050e] hover:bg-white/10 text-zinc-300 hover:text-white border border-purple-950/60 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>Copy Email List</span>
                      </button>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
                        <button
                          type="button"
                          onClick={() => setEmailComposerOpen(false)}
                          className="px-3 py-2 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleLaunchEmailClient}
                          className="px-3.5 py-2 bg-[#1b172a] hover:bg-purple-950/80 text-purple-200 border border-purple-500/40 font-semibold text-xs rounded-none transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Open default system mail client (Apple Mail, Thunderbird, Outlook)"
                        >
                          <Mail size={13} />
                          <span>Default Mail App</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLaunchGmailWeb}
                          className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-none transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                          title="Open in Gmail Web in a new browser tab"
                        >
                          <Send size={13} />
                          <span>Open in Gmail</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN PRIVILEGES */}
          {activeTab === 'admins' && (
            <div className="max-w-3xl space-y-6">
              {adminMessage && (
                <div className={`p-3 rounded-none text-xs font-semibold ${
                  adminMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {adminMessage.text}
                </div>
              )}

              {/* Add New Admin Form */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white tracking-tight mb-2">
                  Grant Administrator Access
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Administrators have permission to view all workspace statistics, inspect full video sessions, and manage user accounts.
                </p>

                <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter email address (e.g. name@gmail.com)..."
                    value={newAdminInput}
                    onChange={(e) => setNewAdminInput(e.target.value)}
                    className="flex-1 bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!newAdminInput.trim()}
                    className="px-5 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold text-xs rounded-none transition-colors shadow-sm shrink-0 cursor-pointer"
                  >
                    Add +
                  </button>
                </form>
              </div>

              {/* Current Admins List */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-4 sm:p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                  Active Administrators ({adminList.length})
                </h3>

                <div className="divide-y divide-purple-950/30">
                  {adminList.map((email) => {
                    const isPrimary = isPrimaryAdmin(email);
                    return (
                      <div key={email} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-none flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPrimary ? 'bg-purple-900/60 text-purple-200 border border-purple-400/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {isPrimary ? <Crown size={14} className="text-amber-400" /> : <UserCheck size={14} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-100 truncate">{email}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {isPrimary ? 'Primary Super Admin (Permanent)' : 'Co-Administrator'}
                            </div>
                          </div>
                        </div>

                        {!isPrimary && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveAdmin(email)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors cursor-pointer"
                              title="Revoke admin access"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <AnalyticsCharts rooms={rooms} comments={comments} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
