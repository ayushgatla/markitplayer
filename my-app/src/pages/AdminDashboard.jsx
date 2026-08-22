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
  Filter
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin, isPrimaryAdmin, getAdminEmails, addAdminEmail, removeAdminEmail, syncAdminEmailsWithDatabase, normalizeEmail, PRIMARY_ADMIN_EMAIL } from '../utils/adminHelper';
import { parseVideoData, getActiveVideoUrl, detectPlatform } from '../utils/versionHelper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import {
  fetchAllRegisteredUsers,
  getCachedUserProfiles,
  syncExcludedUsersWithDatabase,
  saveExcludedUsers,
  getCachedExcludedUserIds
} from '../utils/userRegistry';

dayjs.extend(relativeTime);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'rooms' | 'admins'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [comments, setComments] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState(getCachedUserProfiles());
  const [excludedUserIds, setExcludedUserIds] = useState(() => new Set(getCachedExcludedUserIds()));
  const [userFilterTab, setUserFilterTab] = useState('all'); // 'all' | 'active' | 'excluded'
  const [adminList, setAdminList] = useState(getAdminEmails());
  const [newAdminInput, setNewAdminInput] = useState('');
  const [adminMessage, setAdminMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [userSortBy, setUserSortBy] = useState('joined-desc'); // 'joined-desc' | 'joined-asc' | 'active-desc' | 'rooms-desc' | 'comments-desc'

  const userEmail = user?.email || user?.user_metadata?.email || user?.raw_user_meta_data?.email || '';
  
  const userIsAdmin = useMemo(() => {
    if (!userEmail) return false;
    const cleanUser = normalizeEmail(userEmail);
    return isAdmin(cleanUser) || adminList.map(normalizeEmail).includes(cleanUser);
  }, [userEmail, adminList]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [roomsRes, commentsRes, syncedAdmins, syncedUsers, syncedExcluded] = await Promise.all([
        supabase.from('rooms').select('*').order('created_at', { ascending: false }),
        supabase.from('comments').select('*').order('created_at', { ascending: false }),
        syncAdminEmailsWithDatabase(),
        fetchAllRegisteredUsers(),
        syncExcludedUsersWithDatabase()
      ]);

      if (roomsRes.data) {
        // Filter out internal system configuration rows from normal rooms stats
        const realRooms = roomsRes.data.filter(
          r => r.folder !== '__system_admin_config__' && 
               r.folder !== '__system_user_registry__' &&
               r.folder !== '__system_excluded_users__'
        );
        setRooms(realRooms);
      }
      if (commentsRes.data) setComments(commentsRes.data);
      if (syncedAdmins) setAdminList(syncedAdmins);
      if (syncedUsers) setRegisteredUsers(syncedUsers);
      if (syncedExcluded) setExcludedUserIds(new Set(syncedExcluded));
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
        const [syncedAdmins, initialUsers, syncedExcluded] = await Promise.all([
          syncAdminEmailsWithDatabase(),
          fetchAllRegisteredUsers(),
          syncExcludedUsersWithDatabase()
        ]);
        if (isMounted) {
          if (syncedAdmins) setAdminList(syncedAdmins);
          if (initialUsers) setRegisteredUsers(initialUsers);
          if (syncedExcluded) setExcludedUserIds(new Set(syncedExcluded));
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

  // Real-time synchronization for Admin Console
  useEffect(() => {
    if (!userIsAdmin) return;

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchData();
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

  // Derive registered users and statistics (clients/unauthenticated guests are NOT included)
  const stats = useMemo(() => {
    const userMap = new Map();

    // 1. Initialize userMap ONLY with verified Supabase Auth accounts (clients not included)
    registeredUsers.forEach(u => {
      const isExcluded = excludedUserIds.has(u.id) || (u.email && excludedUserIds.has(normalizeEmail(u.email)));
      userMap.set(u.id, {
        id: u.id,
        name: u.name || (u.email ? u.email.split('@')[0] : `User_${u.id.slice(0, 6)}`),
        email: u.email || null,
        provider: u.provider || 'Google',
        roomsCount: 0,
        commentsCount: 0,
        firstSeen: u.created_at || '2026-06-01T00:00:00.000Z',
        lastActive: u.last_sign_in_at || u.created_at || '2026-06-01T00:00:00.000Z',
        rooms: [],
        isExcluded
      });
    });

    // 2. Attach room counts to registered user accounts
    rooms.forEach(room => {
      const uId = room.user_id;
      if (!uId) return;

      if (userMap.has(uId)) {
        const u = userMap.get(uId);
        u.roomsCount += 1;
        u.rooms.push(room);
        if (new Date(room.created_at) < new Date(u.firstSeen)) u.firstSeen = room.created_at;
        if (new Date(room.created_at) > new Date(u.lastActive)) u.lastActive = room.created_at;
      }
    });

    // 3. Attach comments count to registered accounts only (clients are not added as user entries)
    comments.forEach(comment => {
      const uId = comment.user_id;
      if (uId && userMap.has(uId)) {
        const u = userMap.get(uId);
        u.commentsCount += 1;
        if (new Date(comment.created_at) > new Date(u.lastActive)) u.lastActive = comment.created_at;
      } else if (comment.author_name) {
        const existingByName = Array.from(userMap.values()).find(
          u => u.name && u.name.toLowerCase() === comment.author_name.toLowerCase()
        );
        if (existingByName) {
          existingByName.commentsCount += 1;
          if (new Date(comment.created_at) > new Date(existingByName.lastActive)) {
            existingByName.lastActive = comment.created_at;
          }
        }
      }
    });

    // Sort list of all users in descending order of who joined latest (newest joined first)
    const allUsersList = Array.from(userMap.values()).sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen));
    const activeUsersList = allUsersList.filter(u => !u.isExcluded);
    const excludedUsersList = allUsersList.filter(u => u.isExcluded);

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

    return {
      totalUsers: activeUsersList.length, // Only active included accounts count towards total!
      totalRegistered: allUsersList.length,
      totalExcluded: excludedUsersList.length,
      users: allUsersList,
      activeUsers: activeUsersList,
      excludedUsers: excludedUsersList,
      totalRooms: rooms.length,
      totalComments: comments.length,
      totalVersions,
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

  // Filtered and sorted users (with inclusion filter + search + sort)
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
      if (userSortBy === 'joined-desc') return new Date(b.firstSeen) - new Date(a.firstSeen);
      if (userSortBy === 'joined-asc') return new Date(a.firstSeen) - new Date(b.firstSeen);
      if (userSortBy === 'active-desc') return new Date(b.lastActive) - new Date(a.lastActive);
      if (userSortBy === 'rooms-desc') return b.roomsCount - a.roomsCount;
      if (userSortBy === 'comments-desc') return b.commentsCount - a.commentsCount;
      return new Date(b.firstSeen) - new Date(a.firstSeen);
    });
  }, [stats.users, searchQuery, userSortBy, userFilterTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans text-zinc-400 text-sm">
        Loading Admin Console...
      </div>
    );
  }

  // Access Denied State
  if (!userIsAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold mb-2">Access Restricted</h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            The Admin Console is restricted to designated administrators. Current signed-in account: <span className="font-mono text-indigo-300 font-semibold">{userEmail || 'Guest'}</span>.
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} />
              <span>Check Admin Permissions</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-900"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <span className="text-zinc-700">/</span>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Shield size={13} />
            </div>
            <h1 className="text-sm font-semibold text-white">Admin Console</h1>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.2 rounded">
              Super Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            title="Refresh database records"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="text-xs text-zinc-400 hidden md:flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{userEmail}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 size={14} />
          <span>Overview & Statistics</span>
        </button>

        <button
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users size={14} />
          <span>User Directory ({stats.totalUsers})</span>
          {stats.totalExcluded > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
              {stats.totalExcluded} excluded
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('rooms'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Film size={14} />
          <span>All Sessions ({stats.totalRooms})</span>
        </button>

        <button
          onClick={() => { setActiveTab('admins'); setSearchQuery(''); }}
          className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === 'admins'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserCheck size={14} />
          <span>Admin Access ({adminList.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: OVERVIEW & STATISTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Total Users</span>
                  <Users size={16} className="text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <div className="text-[11px] mt-1 flex items-center justify-between">
                  <span className={stats.totalExcluded > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
                    {stats.totalExcluded > 0 ? `${stats.totalExcluded} accounts excluded` : `${stats.totalRegistered} registered platform accounts`}
                  </span>
                  {stats.totalExcluded > 0 && (
                    <button
                      onClick={() => { setActiveTab('users'); setUserFilterTab('excluded'); }}
                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Total Sessions</span>
                  <Film size={16} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalRooms}</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {stats.states.approved} approved ({Math.round((stats.states.approved / (stats.totalRooms || 1)) * 100)}%)
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Feedback Comments</span>
                  <MessageSquare size={16} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalComments}</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Across all review timeline markers
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium">Video Versions</span>
                  <Layers size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalVersions}</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Google Drive & YouTube revisions
                </div>
              </div>
            </div>

            {/* Bespoke Interactive Analytics & Velocity Charts */}
            <AnalyticsCharts rooms={rooms} comments={comments} />

            {/* Top Active Creators List */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Top Active Creators & Users
                </h3>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>View full directory</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {stats.activeUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-[10px] border border-zinc-700/60">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-200">{u.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">Joined {dayjs(u.firstSeen).fromNow()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400">
                      <span>{u.roomsCount} sessions</span>
                      <span>{u.commentsCount} comments</span>
                      <span className="text-[11px] text-zinc-500">Active {dayjs(u.lastActive).fromNow()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS DIRECTORY (With Account Exclusion Options) */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter Pills, Search, and Sort Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Account Inclusion Filter Tabs */}
                <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                  <button
                    onClick={() => setUserFilterTab('all')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      userFilterTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All Accounts ({stats.totalRegistered})
                  </button>
                  <button
                    onClick={() => setUserFilterTab('active')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      userFilterTab === 'active'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Active in Totals ({stats.totalUsers})
                  </button>
                  <button
                    onClick={() => setUserFilterTab('excluded')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                      userFilterTab === 'excluded'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Excluded ({stats.totalExcluded})
                  </button>
                </div>

                <div className="text-xs text-zinc-400 font-mono">
                  Showing {filteredUsers.length} of {stats.totalRegistered} registered users
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search accounts by name, email or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">Sort by:</span>
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="joined-desc">Joined: Newest First (Latest)</option>
                      <option value="joined-asc">Joined: Oldest First</option>
                      <option value="active-desc">Last Active</option>
                      <option value="rooms-desc">Most Sessions Created</option>
                      <option value="comments-desc">Most Comments Left</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/60 border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User & Account</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Comments</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3">Inclusion in Total</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                        No registered users match the current filter or search criteria.
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
                              : 'hover:bg-zinc-800/30'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                                u.isExcluded
                                  ? 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40'
                                  : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/30'
                              }`}>
                                {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold flex items-center gap-1.5 truncate">
                                  <span className={u.isExcluded ? 'text-zinc-400 line-through' : 'text-zinc-100'}>
                                    {u.name}
                                  </span>
                                  {isUserAdmin && <Crown size={11} className="text-amber-400 shrink-0" />}
                                  {u.isExcluded && (
                                    <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-normal">
                                      Excluded
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 truncate">{u.email || 'No email associated'}</div>
                                <div className="text-[9px] font-mono text-zinc-600 truncate" title={`UID: ${u.id}`}>ID: {u.id.slice(0, 16)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              provider.includes('Google') ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                              provider.includes('Email') ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                              'bg-zinc-800 text-zinc-300 border-zinc-700/50'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {provider}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-200 font-medium">{dayjs(u.firstSeen).fromNow()}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{dayjs(u.firstSeen).format('MMM D, YYYY')}</div>
                          </td>
                          <td className="px-4 py-3 text-zinc-300 font-mono">
                            <span className={u.roomsCount > 0 ? 'text-indigo-400 font-bold' : 'text-zinc-500'}>
                              {u.roomsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-300 font-mono">
                            <span className={u.commentsCount > 0 ? 'text-purple-400 font-bold' : 'text-zinc-500'}>
                              {u.commentsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{dayjs(u.lastActive).fromNow()}</td>
                          
                          {/* Option to select/toggle which accounts are included/excluded from total */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleUserExclusion(u.id, u.email)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                                u.isExcluded
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-zinc-800 text-emerald-300 hover:text-zinc-200 border-emerald-500/20 hover:border-zinc-700'
                              }`}
                              title={u.isExcluded ? "Click to include account in total count" : "Click to exclude account from total count"}
                            >
                              {u.isExcluded ? (
                                <>
                                  <UserPlus size={12} />
                                  <span>Include in Total</span>
                                </>
                              ) : (
                                <>
                                  <Check size={12} className="text-emerald-400" />
                                  <span>Included</span>
                                  <span className="text-[9px] text-zinc-500 hover:text-zinc-300 ml-1">· Exclude</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            {isUserAdmin ? (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                                Admin
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 bg-zinc-800/80 border border-zinc-700/40 px-2 py-0.5 rounded-full">
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
        )}

        {/* TAB 3: ALL SESSIONS */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search sessions by title, URL or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="all">All States</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="text-xs text-zinc-400 font-mono">
                  {filteredRooms.length} of {rooms.length}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/60 border-b border-zinc-800 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Session Title</th>
                    <th className="px-4 py-3">Platform & Version</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredRooms.map((room) => {
                    const videoData = parseVideoData(room.video_url, room.created_at);
                    const activeUrl = getActiveVideoUrl(room.video_url);
                    const platform = detectPlatform(activeUrl);
                    return (
                      <tr key={room.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-200">{room.title || 'Untitled'}</div>
                          <div className="text-[10px] font-mono text-zinc-500">{room.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {platform === 'drive' ? (
                              <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                            ) : platform === 'youtube' ? (
                              <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                            ) : null}
                            <span className="capitalize text-zinc-300">{platform}</span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1 py-0.2 rounded">
                              V{videoData.currentVersion} ({videoData.versions.length} ver)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                            (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            (room.state || 'In Progress') === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {room.state || 'In Progress'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{dayjs(room.created_at).format('MMM D, YYYY')}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => window.open(`/room/${room.id}`, '_blank')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
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
        )}

        {/* TAB 4: ADMIN ACCESS MANAGEMENT */}
        {activeTab === 'admins' && (
          <div className="max-w-2xl space-y-6">
            {adminMessage && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                adminMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {adminMessage.text}
              </div>
            )}

            {/* Add New Admin Form */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Grant Admin Privileges
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Administrators have full access to view platform user statistics, inspect sessions, and manage settings.
              </p>

              <form onSubmit={handleAddAdmin} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={newAdminInput}
                  onChange={(e) => setNewAdminInput(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
                <button
                  type="submit"
                  disabled={!newAdminInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  Add Admin
                </button>
              </form>
            </div>

            {/* Current Admins List */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                Active Administrators ({adminList.length})
              </h3>

              <div className="divide-y divide-zinc-800/60">
                {adminList.map((email) => {
                  const isPrimary = isPrimaryAdmin(email);
                  return (
                    <div key={email} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          isPrimary ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                        }`}>
                          {isPrimary ? <Crown size={12} /> : <UserCheck size={12} />}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-200">{email}</div>
                          <div className="text-[10px] text-zinc-500">
                            {isPrimary ? 'Primary Super Admin (Permanent)' : 'Co-Administrator'}
                          </div>
                        </div>
                      </div>

                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(email)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Revoke admin access"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
