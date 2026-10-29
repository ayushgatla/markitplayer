import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Video, Clock, Users, ArrowRight, LogOut, Trash2, Home, 
  Search, Bell, Settings, HelpCircle, Folder, LayoutGrid, MonitorPlay, 
  Image as ImageIcon, Music, CheckCircle, ListFilter, MessageSquare, 
  ChevronDown, Check, XCircle, MoreVertical, Edit2, Menu, X, Shield, 
  Pencil, RefreshCw, BarChart3, TrendingUp, Sparkles, Film, ArrowUpRight, 
  Layers, ExternalLink, Activity, Filter, ChevronRight, User as UserIcon,
  ArrowLeft, Copy, CheckCheck, Play, Share2, ChevronUp, MessageCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getActiveVideoUrl, parseVideoData, getActiveVersionObj } from '../utils/versionHelper';
import { parseComment } from '../utils/commentHelper';
import { getCachedUserProfiles } from '../utils/userRegistry';
import {
  isAdmin,
  getAdminEmails,
  syncAdminEmailsWithDatabase,
  normalizeEmail
} from '../utils/adminHelper';
import {
  Icons8Home,
  Icons8Layers,
  Icons8Comments,
  Icons8Analytics,
  Icons8Shield,
  Icons8LogOut,
  Icons8ArrowLeft,
  Icons8Sparkles,
  Icons8Plus,
  Icons8Grid,
  Icons8CheckCircle,
  Icons8Film,
  Icons8ArrowUpRight,
  Icons8Clock
} from '../components/Icons8';

dayjs.extend(relativeTime);

const getThumbnailUrl = (rawUrl) => {
  if (!rawUrl) return null;
  const url = getActiveVideoUrl(rawUrl);
  if (!url || typeof url !== 'string') return null;
  
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
  if (!rawUrl) return null;
  const url = getActiveVideoUrl(rawUrl);
  if (!url || typeof url !== 'string') return null;
  if (url.includes('instagram.com')) return '/instagram.png';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '/youtube.png';
  if (url.includes('drive.google.com')) return '/drive.png';
  return null;
};

const TableThumbnail = ({ rawVideoUrl }) => {
  const [imgError, setImgError] = useState(false);
  const thumb = !imgError ? getThumbnailUrl(rawVideoUrl) : null;
  const fallback = getFallbackIcon(rawVideoUrl);
  const activeUrl = typeof rawVideoUrl === 'string' ? getActiveVideoUrl(rawVideoUrl) : '';
  const isDirect = typeof activeUrl === 'string' && (
    /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(activeUrl) || 
    activeUrl.includes('/storage/v1/object/public/') ||
    activeUrl.includes('.blob.core.windows.net') ||
    activeUrl.includes('.workers.dev')
  );

  return (
    <div className="w-14 h-9 rounded-md bg-[#121217] border border-white/10 group-hover:border-purple-500/30 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm transition-colors">
      {thumb ? (
        <img 
          src={thumb} 
          alt="" 
          className="w-full h-full object-cover" 
          onError={() => setImgError(true)} 
        />
      ) : isDirect ? (
        <video 
          src={`${activeUrl}#t=0.001`} 
          className="w-full h-full object-cover pointer-events-none" 
          preload="metadata" 
          muted 
          playsInline
        />
      ) : fallback ? (
        <img src={fallback} alt="" className="w-4 h-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
      ) : (
        <Film className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      )}
    </div>
  );
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

  // Projects & Sessions tab state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all'); // 'all' | 'Approved' | 'In Progress' | 'Rejected'
  const [projectFolderFilter, setProjectFolderFilter] = useState('all'); // 'all' | folder name
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  // Client Feedback tab state
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all'); // 'all' | 'drawings' | 'comments' | 'images' | 'chat'
  const [expandedClients, setExpandedClients] = useState({}); // client name -> boolean (collapsed by default)

  const toggleClientExpand = (clientName) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  const [adminEmails, setAdminEmails] = useState(getAdminEmails());
  const [customFolders, setCustomFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('feedplayer_folders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['Marketing Assets', 'Internal Reviews'];
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

    const handleLocalAdminUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAdminEmails(e.detail);
      }
    };
    window.addEventListener('markit_admin_update', handleLocalAdminUpdate);

    const channel = supabase
      .channel('admin_privileges_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, async (payload) => {
        if (payload?.new?.folder === '__system_admin_config__' || payload?.old?.folder === '__system_admin_config__') {
          const updated = await syncAdminEmailsWithDatabase();
          if (updated) setAdminEmails(updated);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('markit_admin_update', handleLocalAdminUpdate);
      supabase.removeChannel(channel);
    };
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

    const roomLookup = {};
    userRooms.forEach(r => { roomLookup[r.id] = r; });

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data) {
        const formatted = data.map(c => {
          const roomObj = roomLookup[c.room_id];
          return {
            ...parseComment(c),
            roomTitle: roomObj?.title || 'Untitled Session',
            room: roomObj || null
          };
        });
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
        const realRooms = (data || []).filter(
          r => (!r.folder || !r.folder.startsWith('__system_')) && (!r.title || !r.title.startsWith('Profile:'))
        );
        setRooms(realRooms);
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

  const handleCopyClientLink = (e, roomId) => {
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}/client`;
    navigator.clipboard.writeText(url);
    setCopiedRoomId(roomId);
    setTimeout(() => {
      setCopiedRoomId(null);
    }, 2000);
  };

  // Filtered rooms for Projects & Sessions tab in profile dashboard
  const filteredProjectRooms = useMemo(() => {
    return rooms
      .filter(room => {
        if (room.folder && room.folder.startsWith('__system_')) return false;
        if (room.title && room.title.startsWith('Profile:')) return false;
        
        if (projectStatusFilter !== 'all') {
          if ((room.state || 'In Progress') !== projectStatusFilter) return false;
        }
        if (projectFolderFilter !== 'all') {
          if ((room.folder || 'Default') !== projectFolderFilter) return false;
        }
        if (projectSearchQuery.trim()) {
          const q = projectSearchQuery.toLowerCase();
          const matchTitle = (room.title || '').toLowerCase().includes(q);
          const matchFolder = (room.folder || '').toLowerCase().includes(q);
          const matchId = (room.id || '').toLowerCase().includes(q);
          return matchTitle || matchFolder || matchId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [rooms, projectStatusFilter, projectFolderFilter, projectSearchQuery]);

  // Cached user profiles lookup map for avatar resolution
  const cachedUsersMap = useMemo(() => {
    try {
      const list = getCachedUserProfiles();
      const map = new Map();
      (list || []).forEach(p => {
        if (p?.id) map.set(p.id, p);
        if (p?.name) map.set(p.name.toLowerCase(), p);
        if (p?.email) map.set(p.email.toLowerCase(), p);
      });
      return map;
    } catch {
      return new Map();
    }
  }, []);

  // Grouped feedback by client and room for Client Feedback tab
  const clientGroups = useMemo(() => {
    const map = {};

    const filteredComments = notifications.filter(c => {
      if (feedbackTypeFilter === 'drawings' && !c.hasDrawing) return false;
      if (feedbackTypeFilter === 'images' && !c.hasImage) return false;
      if (feedbackTypeFilter === 'comments' && c.isChat) return false;
      if (feedbackTypeFilter === 'chat' && !c.isChat) return false;

      if (feedbackSearchQuery.trim()) {
        const q = feedbackSearchQuery.toLowerCase();
        const authorMatch = (c.author_name || '').toLowerCase().includes(q);
        const roomMatch = (c.roomTitle || '').toLowerCase().includes(q);
        const textMatch = (c.plainText || c.cleanText || c.comment_text || '').toLowerCase().includes(q);
        return authorMatch || roomMatch || textMatch;
      }
      return true;
    });

    filteredComments.forEach(comment => {
      const rawName = (comment.author_name || '').trim() || 'Client';
      const clientKey = rawName.toLowerCase();

      // Resolve profile avatar from comment, current user match, or user registry
      let commentAvatar = comment.author_avatar || comment.avatar_url || comment.user_avatar || null;
      if (!commentAvatar) {
        if (user && (user.id === comment.user_id || rawName.toLowerCase() === userName.toLowerCase() || (userEmail && rawName.toLowerCase() === userEmail.split('@')[0].toLowerCase()))) {
          commentAvatar = avatarUrl;
        } else {
          const matchedProfile = (comment.user_id && cachedUsersMap.get(comment.user_id)) || cachedUsersMap.get(clientKey);
          if (matchedProfile?.avatar_url) {
            commentAvatar = matchedProfile.avatar_url;
          }
        }
      }

      if (!map[clientKey]) {
        const initials = rawName
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'CL';

        map[clientKey] = {
          name: rawName,
          initials,
          avatarUrl: commentAvatar,
          totalComments: 0,
          roomsMap: {},
          latestCommentDate: comment.created_at
        };
      } else {
        if (!map[clientKey].avatarUrl && commentAvatar) {
          map[clientKey].avatarUrl = commentAvatar;
        }
      }

      const client = map[clientKey];
      client.totalComments += 1;
      if (new Date(comment.created_at) > new Date(client.latestCommentDate)) {
        client.latestCommentDate = comment.created_at;
      }

      const roomId = comment.room_id || 'unknown';
      if (!client.roomsMap[roomId]) {
        const roomObj = comment.room || rooms.find(r => r.id === roomId);
        client.roomsMap[roomId] = {
          roomId,
          title: roomObj?.title || comment.roomTitle || 'Untitled Session',
          video_url: roomObj?.video_url,
          state: roomObj?.state || 'In Progress',
          folder: roomObj?.folder || 'Default',
          created_at: roomObj?.created_at,
          comments: []
        };
      }

      client.roomsMap[roomId].comments.push(comment);
    });

    return Object.values(map)
      .map(client => ({
        ...client,
        roomList: Object.values(client.roomsMap).map(r => ({
          ...r,
          comments: r.comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        }))
      }))
      .sort((a, b) => new Date(b.latestCommentDate) - new Date(a.latestCommentDate));
  }, [notifications, rooms, feedbackTypeFilter, feedbackSearchQuery, user, userName, userEmail, avatarUrl, cachedUsersMap]);

  // Filtered rooms for standard workspace
  const filteredRooms = useMemo(() => {
    return rooms
      .filter(room => {
        if (room.folder && room.folder.startsWith('__system_')) return false;
        if (room.title && room.title.startsWith('Profile:')) return false;
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
          <aside className="w-full md:w-64 bg-[#0e0e11] border-r border-white/[0.08] flex flex-col shrink-0 shadow-xl">
            <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between">
              <button 
                onClick={() => setCurrentMode('workspace')}
                className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#141417] hover:bg-[#1c1c21] px-2.5 py-1.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
              >
                <Icons8ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Rooms</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-4 border-b border-white/[0.08] bg-[#111114] flex items-center gap-3">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-sm">
                  {userName.substring(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-xs text-white truncate">{userName}</h3>
                <p className="text-[10px] text-zinc-400 font-mono truncate">{userEmail}</p>
                <span className="text-[9px] font-mono text-purple-400 font-medium uppercase tracking-wider mt-0.5 inline-block">
                  {userIsAdmin ? 'Admin Account' : 'Creator Account'}
                </span>
              </div>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                MAIN MENU
              </div>
              <button
                onClick={() => setProfileActiveSubTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  profileActiveSubTab === 'overview'
                    ? 'bg-purple-500/10 text-white border-l-2 border-purple-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons8Home className="w-4 h-4 text-purple-400" />
                  <span>Overview</span>
                </div>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  profileActiveSubTab === 'projects'
                    ? 'bg-purple-500/10 text-white border-l-2 border-purple-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons8Layers className="w-4 h-4 text-purple-400" />
                  <span>Projects & Sessions</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300">
                  {stats.totalProjects}
                </span>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('reviews')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  profileActiveSubTab === 'reviews'
                    ? 'bg-purple-500/10 text-white border-l-2 border-purple-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons8Comments className="w-4 h-4 text-purple-400" />
                  <span>Client Feedback</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300">
                  {notifications.length}
                </span>
              </button>

              <button
                onClick={() => setProfileActiveSubTab('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  profileActiveSubTab === 'analytics'
                    ? 'bg-purple-500/10 text-white border-l-2 border-purple-500'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons8Analytics className="w-4 h-4 text-purple-400" />
                  <span>Project Analytics</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {stats.approvalRate}%
                </span>
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-white/[0.08] bg-[#111114] space-y-2">
              {userIsAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full py-1.5 px-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 hover:text-white text-xs font-medium rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Icons8Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Admin Console</span>
                  </div>
                  <Icons8ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="w-full py-1.5 px-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Icons8LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Profile Main Body */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-[#0a0a0f]">
            
            {/* ============================================================= */}
            {/* SUB-TAB 1: OVERVIEW                                           */}
            {/* ============================================================= */}
            {profileActiveSubTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-[#0e0e11] border border-white/[0.08] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono font-medium uppercase">
                      <Icons8Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Profile & Workspace Stats</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      Welcome back, {userName}
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      Review precision cuts, invite clients for real-time frame annotations, and track review approvals in one unified dashboard.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 z-10">
                    <button 
                      onClick={handleCreateRoom}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Icons8Plus className="w-4 h-4 text-zinc-950 font-bold" />
                      <span>Create Session +</span>
                    </button>
                    <button 
                      onClick={() => setCurrentMode('workspace')}
                      className="bg-[#141417] hover:bg-[#1c1c21] text-zinc-200 font-medium text-xs px-4 py-2.5 rounded-lg border border-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Icons8Grid className="w-3.5 h-3.5 text-purple-400" />
                      <span>Open Rooms Workspace</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div 
                    onClick={() => setProfileActiveSubTab('projects')}
                    className="bg-[#0e0e11] hover:bg-[#141417] border border-white/[0.08] hover:border-white/[0.16] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-purple-300">Total Projects</span>
                      <Icons8Layers className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-white font-mono mt-3">{stats.totalProjects}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-white/[0.06]">{customFolders.length + 1} Folders</span>
                  </div>

                  <div 
                    onClick={() => setProfileActiveSubTab('reviews')}
                    className="bg-[#0e0e11] hover:bg-[#141417] border border-white/[0.08] hover:border-white/[0.16] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-purple-300">Client Feedback</span>
                      <Icons8Comments className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-white font-mono mt-3">{stats.totalFeedback}</span>
                    <span className="text-[10px] text-purple-300 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.drawingsCount} Drawings</span>
                  </div>

                  <div 
                    onClick={() => setProfileActiveSubTab('analytics')}
                    className="bg-[#0e0e11] hover:bg-[#141417] border border-white/[0.08] hover:border-white/[0.16] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-purple-300">Approval Rate</span>
                      <Icons8CheckCircle className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-purple-400 font-mono mt-3">{stats.approvalRate}%</span>
                    <span className="text-[10px] text-purple-300 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.approvedRooms} Approved</span>
                  </div>

                  <div 
                    onClick={() => setProfileActiveSubTab('projects')}
                    className="bg-[#0e0e11] hover:bg-[#141417] border border-white/[0.08] hover:border-white/[0.16] p-5 rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-purple-300">Total Versions</span>
                      <Icons8Film className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-purple-300 font-mono mt-3">{stats.totalVersions}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.totalProjects > 0 ? (stats.totalVersions / stats.totalProjects).toFixed(1) : '1.0'}x avg</span>
                  </div>
                </div>

                {/* Analytics & Reviews Dual Column */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#0e0e11] border border-white/[0.08] p-5 md:p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Icons8Analytics className="w-4 h-4 text-purple-400" />
                      <span>Project Velocity & Reviews</span>
                    </h2>
                    <div className="h-48 flex items-end justify-between gap-3 pt-4">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div 
                            className="w-4 bg-purple-500/80 hover:bg-purple-400 rounded-sm transition-all"
                            style={{ height: `${Math.min(100, ((idx + 1) / 6) * 100)}%` }}
                          ></div>
                          <span className="text-[10px] font-mono text-zinc-500">{month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 md:p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Icons8CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>Status Breakdown</span>
                    </h2>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Approved</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.approvedRooms}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">In Progress</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.inProgressRooms}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Needs Changes</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.rejectedRooms}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts to Projects & Feedback */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Review Sessions Preview */}
                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-purple-400" />
                        <span>Recent Review Sessions</span>
                      </h3>
                      <button
                        onClick={() => setProfileActiveSubTab('projects')}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All ({rooms.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {rooms.slice(0, 3).map((room) => {
                        const thumb = getThumbnailUrl(room.video_url);
                        return (
                          <div
                            key={room.id}
                            onClick={() => navigate(`/room/${room.id}`)}
                            className="p-2.5 rounded-lg bg-[#141417] hover:bg-[#1c1c21] border border-white/[0.06] hover:border-white/[0.14] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-14 h-9 rounded overflow-hidden bg-black/60 border border-white/[0.08] shrink-0 flex items-center justify-center">
                                {thumb ? (
                                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Film className="w-4 h-4 text-purple-400/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-xs text-white group-hover:text-purple-300 truncate">
                                  {room.title || 'Untitled Session'}
                                </h4>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {room.folder || 'Default'} · {dayjs(room.created_at).fromNow()}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-md border font-medium shrink-0 font-mono ${
                              (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              (room.state || 'In Progress') === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }`}>
                              {room.state || 'In Progress'}
                            </span>
                          </div>
                        );
                      })}
                      {rooms.length === 0 && (
                        <p className="text-xs text-zinc-500 py-3 text-center">No review sessions yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Client Feedback Stream */}
                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        <span>Recent Client Notes</span>
                      </h3>
                      <button
                        onClick={() => setProfileActiveSubTab('reviews')}
                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Client Boxes ({clientGroups.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {notifications.slice(0, 3).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => notif.room_id && navigate(`/room/${notif.room_id}`)}
                          className="p-2.5 rounded-lg bg-[#141417] hover:bg-[#1c1c21] border border-white/[0.06] hover:border-white/[0.14] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white group-hover:text-purple-300 truncate">
                                {notif.author_name || 'Client'}
                              </span>
                              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                                {notif.formattedTime}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 truncate mt-0.5">
                              {notif.plainText || notif.previewText}
                            </p>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                            {dayjs(notif.created_at).fromNow()}
                          </span>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <p className="text-xs text-zinc-500 py-3 text-center">No client feedback yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 2: PROJECTS & SESSIONS (LIST VIEW WITH PREVIEW PICTURE)*/}
            {/* ============================================================= */}
            {profileActiveSubTab === 'projects' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-[#0e0e11] border border-white/[0.08] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono font-medium uppercase">
                      <Layers className="w-3 h-3 text-purple-400" />
                      <span>Projects & Sessions</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      Review Sessions ({filteredProjectRooms.length})
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      All your video review rooms displayed in a structured list with real-time preview, version control, and client interaction details.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 z-10">
                    <button 
                      onClick={handleCreateRoom}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-zinc-950 font-bold" />
                      <span>Create Session +</span>
                    </button>
                    <button 
                      onClick={() => setCurrentMode('workspace')}
                      className="bg-[#141417] hover:bg-[#1c1c21] text-zinc-200 font-medium text-xs px-4 py-2.5 rounded-lg border border-white/[0.08] flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                      <span>Open Workspace</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-[#0e0e11] border border-white/[0.08] p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Search rooms by title, folder, ID..."
                      className="w-full bg-[#141417] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status filter tabs */}
                    <div className="flex items-center gap-1 bg-[#141417] p-1 rounded-lg border border-white/[0.06]">
                      {[
                        { id: 'all', label: `All (${rooms.length})` },
                        { id: 'In Progress', label: `In Progress (${stats.inProgressRooms})` },
                        { id: 'Approved', label: `Approved (${stats.approvedRooms})` },
                        { id: 'Rejected', label: `Needs Changes (${stats.rejectedRooms})` }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setProjectStatusFilter(tab.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                            projectStatusFilter === tab.id
                              ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Folder dropdown */}
                    <select
                      value={projectFolderFilter}
                      onChange={(e) => setProjectFolderFilter(e.target.value)}
                      className="bg-[#141417] border border-white/[0.08] text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500/60 cursor-pointer"
                    >
                      <option value="all">All Folders</option>
                      <option value="Default">Default</option>
                      {customFolders.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* THE ROOMS LIST MANNER WITH PREVIEW PICTURE AT START */}
                <div className="space-y-3">
                  {filteredProjectRooms.map((room) => {
                    const thumb = getThumbnailUrl(room.video_url);
                    const fallback = getFallbackIcon(room.video_url);
                    const vObj = getActiveVersionObj(room.video_url);
                    const vData = parseVideoData(room.video_url);
                    const commentsCount = room.comments?.[0]?.count || 0;

                    return (
                      <div 
                        key={room.id}
                        onClick={() => navigate(`/room/${room.id}`)}
                        className="bg-[#0e0e11] hover:bg-[#131317] border border-white/[0.08] hover:border-white/[0.16] p-4 transition-all duration-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group shadow-sm"
                      >
                        {/* Left Section: Preview Picture at Start + Essential Details */}
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          
                          {/* 1. Preview Picture at Start */}
                          <div className="w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 rounded-lg overflow-hidden bg-black/60 border border-white/[0.08] shrink-0 relative group/thumb flex items-center justify-center">
                            {thumb ? (
                              <img 
                                src={thumb} 
                                alt={room.title}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full bg-[#141417] flex flex-col items-center justify-center text-zinc-500 gap-1.5 p-2 text-center">
                                {fallback ? (
                                  <img src={fallback} alt="" className="w-6 h-6 object-contain opacity-70" />
                                ) : (
                                  <Film className="w-6 h-6" />
                                )}
                                <span className="text-[10px] font-mono text-zinc-500 truncate max-w-full">
                                  {room.folder || 'Video Room'}
                                </span>
                              </div>
                            )}

                            {/* Hover Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 ml-0.5 fill-white" />
                              </div>
                            </div>

                            {/* Version Badge on Thumbnail */}
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-zinc-300 border border-white/10">
                              {vObj?.title || `V${vData.currentVersion || 1}`}
                            </span>
                          </div>

                          {/* 2. Essential Details */}
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base text-white group-hover:text-purple-300 transition-colors truncate">
                                {room.title || 'Untitled Session'}
                              </h3>
                            </div>

                            {/* Badges Row */}
                            <div className="flex items-center gap-2.5 flex-wrap text-xs">
                              {/* Folder Badge */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                                <Folder className="w-3 h-3 text-purple-400" />
                                <span>{room.folder || 'Default'}</span>
                              </span>

                              {/* Version Title Badge */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                                <Layers className="w-3 h-3 text-purple-400" />
                                <span>{vObj?.title || `Version ${vData.currentVersion || 1}`}</span>
                              </span>

                              {/* State / Review Status Badge */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border font-mono ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                              }`}>
                                {(room.state || 'In Progress') === 'Approved' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                                {(room.state || 'In Progress') === 'Rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
                                {(room.state || 'In Progress') === 'In Progress' && <Clock className="w-3 h-3 text-zinc-400" />}
                                <span>{room.state || 'In Progress'}</span>
                              </span>

                              {/* Client Comments Badge */}
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                                <MessageSquare className="w-3 h-3 text-purple-400" />
                                <span>{commentsCount} comments</span>
                              </span>

                              {/* Date Created */}
                              <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-600" />
                                <span>{dayjs(room.created_at).format('MMM D, YYYY')}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Section: Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/room/${room.id}`)}
                            className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Open Room</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleCopyClientLink(e, room.id)}
                            className="px-3 py-1.5 bg-[#141417] hover:bg-[#1c1c21] text-zinc-300 hover:text-white border border-white/[0.08] text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Copy Client Review Link"
                          >
                            {copiedRoomId === room.id ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-purple-400 font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Client Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleDeleteRoom(e, room.id)}
                            className="p-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredProjectRooms.length === 0 && (
                    <div className="text-center py-16 bg-[#0e0e11] border border-white/[0.08] rounded-2xl p-8 space-y-4">
                      <Film className="w-10 h-10 text-zinc-600 mx-auto" />
                      <h3 className="text-sm font-semibold text-zinc-200">No review rooms found</h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        {projectSearchQuery ? `No rooms match "${projectSearchQuery}".` : 'No rooms match your filter. Create your first session!'}
                      </p>
                      <button
                        onClick={handleCreateRoom}
                        className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                      >
                        Create Session +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 3: CLIENT FEEDBACK (BOXES PER CLIENT & ROOM BOXES)    */}
            {/* ============================================================= */}
            {profileActiveSubTab === 'reviews' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-[#0e0e11] border border-white/[0.08] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono font-medium uppercase">
                      <MessageSquare className="w-3 h-3 text-purple-400" />
                      <span>Client Feedback Hub</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      Client Feedback & Review Threads
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      All feedback neatly organized into separate client boxes, each displaying room cards with all comments left by that client.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 z-10 font-mono text-xs">
                    <div className="px-3 py-2 rounded-lg bg-[#141417] border border-white/[0.08] text-zinc-300">
                      <span className="font-bold text-white text-sm">{clientGroups.length}</span> Clients
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-[#141417] border border-white/[0.08] text-purple-300">
                      <span className="font-bold text-white text-sm">{notifications.length}</span> Comments
                    </div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-[#0e0e11] border border-white/[0.08] p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text"
                      value={feedbackSearchQuery}
                      onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                      placeholder="Search client name, room title, or comment text..."
                      className="w-full bg-[#141417] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                    />
                  </div>

                  {/* Type Filter Tabs (No Emojis, Clean Lucide Icons) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: `All (${notifications.length})`, icon: ListFilter },
                      { id: 'drawings', label: `Drawings (${stats.drawingsCount})`, icon: Pencil },
                      { id: 'comments', label: 'Notes', icon: MessageSquare },
                      { id: 'images', label: 'Images', icon: ImageIcon },
                      { id: 'chat', label: 'Chat', icon: MessageCircle }
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = feedbackTypeFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setFeedbackTypeFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                              : 'bg-[#141417] border border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-950' : 'text-purple-400'}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}

                    {/* Expand All / Collapse All Toggle Button */}
                    {clientGroups.length > 0 && (
                      <button
                        onClick={() => {
                          const allExpanded = clientGroups.every(c => expandedClients[c.name]);
                          const updated = {};
                          if (!allExpanded) {
                            clientGroups.forEach(c => { updated[c.name] = true; });
                          }
                          setExpandedClients(updated);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#141417] border border-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                        title="Toggle all client cards"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 text-purple-400 transition-transform ${clientGroups.every(c => expandedClients[c.name]) ? 'rotate-180 text-white' : ''}`} />
                        <span>{clientGroups.every(c => expandedClients[c.name]) ? 'Collapse All' : 'Expand All'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* DIFFERENT BOXES FOR EACH CLIENT (COLLAPSED BY DEFAULT WITH DOWN ARROW EXPAND OPTION) */}
                <div className="space-y-4">
                  {clientGroups.map((client) => {
                    const isExpanded = !!expandedClients[client.name];

                    return (
                      <div 
                        key={client.name}
                        className="bg-[#0e0e11] border border-white/[0.08] hover:border-white/[0.16] rounded-xl shadow-sm transition-all overflow-hidden"
                      >
                        {/* Client Box Header (Click to expand / collapse) */}
                        <div 
                          onClick={() => toggleClientExpand(client.name)}
                          className="flex items-center justify-between gap-4 p-5 md:p-6 cursor-pointer select-none group hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Circular Client Avatar */}
                            {client.avatarUrl ? (
                              <img
                                src={client.avatarUrl}
                                alt={client.name}
                                className="w-11 h-11 rounded-full object-cover border border-white/10 shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-zinc-800 text-zinc-300 font-bold text-sm flex items-center justify-center border border-zinc-700 shadow-sm shrink-0">
                                {client.initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-base text-white group-hover:text-purple-300 transition-colors truncate">
                                  {client.name}
                                </h2>
                                <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md font-medium">
                                  Client
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                                {client.totalComments} {client.totalComments === 1 ? 'comment' : 'comments'} across {client.roomList.length} {client.roomList.length === 1 ? 'room' : 'rooms'} · Last active {dayjs(client.latestCommentDate).fromNow()}
                              </p>
                            </div>
                          </div>

                          {/* Right Controls: Notes pill + Down Arrow expand option */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg font-medium">
                              {client.totalComments} Notes
                            </span>

                            {/* Down Arrow Expand Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleClientExpand(client.name);
                              }}
                              className="p-1.5 rounded-lg bg-[#141417] hover:bg-[#1c1c21] border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                              title={isExpanded ? "Collapse client review rooms" : "Expand client review rooms"}
                              aria-expanded={isExpanded}
                            >
                              <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline px-1">
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </span>
                              <ChevronDown 
                                className={`w-4 h-4 text-purple-400 group-hover:text-white transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-white' : ''
                                }`} 
                              />
                            </button>
                          </div>
                        </div>

                        {/* SEPARATE ROOM BOXES IN THIS CLIENT BOX (SHOWN ONLY WHEN EXPANDED) */}
                        {isExpanded && (
                          <div className="p-5 md:p-6 pt-0 space-y-4 border-t border-white/[0.06] animate-in fade-in duration-200">
                            <div className="pt-4 grid grid-cols-1 gap-4">
                              {client.roomList.map((room) => {
                                const thumb = getThumbnailUrl(room.video_url);

                                return (
                                  <div 
                                    key={room.roomId}
                                    className="bg-[#141417] border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-4 space-y-4 transition-colors"
                                  >
                                    {/* Room Box Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Room Preview Thumbnail */}
                                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/60 border border-white/[0.08] shrink-0 flex items-center justify-center">
                                          {thumb ? (
                                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <Film className="w-4 h-4 text-purple-400/60" />
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <h4 
                                              onClick={() => navigate(`/room/${room.roomId}`)}
                                              className="font-semibold text-xs sm:text-sm text-white hover:text-purple-300 transition-colors truncate cursor-pointer"
                                            >
                                              {room.title}
                                            </h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium font-mono ${
                                              room.state === 'Approved' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                              room.state === 'Rejected' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                              'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                              {room.state}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-zinc-400 font-mono">
                                            Folder: {room.folder || 'Default'} · {room.comments.length} {room.comments.length === 1 ? 'comment' : 'comments'}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => navigate(`/room/${room.roomId}`)}
                                        className="self-end sm:self-center px-3 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                                      >
                                        <span>Open Room</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Messages Commented By Him In This Room */}
                                    <div className="space-y-2.5">
                                      {room.comments.map((comment) => (
                                        <div 
                                          key={comment.id}
                                          onClick={() => navigate(`/room/${room.roomId}`)}
                                          className="p-3 rounded-lg bg-[#0e0e11] hover:bg-[#111114] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer space-y-2 group"
                                        >
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Video Timestamp Badge */}
                                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-mono text-[11px] font-medium border border-purple-500/20 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-purple-400" />
                                                <span>{comment.formattedTime}</span>
                                              </span>

                                              {comment.version && (
                                                <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
                                                  V{comment.version}
                                                </span>
                                              )}

                                              {comment.hasDrawing && (
                                                <span className="px-1.5 py-0.5 bg-white/10 text-white border border-white/20 text-[10px] rounded-md font-medium flex items-center gap-1">
                                                  <Pencil className="w-2.5 h-2.5 text-white" />
                                                  <span>Visual Drawing</span>
                                                </span>
                                              )}

                                              {comment.hasImage && (
                                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] rounded-md font-medium flex items-center gap-1">
                                                  <ImageIcon className="w-2.5 h-2.5 text-purple-400" />
                                                  <span>Attached Image</span>
                                                </span>
                                              )}

                                              {comment.isChat && (
                                                <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] rounded-md font-medium flex items-center gap-1">
                                                  <MessageCircle className="w-2.5 h-2.5 text-purple-400" />
                                                  <span>Chat</span>
                                                </span>
                                              )}
                                            </div>

                                            <span className="text-[11px] text-zinc-400 font-mono">
                                              {dayjs(comment.created_at).fromNow()}
                                            </span>
                                          </div>

                                          {/* Clean Comment Text */}
                                          <p className="text-xs text-zinc-300 group-hover:text-white leading-relaxed">
                                            {comment.plainText || comment.previewText}
                                          </p>

                                          {/* Attached Image Preview */}
                                          {comment.hasImage && comment.imageUrl && (
                                            <div className="mt-2 max-w-xs rounded-lg overflow-hidden border border-white/[0.08]">
                                              <img 
                                                src={comment.imageUrl} 
                                                alt="Attached feedback" 
                                                className="max-h-40 object-cover rounded-lg" 
                                                loading="lazy"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {clientGroups.length === 0 && (
                    <div className="text-center py-16 bg-[#0e0e11] border border-white/[0.08] rounded-2xl p-8 space-y-4">
                      <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto" />
                      <h3 className="text-sm font-semibold text-zinc-200">No client feedback found</h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        {feedbackSearchQuery ? `No comments match "${feedbackSearchQuery}".` : 'Share your room links with clients to collect timestamped feedback and visual drawings.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SUB-TAB 4: PROJECT ANALYTICS                                  */}
            {/* ============================================================= */}
            {profileActiveSubTab === 'analytics' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-[#0e0e11] border border-white/[0.08] p-6 md:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono font-medium uppercase">
                      <Icons8Analytics className="w-3 h-3 text-purple-400" />
                      <span>Project Analytics</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                      Workspace Analytics & Review Velocity
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      Deep dive into client review velocity, approval rates, annotation patterns, and version iterations.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 z-10">
                    <button 
                      onClick={() => setProfileActiveSubTab('projects')}
                      className="bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Icons8Layers className="w-4 h-4 text-zinc-950 font-bold" />
                      <span>View Projects</span>
                    </button>
                  </div>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Projects</span>
                    <span className="text-2xl font-bold text-white font-mono mt-3">{stats.totalProjects}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-white/[0.06]">{customFolders.length + 1} Folders</span>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client Feedback</span>
                    <span className="text-2xl font-bold text-white font-mono mt-3">{stats.totalFeedback}</span>
                    <span className="text-[10px] text-purple-300 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.drawingsCount} Drawings</span>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Approval Rate</span>
                    <span className="text-2xl font-bold text-purple-400 font-mono mt-3">{stats.approvalRate}%</span>
                    <span className="text-[10px] text-purple-300 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.approvedRooms} Approved</span>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Versions</span>
                    <span className="text-2xl font-bold text-purple-300 font-mono mt-3">{stats.totalVersions}</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-2 pt-2 border-t border-white/[0.06]">{stats.totalProjects > 0 ? (stats.totalVersions / stats.totalProjects).toFixed(1) : '1.0'}x avg</span>
                  </div>
                </div>

                {/* Velocity and Status breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#0e0e11] border border-white/[0.08] p-5 md:p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Icons8Analytics className="w-4 h-4 text-purple-400" />
                      <span>Project Velocity & Reviews</span>
                    </h2>
                    <div className="h-48 flex items-end justify-between gap-3 pt-4">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div 
                            className="w-4 bg-purple-500/80 hover:bg-purple-400 rounded-sm transition-all"
                            style={{ height: `${Math.min(100, ((idx + 1) / 6) * 100)}%` }}
                          ></div>
                          <span className="text-[10px] font-mono text-zinc-500">{month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 md:p-6 rounded-xl shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Icons8CheckCircle className="w-4 h-4 text-purple-400" />
                      <span>Status Breakdown</span>
                    </h2>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Approved</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.approvedRooms}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">In Progress</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.inProgressRooms}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Needs Changes</span>
                        <span className="font-mono text-purple-400 font-bold">{stats.rejectedRooms}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Analytics Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visual Annotations</span>
                    <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                      {stats.totalFeedback > 0 ? Math.round((stats.drawingsCount / stats.totalFeedback) * 100) : 0}%
                    </div>
                    <p className="text-[11px] text-zinc-500">of all comments include frame drawings</p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Avg Comments / Room</span>
                    <div className="text-2xl font-bold text-purple-300 font-mono mt-1">
                      {stats.totalProjects > 0 ? (stats.totalFeedback / stats.totalProjects).toFixed(1) : '0'}
                    </div>
                    <p className="text-[11px] text-zinc-500">average notes recorded per session</p>
                  </div>

                  <div className="bg-[#0e0e11] border border-white/[0.08] p-5 rounded-xl shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Active Clients</span>
                    <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                      {clientGroups.length}
                    </div>
                    <p className="text-[11px] text-zinc-500">unique commenters across all rooms</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (

      /* ========================================================================= */
      /* VIEW B: EXACT CLASSIC WORKSPACE (Matching Screenshot 100%)                */
      /* ========================================================================= */
        <div className="relative z-10 flex-1 flex h-full w-full overflow-hidden">
          
          {/* Mobile Sidebar Backdrop Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-150"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Left Navigation Sidebar */}
          <div 
            style={{ width: `${sidebarWidth}px` }} 
            className={`bg-[#0e0e11] border-r border-white/[0.08] flex-shrink-0 flex flex-col justify-between select-none ${
              isSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl max-w-[85vw]' : 'hidden md:flex'
            }`}
          >
            <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
              
              {/* Mobile Close Navigation Header */}
              <div className="flex md:hidden items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Navigation</span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Top Item: Admin Console Pill Button (if admin) */}
              {userIsAdmin && (
                <button
                  onClick={() => { navigate('/admin'); setIsSidebarOpen(false); }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-200 transition-colors cursor-pointer text-xs font-semibold group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border border-purple-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    </div>
                    <span>Admin Console</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded font-bold">
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
                  onClick={() => { setActiveFolder('All Rooms'); setActiveState(null); setIsSidebarOpen(false); }}
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
                    onClick={() => { setActiveFolder(f); setActiveState(null); setIsSidebarOpen(false); }}
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
                  onClick={() => { setActiveState(activeState === 'Approved' ? null : 'Approved'); setIsSidebarOpen(false); }}
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
                  onClick={() => { setActiveState(activeState === 'In Progress' ? null : 'In Progress'); setIsSidebarOpen(false); }}
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
                  onClick={() => { setActiveState(activeState === 'Rejected' ? null : 'Rejected'); setIsSidebarOpen(false); }}
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
            <header className="h-14 border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer mr-1"
                  title="Open Navigation"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <span className="hidden xs:inline">MarkItPlayer</span>
                <span className="hidden xs:inline">/</span>
                <span className="hidden sm:inline">All Assets</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-white font-semibold flex items-center gap-1 cursor-pointer truncate">
                  {activeFolder} <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                </span>
              </div>
            </header>

            {/* Secondary Toolbar */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 text-xs">
              
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
                    <div className="absolute left-0 top-full mt-1 w-36 bg-[#141417] border border-white/[0.1] rounded-xl shadow-xl z-50 py-1.5">
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
                    <div className="absolute left-0 top-full mt-1 w-40 bg-[#141417] border border-white/[0.1] rounded-xl shadow-xl z-50 py-1.5">
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
                    <div className="absolute left-0 top-full mt-1 w-36 bg-[#141417] border border-white/[0.1] rounded-xl shadow-xl z-50 py-1.5">
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
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in Rooms"
                    className="bg-[#141417] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 w-36 xs:w-44 sm:w-56"
                  />
                </div>

                <button 
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#141417] hover:bg-[#1c1c21] text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                  <span className="hidden xs:inline">Refresh</span>
                </button>

                <button 
                  onClick={handleCreateRoom}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-950 font-bold" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Asset Counter Subtitle */}
            <div className="px-3 sm:px-6 pt-2.5 sm:pt-3 text-[11px] text-zinc-500 font-mono">
              {filteredRooms.length} Assets · Realtime Sync Active
            </div>

            {/* Rooms Grid / List */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
                  <span className="text-xs font-medium text-zinc-400">Loading rooms...</span>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-20 bg-[#0e0e11] border border-white/[0.08] rounded-2xl p-8 space-y-4">
                  <Film className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-zinc-200">No rooms found</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    {searchQuery ? `No rooms match "${searchQuery}".` : 'Create your first video review room.'}
                  </p>
                  <button onClick={handleCreateRoom} className="bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer">
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
                            <div className="absolute inset-0 bg-[#101014]/70"></div>
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
                                    ? 'bg-purple-500 border-purple-500 opacity-100' 
                                    : 'border-white/20 bg-black/20 group-hover:border-white/40 opacity-0 group-hover:opacity-100'
                                } ${selectedRooms.length > 0 ? 'opacity-100' : ''}`}
                              >
                                {selectedRooms.includes(room.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 relative">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border backdrop-blur-sm ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
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
                                    className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-white/5 flex items-center gap-2"
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
                                      {st === 'In Progress' && <Clock className="w-3.5 h-3.5 text-zinc-400" />}
                                      {st === 'Approved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                      {st === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                                      {st}
                                    </button>
                                  ))}
                                  <div className="h-px bg-white/5 my-1" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenForRoom(null); handleDeleteRoom(e, room.id); }}
                                    className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex items-center gap-2 transition-colors"
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
                                <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-purple-300 font-mono border border-purple-500/20">
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
                      <tr className="border-b border-white/[0.08] bg-[#0e0e11] text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
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
                            <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                              <div 
                                onClick={(e) => toggleRoomSelection(e, room.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  selectedRooms.includes(room.id) ? 'bg-purple-600 border-purple-500' : 'border-zinc-700 bg-zinc-900'
                                }`}
                              >
                                {selectedRooms.includes(room.id) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3">
                                <TableThumbnail rawVideoUrl={room.video_url} />
                                <span className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate max-w-[220px] sm:max-w-xs md:max-w-md">
                                  {room.title || 'Untitled Session'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px]">{room.folder || 'Default'}</td>
                            <td className="py-2.5 px-4">
                              <span className="bg-white/5 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-mono text-[10px]">
                                {vObj?.title || `V${vData.currentVersion || 1}`}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${
                                (room.state || 'In Progress') === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                (room.state || 'In Progress') === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                              }`}>
                                {room.state || 'In Progress'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-zinc-300 font-mono">{room.comments?.[0]?.count || 0}</td>
                            <td className="py-2.5 px-4 text-zinc-500 font-mono">{dayjs(room.created_at).format('MMM D, YYYY')}</td>
                            <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => handleDeleteRoom(e, room.id)} className="p-1 text-zinc-500 hover:text-purple-400">
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

          {/* Right Floating Quick Action Dock */}
          <div className="hidden md:flex w-14 flex-shrink-0 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex-col items-center justify-between py-5 mr-4 self-center my-auto z-20 shadow-2xl h-[470px] max-h-[85vh]">
            
            {/* Top Avatar: Click opens the Profile Dashboard Command Center! */}
            <div className="flex flex-col items-center gap-3 w-full">
              <button 
                onClick={() => setCurrentMode('profile_dashboard')}
                className="p-0.5 rounded-full hover:ring-2 hover:ring-purple-400 transition-all group relative cursor-pointer"
                title="Click to open Profile Overview & Analytics"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover shadow-sm border border-white/10 ring-1 ring-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 bg-zinc-800 text-zinc-300 rounded-full flex items-center justify-center font-bold text-xs uppercase border border-zinc-700">
                    {userName.substring(0, 2)}
                  </div>
                )}
                <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                  Profile & Analytics
                </span>
              </button>
              <div className="w-6 h-px bg-white/10" />
            </div>

            {/* Quick Nav Icons */}
            <div className="flex flex-col gap-3.5 w-full items-center relative">
              <button 
                onClick={() => { setActiveFolder('All Rooms'); setActiveState(null); setSearchQuery(''); }} 
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group relative cursor-pointer"
                title="Home"
              >
                <Home className="w-5 h-5" />
                <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Home</span>
              </button>

              <button 
                onClick={() => document.getElementById('search-input')?.focus()} 
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group relative cursor-pointer"
                title="Search"
              >
                <Search className="w-5 h-5" />
                <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Search</span>
              </button>

              <button 
                onClick={handleManualRefresh} 
                disabled={refreshing} 
                className={`p-2 hover:bg-white/10 rounded-xl transition-all group relative cursor-pointer ${refreshing ? 'text-purple-400' : 'text-zinc-400 hover:text-white'}`} 
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Refresh</span>
              </button>

              {/* Notifications */}
              <div className="relative flex justify-center">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={`p-2 hover:bg-white/10 rounded-xl transition-all relative cursor-pointer ${showNotifications ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white'}`}
                  title="Client Feedback"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full border border-[#1a1b23]"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-full mr-3.5 w-80 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <h4 className="text-white font-semibold text-xs flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-purple-400" /> Client Messages
                      </h4>
                      <button 
                        onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                        className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
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
                            className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer border border-white/5 hover:border-purple-500/30 group text-left space-y-1.5"
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
                              {notif.plainText ? `"${notif.plainText}"` : (notif.hasDrawing ? 'Visual Drawing' : notif.previewText)}
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
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-6 h-px bg-white/10" />
              <div className="flex flex-col gap-3.5 w-full items-center">
                {userIsAdmin && (
                  <button 
                    onClick={() => navigate('/admin')} 
                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-xl transition-all relative group cursor-pointer"
                    title="Admin Console"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Admin Console</span>
                  </button>
                )}
                <button 
                  onClick={() => navigate('/help')} 
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all relative group cursor-pointer"
                  title="Features & Help"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-900/95 border border-white/10 text-xs text-zinc-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Features & Help</span>
                </button>
                <button 
                  onClick={handleLogout} 
                  className="p-2 text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all relative group cursor-pointer" 
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#141417] border border-purple-500/30 text-purple-300 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
