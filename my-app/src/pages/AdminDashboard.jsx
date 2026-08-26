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
  ChevronDown
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
  getCachedUserProfiles,
  syncExcludedUsersWithDatabase,
  saveExcludedUsers,
  getCachedExcludedUserIds
} from '../utils/userRegistry';

dayjs.extend(relativeTime);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'users' | 'admins' | 'analytics'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [comments, setComments] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState(getCachedUserProfiles());
  const [excludedUserIds, setExcludedUserIds] = useState(() => new Set(getCachedExcludedUserIds()));
  const [userFilterTab, setUserFilterTab] = useState('all'); // 'all' | 'active' | 'excluded'
  const [adminList, setAdminList] = useState(getAdminEmails());
  const [newAdminInput, setNewAdminInput] = useState('');
  const [adminMessage, setAdminMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [userSortBy, setUserSortBy] = useState('joined-desc');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('monthly'); // 'all' | 'monthly' | 'weekly' | 'today'

  const userEmail = user?.email || user?.user_metadata?.email || user?.raw_user_meta_data?.email || '';

  const userIsAdmin = useMemo(() => {
    if (!userEmail) return false;
    const cleanUser = normalizeEmail(userEmail);
    return isAdmin(cleanUser) || adminList.map(normalizeEmail).includes(cleanUser);
  }, [userEmail, adminList]);

  // Robust data fetching from Supabase
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
    const userMap = new Map();

    // 1. Seed with registered accounts
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

    // 2. Discover active creators in rooms (even if not yet in seed registry)
    rooms.forEach(room => {
      const uId = room.user_id;
      if (!uId) return;

      if (!userMap.has(uId)) {
        userMap.set(uId, {
          id: uId,
          name: `User_${uId.slice(0, 6)}`,
          email: null,
          provider: 'Registered',
          roomsCount: 0,
          commentsCount: 0,
          firstSeen: room.created_at || new Date().toISOString(),
          lastActive: room.created_at || new Date().toISOString(),
          rooms: [],
          isExcluded: excludedUserIds.has(uId)
        });
      }

      const u = userMap.get(uId);
      u.roomsCount += 1;
      u.rooms.push(room);
      if (new Date(room.created_at) < new Date(u.firstSeen)) u.firstSeen = room.created_at;
      if (new Date(room.created_at) > new Date(u.lastActive)) u.lastActive = room.created_at;
    });

    // 3. Attach comments count
    comments.forEach(comment => {
      const uId = comment.user_id;
      if (uId) {
        if (!userMap.has(uId)) {
          userMap.set(uId, {
            id: uId,
            name: comment.author_name || (comment.author || `User_${uId.slice(0, 6)}`),
            email: null,
            provider: 'Registered',
            roomsCount: 0,
            commentsCount: 0,
            firstSeen: comment.created_at || new Date().toISOString(),
            lastActive: comment.created_at || new Date().toISOString(),
            rooms: [],
            isExcluded: excludedUserIds.has(uId)
          });
        }
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
    const completionRate = rooms.length > 0 ? Math.round((approvedCount / rooms.length) * 100) : 0;

    return {
      totalUsers: activeUsersList.length,
      totalRegistered: allUsersList.length,
      totalExcluded: excludedUsersList.length,
      users: allUsersList,
      activeUsers: activeUsersList,
      excludedUsers: excludedUsersList,
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
      if (userSortBy === 'joined-desc') return new Date(b.firstSeen) - new Date(a.firstSeen);
      if (userSortBy === 'joined-asc') return new Date(a.firstSeen) - new Date(b.firstSeen);
      if (userSortBy === 'active-desc') return new Date(b.lastActive) - new Date(a.lastActive);
      if (userSortBy === 'rooms-desc') return b.roomsCount - a.roomsCount;
      if (userSortBy === 'comments-desc') return b.commentsCount - a.commentsCount;
      return new Date(b.firstSeen) - new Date(a.firstSeen);
    });
  }, [stats.users, searchQuery, userSortBy, userFilterTab]);

  // Multi-period Chart Bar Data Generator for Project Statistics
  const projectChartData = useMemo(() => {
    const slots = chartPeriod === 'today' ? 6 : chartPeriod === 'weekly' ? 7 : chartPeriod === 'monthly' ? 12 : 8;
    const data = [];
    const now = dayjs();

    for (let i = slots - 1; i >= 0; i--) {
      let label = '';
      let dateKey = '';

      if (chartPeriod === 'today') {
        const h = now.subtract(i * 4, 'hour');
        label = h.format('HH:00');
        dateKey = h.format('YYYY-MM-DD-HH');
      } else if (chartPeriod === 'weekly') {
        const d = now.subtract(i, 'day');
        label = d.format('ddd');
        dateKey = d.format('YYYY-MM-DD');
      } else if (chartPeriod === 'monthly') {
        const d = now.subtract(i * 2.5, 'day');
        label = d.format('D MMM');
        dateKey = d.format('YYYY-MM-DD');
      } else {
        const m = now.subtract(i, 'month');
        label = m.format('MMM');
        dateKey = m.format('YYYY-MM');
      }

      // Count actual rooms & comments
      const countRooms = rooms.filter(r => dayjs(r.created_at).format('YYYY-MM-DD').includes(dateKey.slice(0, 7))).length;
      const countComments = comments.filter(c => dayjs(c.created_at).format('YYYY-MM-DD').includes(dateKey.slice(0, 7))).length;

      // Realistic visual weights based on live data
      const barHeight1 = Math.max(15, Math.min(95, (countRooms * 18) + (i % 3 === 0 ? 45 : 25)));
      const barHeight2 = Math.max(10, Math.min(85, (countComments * 12) + (i % 2 === 0 ? 35 : 20)));

      data.push({
        label,
        val1: barHeight1,
        val2: barHeight2,
        roomsCount: countRooms,
        commentsCount: countComments
      });
    }
    return data;
  }, [rooms, comments, chartPeriod]);

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
        <div className="bg-[#0c0a14] border border-purple-950/60 rounded-none p-8 max-w-md w-full text-center shadow-2xl">
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
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-none text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} />
              <span>Check Admin Permissions</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 bg-[#07050e] hover:bg-white/5 text-zinc-300 border border-purple-950/50 rounded-none text-xs font-medium transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 font-sans flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR (Fillow Style) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0a14] border-r border-purple-950/40 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Logo */}
        <div className="h-16 px-6 border-b border-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              M
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>markit.</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-mono font-normal">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">SaaS Console</div>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden text-zinc-500 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">Main Menu</div>
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-none transition-all ${
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
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all ${
                  activeTab === 'projects'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Film size={15} className={activeTab === 'projects' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Projects & Sessions</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                  {stats.totalRooms}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all ${
                  activeTab === 'users'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={15} className={activeTab === 'users' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Users Directory</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                  {stats.totalUsers}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('admins'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-none transition-all ${
                  activeTab === 'admins'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={15} className={activeTab === 'admins' ? 'text-purple-400' : 'text-zinc-500'} />
                  <span>Admin Privileges</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">
                  {adminList.length}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-none transition-all ${
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
                className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-none transition-colors"
              >
                <ArrowLeft size={14} className="text-zinc-500" />
                <span>Return to Player App</span>
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-none transition-colors"
              >
                <Bell size={14} className="text-zinc-500" />
                <span>Notifications</span>
              </button>
            </nav>
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-purple-950/40 bg-[#07050e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-200 flex items-center justify-center font-bold text-xs">
              {(userEmail || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{userEmail}</div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Admin</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-8 border-b border-purple-950/40 bg-[#0c0a14] flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white p-1.5 rounded-none"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight capitalize">
                {activeTab === 'overview' ? 'Dashboard' : activeTab === 'projects' ? 'Projects' : activeTab === 'users' ? 'Users' : activeTab === 'admins' ? 'Admins' : 'Analytics'}
              </h1>
              <span className="hidden sm:inline text-xs text-zinc-600">/</span>
              <span className="hidden sm:inline text-xs text-zinc-400 font-mono">Live Supabase Sync</span>
            </div>
          </div>

          {/* Search Bar & Quick Icons */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative hidden sm:block w-48 lg:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search here..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* Quick Refresh Button */}
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 text-zinc-400 hover:text-white bg-[#07050e] hover:bg-white/5 border border-purple-950/50 rounded-none transition-colors"
              title="Refresh database records"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
            </button>

            {/* Notifications Pill */}
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 text-zinc-400 hover:text-white bg-[#07050e] hover:bg-white/5 border border-purple-950/50 rounded-none transition-colors relative"
              title="Notifications"
            >
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500"></span>
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400/40 text-white flex items-center justify-center font-bold text-xs shadow-md">
              {(userEmail || 'A').slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* TOP HERO BANNER & STATS ROW (Fillow Reference Layout) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Hero Banner Card (7 cols) */}
                <div className="lg:col-span-7 bg-gradient-to-r from-[#201140] via-[#160d2b] to-[#0c0a14] border border-purple-950/60 rounded-none p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  {/* Decorative background glow */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>

                  <div className="relative z-10 max-w-md">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
                      Manage your project in <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">one touch</span>
                    </h2>
                    <p className="text-xs md:text-sm text-zinc-300 mb-6 leading-relaxed">
                      Let MarkIt Player manage your review projects automatically with live Supabase synchronization, timeline markers, and collaborative drawing tools.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-none transition-colors shadow-lg"
                      >
                        Back to Player
                      </button>
                      <button
                        onClick={fetchData}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-purple-500/30 font-semibold text-xs rounded-none transition-colors"
                      >
                        Live Sync
                      </button>
                    </div>
                  </div>

                  {/* Visual Illustration / Mini Stat on Right */}
                  <div className="hidden sm:block absolute right-6 bottom-6 opacity-90 pointer-events-none">
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
                <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                  {/* Total Clients / Users */}
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Total Clients</div>
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
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-5 shadow-xl flex flex-col justify-between">
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
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-5 shadow-xl flex flex-col justify-between">
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
                  <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-5 shadow-xl flex flex-col justify-between">
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

              {/* PROJECT STATISTICS & COMPLETION RADIAL SECTION (Fillow Reference Mid-Row) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Project Statistics Bar Chart (8 cols) */}
                <div className="lg:col-span-8 bg-[#0c0a14] border border-purple-950/50 rounded-none p-6 shadow-xl flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">Project Statistics</h3>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                          <strong className="text-white">{stats.totalRooms}</strong> Total Projects
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                          <strong className="text-white">{stats.states.inProgress}</strong> On Going
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                          <strong className="text-white">{stats.states.rejected}</strong> Unfinished
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <strong className="text-white">{stats.states.approved}</strong> Completed
                        </span>
                      </div>
                    </div>

                    {/* Period Pills Filter */}
                    <div className="inline-flex p-1 bg-[#07050e] border border-purple-950/50 rounded-none text-xs">
                      {['all', 'monthly', 'weekly', 'today'].map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-3 py-1 text-xs font-semibold capitalize transition-colors rounded-none ${
                            chartPeriod === period
                              ? 'bg-[#191328] text-white border border-purple-500/30'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {period === 'all' ? 'All Time' : period}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="h-56 w-full relative flex items-end justify-between gap-2 px-2 pt-6 pb-2 border-b border-purple-950/40">
                    {projectChartData.map((d, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-purple-500/30 text-white text-[10px] px-2 py-1 rounded-none shadow-xl pointer-events-none whitespace-nowrap z-20 font-mono">
                          {d.label}: {d.roomsCount} sessions · {d.commentsCount} comments
                        </div>

                        {/* Dual Column Bars */}
                        <div className="w-full max-w-[28px] flex items-end justify-center gap-1 h-full">
                          <div 
                            className="w-1/2 bg-gradient-to-t from-pink-600 to-pink-400 rounded-none transition-all duration-500 hover:brightness-125"
                            style={{ height: `${d.val1}%` }}
                          />
                          <div 
                            className="w-1/2 bg-gradient-to-t from-purple-700 to-indigo-500 rounded-none transition-all duration-500 hover:brightness-125"
                            style={{ height: `${d.val2}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono mt-2 truncate max-w-full">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project Completion Radial Donut Card (4 cols) */}
                <div className="lg:col-span-4 bg-[#0c0a14] border border-purple-950/50 rounded-none p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight mb-1">Session Completion</h3>
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                      Approval velocity and review completion across all active video revisions.
                    </p>
                  </div>

                  {/* Radial Gauge Visual */}
                  <div className="flex flex-col items-center justify-center my-4 relative">
                    <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#191328"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      {/* Progress Circle */}
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
                      <span className="text-2xl font-black text-white">{stats.completionRate}%</span>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Approved</span>
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
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Recent Sessions & Projects</h3>
                    <p className="text-xs text-zinc-400">Live review sessions uploaded by creators</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    <span>View all ({stats.totalRooms})</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Session Title</th>
                        <th className="px-4 py-3">Platform</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Versions</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Action</th>
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
                              <div className="font-semibold text-zinc-100">{room.title || 'Untitled Session'}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{room.id}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                {platform === 'drive' ? (
                                  <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                                ) : platform === 'youtube' ? (
                                  <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                                ) : null}
                                <span className="capitalize text-zinc-300">{platform || 'Direct'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-none font-semibold border ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {room.state || 'In Progress'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-zinc-300">
                              V{videoData.currentVersion} ({videoData.versions.length} ver)
                            </td>
                            <td className="px-4 py-3.5 text-zinc-400 font-mono">
                              {dayjs(room.created_at).format('MMM D, YYYY')}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => window.open(`/room/${room.id}`, '_blank')}
                                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
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

                <div className="flex items-center gap-3">
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
                  <div className="text-xs text-zinc-400 font-mono">
                    {filteredRooms.length} of {rooms.length}
                  </div>
                </div>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Session Details</th>
                      <th className="px-4 py-3">Platform & Revisions</th>
                      <th className="px-4 py-3">Review State</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
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
                              <div className="font-semibold text-zinc-100">{room.title || 'Untitled Session'}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{room.id}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                {platform === 'drive' ? (
                                  <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                                ) : platform === 'youtube' ? (
                                  <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                                ) : null}
                                <span className="capitalize text-zinc-300">{platform || 'Direct'}</span>
                                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/20 px-1 py-0.2 rounded-none">
                                  V{videoData.currentVersion} ({videoData.versions.length} ver)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <select
                                value={room.state || 'In Progress'}
                                onChange={(e) => handleUpdateRoomState(room.id, e.target.value)}
                                className="bg-[#07050e] border border-purple-950/50 text-xs px-2 py-1 rounded-none text-zinc-200 cursor-pointer focus:outline-none"
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-400 font-mono">
                              {dayjs(room.created_at).format('MMM D, YYYY')}
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => window.open(`/room/${room.id}`, '_blank')}
                                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
                              >
                                <span>Open</span>
                                <ExternalLink size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="text-xs text-red-400 hover:text-red-300 p-1"
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
          )}

          {/* TAB 3: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 bg-[#0c0a14] p-4 border border-purple-950/50 rounded-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Account Inclusion Filter Tabs */}
                  <div className="inline-flex p-1 bg-[#07050e] border border-purple-950/50 rounded-none text-xs">
                    <button
                      onClick={() => setUserFilterTab('all')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all ${
                        userFilterTab === 'all'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      All Accounts ({stats.totalRegistered})
                    </button>
                    <button
                      onClick={() => setUserFilterTab('active')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all ${
                        userFilterTab === 'active'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Active in Totals ({stats.totalUsers})
                    </button>
                    <button
                      onClick={() => setUserFilterTab('excluded')}
                      className={`px-3 py-1.5 font-semibold rounded-none transition-all ${
                        userFilterTab === 'excluded'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Excluded ({stats.totalExcluded})
                    </button>
                  </div>

                  <div className="text-xs text-zinc-400 font-mono">
                    Showing {filteredUsers.length} of {stats.totalRegistered} registered accounts
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
                      className="w-full bg-[#07050e] border border-purple-950/60 rounded-none pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 whitespace-nowrap">Sort:</span>
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value)}
                      className="bg-[#07050e] border border-purple-950/60 rounded-none px-3 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="joined-desc">Joined: Newest First</option>
                      <option value="joined-asc">Joined: Oldest First</option>
                      <option value="active-desc">Last Active</option>
                      <option value="rooms-desc">Most Sessions Created</option>
                      <option value="comments-desc">Most Comments Left</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Directory Table */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07050e] border-b border-purple-950/50 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Account & User</th>
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
                          No registered users match the current filter.
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                                  u.isExcluded
                                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                    : 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white border-purple-400/40'
                                }`}>
                                  {(u.name || u.email || 'U').slice(0, 2).toUpperCase()}
                                </div>
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
                            <td className="px-4 py-3.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-none font-semibold border bg-purple-950/40 text-purple-300 border-purple-500/30">
                                {provider}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-zinc-200 font-medium">{dayjs(u.firstSeen).fromNow()}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">{dayjs(u.firstSeen).format('MMM D, YYYY')}</div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-purple-300 font-bold">
                              {u.roomsCount}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-pink-300 font-bold">
                              {u.commentsCount}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-400">{dayjs(u.lastActive).fromNow()}</td>
                            <td className="px-4 py-3.5">
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
                            <td className="px-4 py-3.5">
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
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white tracking-tight mb-2">
                  Grant Administrator Access
                </h3>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Administrators have permission to view all workspace statistics, inspect full video sessions, and manage user accounts.
                </p>

                <form onSubmit={handleAddAdmin} className="flex gap-2">
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
                    className="px-5 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold text-xs rounded-none transition-colors shadow-sm shrink-0"
                  >
                    Add +
                  </button>
                </form>
              </div>

              {/* Current Admins List */}
              <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white tracking-tight mb-4">
                  Active Administrators ({adminList.length})
                </h3>

                <div className="divide-y divide-purple-950/30">
                  {adminList.map((email) => {
                    const isPrimary = isPrimaryAdmin(email);
                    return (
                      <div key={email} className="py-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isPrimary ? 'bg-purple-900/60 text-purple-200 border border-purple-400/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {isPrimary ? <Crown size={14} className="text-amber-400" /> : <UserCheck size={14} />}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-100">{email}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {isPrimary ? 'Primary Super Admin (Permanent)' : 'Co-Administrator'}
                            </div>
                          </div>
                        </div>

                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(email)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors"
                            title="Revoke admin access"
                          >
                            <Trash2 size={14} />
                          </button>
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
