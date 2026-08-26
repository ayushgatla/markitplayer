import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Video, Clock, Users, ArrowRight, LogOut, Trash2, Home, 
  Search, Bell, Settings, HelpCircle, Folder, LayoutGrid, MonitorPlay, 
  Image as ImageIcon, Music, CheckCircle, ListFilter, MessageSquare, 
  ChevronDown, Check, XCircle, MoreVertical, Edit2, Menu, X, Shield, 
  Pencil, RefreshCw, BarChart3, TrendingUp, Sparkles, Film, ArrowUpRight, 
  Layers, ExternalLink, Activity, Filter, ChevronRight, User as UserIcon,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getActiveVideoUrl, parseVideoData, getActiveVersionObj } from '../utils/versionHelper';
import { isAdmin, getAdminEmails, syncAdminEmailsWithDatabase, normalizeEmail } from '../utils/adminHelper';
import { parseComment } from '../utils/commentHelper';

dayjs.extend(relativeTime);

const getThumbnailUrl = (rawUrl) => {
  const url = getActiveVideoUrl(rawUrl);
  if (!url) return null;
  
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  
  const gdMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=))([a-zA-Z0-9_-]+)/);
  if (gdMatch && gdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdMatch[1]}=w800-h600`;
  }
  
  return null;
};

const getFallbackIcon = (rawUrl) => {
  const url = getActiveVideoUrl(rawUrl);
  if (!url) return null;
  if (url.includes('instagram.com')) return '/instagram.png';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '/youtube.png';
  if (url.includes('drive.google.com')) return '/drive.png';
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'workspace' (exact classic dashboard structure) | 'profile_dashboard' (shown when clicking profile button)
  const [currentMode, setCurrentMode] = useState('workspace');
  const [profileActiveSubTab, setProfileActiveSubTab] = useState('overview');

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All Rooms');
  const [activeState, setActiveState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenForRoom, setMenuOpenForRoom] = useState(null);
  
  // Resizable left sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [layoutView, setLayoutView] = useState('grid');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);
  const [visibleFields, setVisibleFields] = useState({ date: true, users: true, comments: true, version: true });
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reviewFilterTab, setReviewFilterTab] = useState('all');
  const [chartPeriod, setChartPeriod] = useState('monthly');

  const [adminEmails, setAdminEmails] = useState(getAdminEmails());
  const [customFolders, setCustomFolders] = useState(() => {
    const saved = localStorage.getItem('feedplayer_folders');
    return saved ? JSON.parse(saved) : ['Marketing Assets', 'Internal Reviews'];
  });

  const userEmail = user?.email || user?.user_metadata?.email || user?.raw_user_meta_data?.email || '';
  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator';
  const avatarUrl = user?.user_metadata?.avatar_url || 
                    user?.user_metadata?.picture || 
                    user?.raw_user_meta_data?.avatar_url || 
                    user?.raw_user_meta_data?.picture || 
                    user?.identities?.[0]?.identity_data?.avatar_url || 
                    user?.identities?.[0]?.identity_data?.picture;

  const userIsAdmin = useMemo(() => {
    if (!userEmail) return false;
    const clean = normalizeEmail(userEmail);
    return isAdmin(clean) || adminEmails.map(normalizeEmail).includes(clean);
  }, [userEmail, adminEmails]);

  useEffect(() => {
    syncAdminEmailsWithDatabase().then(list => {
      if (list) setAdminEmails(list);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('feedplayer_folders', JSON.stringify(customFolders));
  }, [customFolders]);

  // Sidebar drag resizer
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(180, Math.min(450, e.clientX));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleCreateFolder = () => {
    const newFolder = window.prompt("Enter new folder name:");
    if (!newFolder || !newFolder.trim()) return;
    if (!customFolders.includes(newFolder.trim())) {
      setCustomFolders([...customFolders, newFolder.trim()]);
    }
  };

  // Fetch rooms whenever user becomes available
  useEffect(() => {
    if (user) {
      fetchRooms(true);
    } else {
      setRooms([]);
      setLoading(false);
    }
  }, [user]);

  // Real-time live synchronization with Supabase
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dashboard-realtime-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchRooms(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments'
        },
        () => {
          fetchRooms(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (rooms.length > 0) {
      fetchNotifications(rooms);
    }
  }, [rooms]);

  const fetchNotifications = async (userRooms) => {
    const roomIds = userRooms.map(r => r.id);
    if (roomIds.length === 0) return;

    const roomMap = {};
    userRooms.forEach(r => { roomMap[r.id] = r.title || 'Untitled Session'; });

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        const formatted = data.map(c => ({
          ...parseComment(c),
          roomTitle: roomMap[c.room_id] || 'Room'
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchRooms = async (showFullLoading = true) => {
    if (!user) return;
    if (showFullLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, comments(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching rooms:', error);
      } else {
        setRooms(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching rooms:', err);
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (refreshing || !user) return;
    setRefreshing(true);
    try {
      await fetchRooms(false);
      if (rooms.length > 0) {
        await fetchNotifications(rooms);
      }
    } catch (err) {
      console.error('Error during manual refresh:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    
    const defaultFolder = activeFolder !== 'All Rooms' ? activeFolder : null;
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        { 
          title: 'Untitled Session', 
          user_id: user.id,
          folder: defaultFolder
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Make sure you set up the database tables!');
    } else if (data) {
      navigate(`/room/${data.id}`);
    }
  };

  const toggleRoomSelection = (e, roomId) => {
    e.stopPropagation();
    setSelectedRooms(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedRooms.length} room(s)?`)) {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .in('id', selectedRooms);

      if (error) {
        alert("Error deleting rooms: " + error.message);
      } else {
        setRooms(rooms.filter(r => !selectedRooms.includes(r.id)));
        setSelectedRooms([]);
      }
    }
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this room?")) {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) {
        alert("Error deleting room: " + error.message);
      } else {
        setRooms(rooms.filter(r => r.id !== roomId));
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalProjects = rooms.length;
    const approvedRooms = rooms.filter(r => (r.state || 'In Progress') === 'Approved').length;
    const inProgressRooms = rooms.filter(r => (r.state || 'In Progress') === 'In Progress').length;
    const rejectedRooms = rooms.filter(r => (r.state || 'In Progress') === 'Rejected').length;
    const totalFeedback = rooms.reduce((acc, r) => acc + (r.comments?.[0]?.count || 0), 0);
    
    let totalVersions = 0;
    rooms.forEach(r => {
      if (r.video_url) {
        const vData = parseVideoData(r.video_url);
        totalVersions += (vData.versions?.length || 1);
      } else {
        totalVersions += 1;
      }
    });

    const approvalRate = totalProjects > 0 ? Math.round((approvedRooms / totalProjects) * 100) : 0;
    const drawingsCount = notifications.filter(n => n.hasDrawing).length;

    return {
      totalProjects,
      approvedRooms,
      inProgressRooms,
      rejectedRooms,
      totalFeedback,
      totalVersions,
      approvalRate,
      drawingsCount
    };
  }, [rooms, notifications]);

  // Filtered rooms for standard workspace
  const filteredRooms = useMemo(() => {
    return rooms
      .filter(room => {
        if (activeFolder !== 'All Rooms') {
          if (room.folder !== activeFolder) return false;
        }
        if (activeState) {
          if ((room.state || 'In Progress') !== activeState) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (room.title || '').toLowerCase().includes(q);
          const matchId = room.id.toLowerCase().includes(q);
          const matchFolder = (room.folder || '').toLowerCase().includes(q);
          return matchTitle || matchId || matchFolder;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
        if (sortBy === 'comments-desc') return (b.comments?.[0]?.count || 0) - (a.comments?.[0]?.count || 0);
        return 0;
      });
  }, [rooms, activeFolder, activeState, searchQuery, sortBy]);

  const visibleFieldsCount = Object.values(visibleFields).filter(Boolean).length;

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-zinc-100 font-sans overflow-hidden select-none relative">
      
      {/* Background Decorative Rings Watermark (From classic design) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden z-0">
        <div className="absolute -right-40 -bottom-40 w-[600px] h-[600px] rounded-full border border-purple-900/30"></div>
        <div className="absolute -right-20 -bottom-20 w-[440px] h-[440px] rounded-full border border-purple-900/20"></div>
        <div className="absolute -right-0 -bottom-0 w-[280px] h-[280px] rounded-full border border-purple-900/20"></div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: PROFILE DASHBOARD VIEW (Opened on Profile Button click)           */}
      {/* ========================================================================= */}
      {currentMode === 'profile_dashboard' ? (
        <div className="relative z-10 flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden animate-in fade-in duration-200">
          
          {/* Profile Sidebar */}
          <aside className="w-full md:w-64 bg-[#0c0a14] border-r border-purple-950/50 flex flex-col shrink-0 shadow-2xl">
            <div className="h-16 px-5 border-b border-purple-950/40 flex items-center justify-between">
              <button 
                onClick={() => setCurrentMode('workspace')}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white bg-[#07050e] hover:bg-white/10 px-2.5 py-1.5 rounded-none border border-purple-950/50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Rooms</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-4 border-b border-purple-950/40 bg-[#07050e] flex items-center gap-3">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-none object-cover border border-purple-500/40 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400/40 text-white rounded-none flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  {userName.substring(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-white truncate">{userName}</h3>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{userEmail}</p>
                <span className="text-[9px] font-mono text-purple-400 font-semibold uppercase tracking-wider mt-0.5 inline-block">
                  {userIsAdmin ? 'Admin Account' : 'Creator Account'}
                </span>
              </div>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                MAIN MENU
              </div>
              <button
                onClick={() => setProfileActiveSubTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  profileActiveSubTab === 'overview'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-purple-400" />
                  <span>Overview</span>
                </div>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  profileActiveSubTab === 'projects'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Projects & Sessions</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {stats.totalProjects}
                </span>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('reviews')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  profileActiveSubTab === 'reviews'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>Client Feedback</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {notifications.length}
                </span>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-none transition-all cursor-pointer ${
                  profileActiveSubTab === 'analytics'
                    ? 'bg-purple-950/40 text-white border-l-2 border-purple-400'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Project Analytics</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {stats.approvalRate}%
                </span>
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-purple-950/40 bg-[#07050e] space-y-2">
              {userIsAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full py-1.5 px-3 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold rounded-none flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Console</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="w-full py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-none flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Profile Main Body */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-[#0a0a0f]">
            
            {/* Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#201140] via-[#160d2b] to-[#0c0a14] border border-purple-950/60 p-6 md:p-8 rounded-none shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-semibold uppercase">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Profile & Workspace Stats</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Welcome back, {userName}
                </h1>
                <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                  Review precision cuts, invite clients for real-time frame annotations, and track review approvals in one unified dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 z-10">
                <button 
                  onClick={handleCreateRoom}
                  className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs px-4 py-2.5 rounded-none shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black font-bold" />
                  <span>Create Session +</span>
                </button>
                <button 
                  onClick={() => setCurrentMode('workspace')}
                  className="bg-[#07050e] hover:bg-white/10 text-zinc-200 font-semibold text-xs px-4 py-2.5 rounded-none border border-purple-950/60 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Rooms Workspace</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0c0a14] border border-purple-950/50 p-5 rounded-none shadow-xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Projects</span>
                <span className="text-2xl font-black text-white font-mono mt-3">{stats.totalProjects}</span>
                <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-purple-950/40">{customFolders.length + 1} Folders</span>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 p-5 rounded-none shadow-xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client Feedback</span>
                <span className="text-2xl font-black text-white font-mono mt-3">{stats.totalFeedback}</span>
                <span className="text-[10px] text-purple-300 font-mono mt-2 pt-2 border-t border-purple-950/40">{stats.drawingsCount} Drawings</span>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 p-5 rounded-none shadow-xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Approval Rate</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-3">{stats.approvalRate}%</span>
                <span className="text-[10px] text-emerald-300 font-mono mt-2 pt-2 border-t border-purple-950/40">{stats.approvedRooms} Approved</span>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 p-5 rounded-none shadow-xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Versions</span>
                <span className="text-2xl font-black text-pink-300 font-mono mt-3">{stats.totalVersions}</span>
                <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-purple-950/40">{stats.totalProjects > 0 ? (stats.totalVersions / stats.totalProjects).toFixed(1) : '1.0'}x avg</span>
              </div>
            </div>

            {/* Analytics & Reviews Dual Column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#0c0a14] border border-purple-950/50 p-5 md:p-6 rounded-none shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Project Velocity & Reviews</span>
                </h2>
                <div className="h-48 flex items-end justify-between gap-3 pt-4">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <div 
                        className="w-4 bg-purple-500/80 hover:bg-purple-400 rounded-none transition-all"
                        style={{ height: `${Math.min(100, ((idx + 1) / 6) * 100)}%` }}
                      ></div>
                      <span className="text-[10px] font-mono text-zinc-500">{month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0c0a14] border border-purple-950/50 p-5 md:p-6 rounded-none shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Status Breakdown</span>
                </h2>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Approved</span>
                    <span className="font-mono text-emerald-400 font-bold">{stats.approvedRooms}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">In Progress</span>
                    <span className="font-mono text-amber-400 font-bold">{stats.inProgressRooms}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Needs Changes</span>
                    <span className="font-mono text-red-400 font-bold">{stats.rejectedRooms}</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : (

      /* ========================================================================= */
      /* VIEW B: EXACT CLASSIC WORKSPACE (Matching Screenshot 100%)                */
      /* ========================================================================= */
        <div className="relative z-10 flex-1 flex h-full w-full overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <div 
            style={{ width: `${sidebarWidth}px` }} 
            className={`bg-[#0c0a14] border-r border-purple-950/50 flex-shrink-0 flex flex-col justify-between select-none ${
              isSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden md:flex'
            }`}
          >
            <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* Top Item: Admin Console Pill Button (if admin) */}
              {userIsAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-purple-950/30 hover:bg-purple-900/30 border border-purple-500/30 text-purple-200 transition-colors cursor-pointer text-xs font-semibold group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-purple-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    </div>
                    <span>Admin Console</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">
                    ADMIN
                  </span>
                </button>
              )}

              {/* FOLDERS Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>FOLDERS</span>
                  <button onClick={handleCreateFolder} className="text-zinc-400 hover:text-white transition-colors" title="New Folder">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* All Rooms Button */}
                <button 
                  onClick={() => { setActiveFolder('All Rooms'); setActiveState(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeFolder === 'All Rooms' && !activeState 
                      ? 'bg-zinc-800/80 text-white shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Folder className="w-4 h-4 text-zinc-400" />
                  <span>All Rooms</span>
                </button>

                {/* Custom Folders */}
                {customFolders.map(f => (
                  <button
                    key={f}
                    onClick={() => { setActiveFolder(f); setActiveState(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      activeFolder === f && !activeState 
                        ? 'bg-zinc-800/80 text-white font-semibold shadow-sm' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-zinc-400" />
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>

              {/* STATE Section */}
              <div className="space-y-1.5">
                <div className="px-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  STATE
                </div>

                <button
                  onClick={() => setActiveState(activeState === 'Approved' ? null : 'Approved')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeState === 'Approved' 
                      ? 'bg-zinc-800/80 text-white font-semibold' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-zinc-400" />
                  <span>Approved</span>
                </button>

                <button
                  onClick={() => setActiveState(activeState === 'In Progress' ? null : 'In Progress')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeState === 'In Progress' 
                      ? 'bg-zinc-800/80 text-white font-semibold' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>In Progress</span>
                </button>

                <button
                  onClick={() => setActiveState(activeState === 'Rejected' ? null : 'Rejected')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    activeState === 'Rejected' 
                      ? 'bg-zinc-800/80 text-white font-semibold' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-zinc-400" />
                  <span>Rejected</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resizer Handle */}
          <div 
            onMouseDown={() => setIsResizing(true)}
            className="w-1 cursor-col-resize hover:bg-purple-500/50 transition-colors hidden md:block select-none"
          />

          {/* Center Main View */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            {/* Top Header Bar */}
            <header className="h-14 border-b border-purple-950/40 px-6 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <span>Feedplayer</span>
                <span>/</span>
                <span>All Assets</span>
                <span>/</span>
                <span className="text-white font-semibold flex items-center gap-1 cursor-pointer">
                  {activeFolder} <ChevronDown className="w-3 h-3 text-zinc-400" />
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div 
                  onClick={() => setCurrentMode('profile_dashboard')}
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400 text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm cursor-pointer"
                  title="Profile & Stats Dashboard"
                >
                  {userName.substring(0, 2)}
                </div>
              </div>
            </header>

            {/* Secondary Toolbar */}
            <div className="px-6 py-3 border-b border-purple-950/30 flex flex-wrap items-center justify-between gap-4 text-xs">
              
              {/* Left Toolbar Controls */}
              <div className="flex items-center gap-4 text-zinc-400 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input 
                    type="checkbox"
                    checked={selectedRooms.length === filteredRooms.length && filteredRooms.length > 0}
                    onChange={() => {
                      if (selectedRooms.length === filteredRooms.length) setSelectedRooms([]);
                      else setSelectedRooms(filteredRooms.map(r => r.id));
                    }}
                    className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0"
                  />
                  <span>Select All</span>
                </label>

                {/* Appearance Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
                    className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Appearance</span>
                  </button>
                  {showAppearanceMenu && (
                    <div className="absolute left-0 top-full mt-1 w-36 bg-[#0c0a14] border border-purple-950/60 rounded-lg shadow-xl z-50 py-1">
                      <button 
                        onClick={() => { setLayoutView('grid'); setShowAppearanceMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 ${layoutView === 'grid' ? 'text-white font-semibold' : 'text-zinc-400'}`}
                      >
                        <span>Grid View</span>
                        {layoutView === 'grid' && <Check className="w-3 h-3 text-purple-400" />}
                      </button>
                      <button 
                        onClick={() => { setLayoutView('list'); setShowAppearanceMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 ${layoutView === 'list' ? 'text-white font-semibold' : 'text-zinc-400'}`}
                      >
                        <span>List View</span>
                        {layoutView === 'list' && <Check className="w-3 h-3 text-purple-400" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Fields Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowFieldsMenu(!showFieldsMenu)}
                    className="flex items-center gap-1.5 hover:text-white cursor-pointer"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>Fields {visibleFieldsCount} Visible</span>
                  </button>
                  {showFieldsMenu && (
                    <div className="absolute left-0 top-full mt-1 w-40 bg-[#0c0a14] border border-purple-950/60 rounded-lg shadow-xl z-50 py-1">
                      {Object.keys(visibleFields).map(f => (
                        <button 
                          key={f}
                          onClick={() => setVisibleFields(prev => ({ ...prev, [f]: !prev[f] }))}
                          className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 text-zinc-300 capitalize"
                        >
                          <span>{f}</span>
                          {visibleFields[f] && <Check className="w-3 h-3 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    <span>{sortBy === 'date-desc' ? 'Newest' : sortBy === 'date-asc' ? 'Oldest' : sortBy === 'title-asc' ? 'Title (A-Z)' : 'Comments'}</span>
                  </button>
                  {showSortMenu && (
                    <div className="absolute left-0 top-full mt-1 w-36 bg-[#0c0a14] border border-purple-950/60 rounded-lg shadow-xl z-50 py-1">
                      {[
                        { id: 'date-desc', label: 'Newest' },
                        { id: 'date-asc', label: 'Oldest' },
                        { id: 'title-asc', label: 'Title (A-Z)' },
                        { id: 'comments-desc', label: 'Comments' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSortBy(s.id); setShowSortMenu(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 ${
                            sortBy === s.id ? 'text-white font-semibold' : 'text-zinc-400'
                          }`}
                        >
                          <span>{s.label}</span>
                          {sortBy === s.id && <Check className="w-3 h-3 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Toolbar Controls */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in Rooms"
                    className="bg-[#07050e] border border-purple-950/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 w-44 md:w-56"
                  />
                </div>

                <button 
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-950/60 bg-[#07050e] hover:bg-white/5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button 
                  onClick={handleCreateRoom}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-black font-bold" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Asset Counter Subtitle */}
            <div className="px-6 pt-3 text-[11px] text-zinc-500 font-mono">
              {filteredRooms.length} Assets · Realtime Sync Active
            </div>

            {/* Rooms Grid / List */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
                  <span className="text-xs font-medium text-zinc-400">Loading rooms...</span>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-20 bg-[#0c0a14] border border-purple-950/40 rounded-2xl p-8 space-y-4">
                  <Film className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-300">No rooms found</h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    {searchQuery ? `No rooms match "${searchQuery}".` : 'Create your first video review room.'}
                  </p>
                  <button onClick={handleCreateRoom} className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-lg">
                    Create Room +
                  </button>
                </div>
              ) : layoutView === 'grid' ? (
                
                /* Exact Classic Grid View from Git (db29474) */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {filteredRooms.map((room) => {
                    const thumb = getThumbnailUrl(room.video_url);
                    const fallback = getFallbackIcon(room.video_url);
                    const vObj = getActiveVersionObj(room.video_url);
                    const vData = parseVideoData(room.video_url);

                    return (
                      <div 
                        key={room.id}
                        onClick={() => navigate(`/room/${room.id}`)}
                        className={`bg-[#101014] border border-white/5 rounded-2xl hover:border-white/10 hover:bg-[#15151a] transition-all cursor-pointer group flex flex-col relative shadow-md aspect-video ${
                          menuOpenForRoom === room.id ? 'z-50' : 'z-0'
                        }`}
                      >
                        {/* Background Thumbnail or Icon */}
                        {thumb ? (
                          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                            <div 
                              className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                              style={{ backgroundImage: `url(${thumb})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/80 to-[#101014]/30"></div>
                          </div>
                        ) : fallback ? (
                          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500">
                            <img src={fallback} alt="" className="w-32 h-32 object-contain grayscale" />
                          </div>
                        ) : null}

                        <div className="relative z-10 flex flex-col h-full p-5">
                          {/* Top Row */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={(e) => toggleRoomSelection(e, room.id)}
                                className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                                  selectedRooms.includes(room.id) 
                                    ? 'bg-indigo-500 border-indigo-500 opacity-100' 
                                    : 'border-white/20 bg-black/20 group-hover:border-white/40 opacity-0 group-hover:opacity-100'
                                } ${selectedRooms.length > 0 ? 'opacity-100' : ''}`}
                              >
                                {selectedRooms.includes(room.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 relative">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {room.state || 'In Progress'}
                              </span>

                              <button 
                                onClick={(e) => { e.stopPropagation(); setMenuOpenForRoom(menuOpenForRoom === room.id ? null : room.id); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {menuOpenForRoom === room.id && (
                                <div className="absolute top-full right-0 mt-1 w-48 bg-[#1a1b23] border border-white/10 rounded-lg shadow-xl z-50 py-1" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setMenuOpenForRoom(null);
                                      const newTitle = window.prompt("Enter new room name:", room.title);
                                      if (!newTitle || !newTitle.trim() || newTitle === room.title) return;
                                      const { error } = await supabase.from('rooms').update({ title: newTitle }).eq('id', room.id);
                                      if (!error) {
                                        setRooms(rooms.map(r => r.id === room.id ? { ...r, title: newTitle } : r));
                                      } else {
                                        alert("Error renaming room: " + error.message);
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Rename Room
                                  </button>
                                  <div className="h-px bg-white/5 my-1" />
                                  <div className="px-4 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Move to Folder</div>
                                  {customFolders.map(f => (
                                    <button 
                                      key={f}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setMenuOpenForRoom(null);
                                        const { error } = await supabase.from('rooms').update({ folder: f }).eq('id', room.id);
                                        if (!error) {
                                          setRooms(rooms.map(r => r.id === room.id ? { ...r, folder: f } : r));
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                    >
                                      <Folder className="w-3.5 h-3.5" /> {f}
                                    </button>
                                  ))}
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setMenuOpenForRoom(null);
                                      const newFolder = window.prompt("Enter new folder name:");
                                      if (!newFolder || !newFolder.trim()) return;
                                      const folderName = newFolder.trim();
                                      if (!customFolders.includes(folderName)) {
                                        setCustomFolders([...customFolders, folderName]);
                                      }
                                      await supabase.from('rooms').update({ folder: folderName }).eq('id', room.id);
                                      setRooms(rooms.map(r => r.id === room.id ? { ...r, folder: folderName } : r));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Create New Folder
                                  </button>
                                  <div className="h-px bg-white/5 my-1" />
                                  <div className="px-4 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Set State</div>
                                  {['In Progress', 'Approved', 'Rejected'].map(st => (
                                    <button 
                                      key={st}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setMenuOpenForRoom(null);
                                        await supabase.from('rooms').update({ state: st }).eq('id', room.id);
                                        setRooms(rooms.map(r => r.id === room.id ? { ...r, state: st } : r));
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                    >
                                      {st === 'In Progress' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                                      {st === 'Approved' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                      {st === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                      {st}
                                    </button>
                                  ))}
                                  <div className="h-px bg-white/5 my-1" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenForRoom(null); handleDeleteRoom(e, room.id); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Room
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Room Title */}
                          <div className="mt-auto mb-4">
                            <h3 className="font-bold text-white tracking-wide truncate text-[17px]">
                              {room.title || 'Untitled Session'}
                            </h3>
                          </div>

                          {/* Bottom Row */}
                          <div className="pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-medium text-zinc-500">
                            {visibleFields.date && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{dayjs(room.created_at).fromNow()}</span>
                              </div>
                            )}
                            {visibleFields.users && (
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span>1</span>
                              </div>
                            )}
                            {visibleFields.comments && (
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{room.comments?.[0]?.count || 0}</span>
                              </div>
                            )}
                            <div className="ml-auto flex items-center gap-3">
                              {fallback ? (
                                <img src={fallback} alt="" className="w-4 h-4 object-contain opacity-80" />
                              ) : (
                                <Video className="w-4 h-4 text-zinc-500" />
                              )}
                              {visibleFields.version && (
                                <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-mono border border-indigo-500/20">
                                  {vObj?.title || `V${vData.currentVersion || 1}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                
                /* Classic List Table View */
                <div className="bg-[#101014] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-[#0c0a14] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 w-10"></th>
                        <th className="py-3.5 px-4">Session Title</th>
                        <th className="py-3.5 px-4">Folder</th>
                        <th className="py-3.5 px-4">Version</th>
                        <th className="py-3.5 px-4">State</th>
                        <th className="py-3.5 px-4">Comments</th>
                        <th className="py-3.5 px-4">Created</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRooms.map((room) => {
                        const vObj = getActiveVersionObj(room.video_url);
                        const vData = parseVideoData(room.video_url);
                        return (
                          <tr 
                            key={room.id}
                            onClick={() => navigate(`/room/${room.id}`)}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                              <div 
                                onClick={(e) => toggleRoomSelection(e, room.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  selectedRooms.includes(room.id) ? 'bg-indigo-600 border-indigo-500' : 'border-zinc-700 bg-zinc-900'
                                }`}
                              >
                                {selectedRooms.includes(room.id) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white group-hover:text-purple-300">
                              {room.title || 'Untitled Session'}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">{room.folder || 'Default'}</td>
                            <td className="py-3.5 px-4">
                              <span className="bg-white/5 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-mono text-[10px]">
                                {vObj?.title || `V${vData.currentVersion || 1}`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {room.state || 'In Progress'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300 font-mono">{room.comments?.[0]?.count || 0}</td>
                            <td className="py-3.5 px-4 text-zinc-500 font-mono">{dayjs(room.created_at).format('MMM D, YYYY')}</td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => handleDeleteRoom(e, room.id)} className="p-1 text-zinc-500 hover:text-red-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </main>
          </div>

          {/* Right Floating Quick Action Sidebar */}
          <div className="hidden md:flex w-14 flex-shrink-0 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl flex-col items-center py-4 mr-4 mb-6 z-20 shadow-xl h-[calc(100%-1rem)]">
            
            {/* Top Avatar: Click opens the Profile Dashboard Command Center! */}
            <button 
              onClick={() => setCurrentMode('profile_dashboard')}
              className="p-0.5 rounded-md hover:ring-2 hover:ring-purple-400 transition-all mb-8 group relative cursor-pointer"
              title="Click to open Profile Overview & Analytics"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-md object-cover shadow-sm border border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 bg-white text-black rounded-md flex items-center justify-center font-bold text-sm uppercase">
                  {userName.substring(0, 2)}
                </div>
              )}
              <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Profile & Analytics
              </span>
            </button>

            {/* Quick Nav Icons */}
            <div className="flex flex-col gap-6 w-full items-center flex-1 relative">
              <button 
                onClick={() => { setActiveFolder('All Rooms'); setActiveState(null); setSearchQuery(''); }} 
                className="p-2 text-zinc-500 hover:text-white transition-colors group relative"
                title="Home"
              >
                <Home className="w-5 h-5" />
                <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Home</span>
              </button>

              <button 
                onClick={() => document.getElementById('search-input')?.focus()} 
                className="p-2 text-zinc-500 hover:text-white transition-colors group relative"
                title="Search"
              >
                <Search className="w-5 h-5" />
                <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Search</span>
              </button>

              <button 
                onClick={handleManualRefresh} 
                disabled={refreshing} 
                className={`p-2 transition-colors group relative ${refreshing ? 'text-indigo-400' : 'text-zinc-500 hover:text-white'}`} 
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Refresh</span>
              </button>

              {/* Notifications */}
              <div className="relative flex justify-center">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={`p-2 transition-colors relative ${showNotifications ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                  title="Client Feedback"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-[#1a1b23]"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute top-0 right-full mr-4 w-80 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <h4 className="text-white font-semibold text-xs flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-indigo-400" /> Client Messages
                      </h4>
                      <button 
                        onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                        className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
                      >
                        View All ({notifications.length})
                      </button>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="text-xs text-zinc-400 text-center py-6">No new client messages.</div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => {
                              setShowNotifications(false);
                              if (notif.room_id) navigate(`/room/${notif.room_id}`);
                            }}
                            className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer border border-white/5 hover:border-indigo-500/30 group text-left space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                                {notif.author_name || 'Client'}
                              </span>
                              <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                {dayjs(notif.created_at).fromNow()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">
                              {notif.plainText ? `"${notif.plainText}"` : (notif.hasDrawing ? '🎨 Visual Drawing' : notif.previewText)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-6 w-full items-center mt-auto">
              {userIsAdmin && (
                <button 
                  onClick={() => navigate('/admin')} 
                  className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 rounded-lg transition-colors relative group"
                  title="Admin Console"
                >
                  <Shield className="w-5 h-5" />
                  <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Admin Console</span>
                </button>
              )}
              <button 
                onClick={() => navigate('/help')} 
                className="p-2 text-zinc-500 hover:text-white transition-colors relative group"
                title="Features & Help"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">Features & Help</span>
              </button>
              <button 
                onClick={handleLogout} 
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors relative group" 
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
                <span className="absolute left-full ml-4 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-red-500/20">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
