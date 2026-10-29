import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  Pencil, 
  Clock, 
  Image as ImageIcon, 
  Search, 
  Video,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { parseComment } from '../utils/commentHelper';

dayjs.extend(relativeTime);

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'drawings' | 'comments' | 'chat' | 'images'

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, title, folder')
        .eq('user_id', user.id);

      if (roomsError) throw roomsError;

      const realRooms = (rooms || []).filter(
        r => (!r.folder || !r.folder.startsWith('__system_')) && (!r.title || !r.title.startsWith('Profile:'))
      );

      if (realRooms.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const roomIds = realRooms.map(r => r.id);
      const roomMap = {};
      realRooms.forEach(r => { roomMap[r.id] = r.title || 'Untitled Session'; });

      // 2. Fetch recent comments across those rooms
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      const formatted = (comments || []).map(c => {
        const parsed = parseComment(c);
        return {
          ...parsed,
          roomTitle: roomMap[c.room_id] || 'Room'
        };
      });

      setNotifications(formatted);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Filter by category tab
      if (activeFilter === 'drawings' && !notif.hasDrawing) return false;
      if (activeFilter === 'chat' && !notif.isChat) return false;
      if (activeFilter === 'comments' && notif.isChat) return false;
      if (activeFilter === 'images' && !notif.hasImage) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const authorMatch = (notif.author_name || '').toLowerCase().includes(q);
        const textMatch = (notif.plainText || '').toLowerCase().includes(q);
        const roomMatch = (notif.roomTitle || '').toLowerCase().includes(q);
        return authorMatch || textMatch || roomMatch;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      drawings: notifications.filter(n => n.hasDrawing).length,
      comments: notifications.filter(n => !n.isChat).length,
      chat: notifications.filter(n => n.isChat).length,
      images: notifications.filter(n => n.hasImage).length,
    };
  }, [notifications]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0e0e11]/90 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 px-3 rounded-lg bg-[#141417] hover:bg-[#1c1c21] text-zinc-300 hover:text-white transition-colors border border-white/[0.08] flex items-center gap-2 text-xs font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="h-5 w-px bg-white/[0.08] hidden sm:block"></div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold tracking-tight text-white leading-tight">Client Activity & Messages</h1>
                <p className="text-[11px] text-zinc-400 hidden sm:block">Real-time feedback, drawings, and comments from your review sessions</p>
              </div>
            </div>
          </div>

          <button 
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 px-3 rounded-lg bg-[#141417] hover:bg-[#1c1c21] text-zinc-300 hover:text-white transition-colors border border-white/[0.08] cursor-pointer flex items-center gap-2 text-xs font-medium shadow-sm"
            title="Refresh Activity"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-8">
        {/* Controls Bar: Search & Filter Tabs */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#0e0e11] p-3 md:p-4 rounded-xl border border-white/[0.08] shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages, clients, or rooms..."
              className="w-full bg-[#141417] border border-white/[0.08] focus:border-purple-500/60 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'comments', label: 'Timeline', count: counts.comments },
              { id: 'drawings', label: 'Drawings', count: counts.drawings },
              { id: 'chat', label: 'Chat', count: counts.chat },
              { id: 'images', label: 'Images', count: counts.images },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 text-xs cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                    : 'bg-[#141417] hover:bg-[#1c1c21] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeFilter === tab.id ? 'bg-zinc-200 text-zinc-950 font-bold' : 'bg-white/[0.06] text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List of Notification Items */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
            <span className="text-xs font-medium text-zinc-400">Loading client messages...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-[#0e0e11] rounded-2xl border border-white/[0.08] p-8 shadow-sm">
            <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              {searchQuery || activeFilter !== 'all' ? 'No Matching Messages' : 'No Client Messages Yet'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {searchQuery || activeFilter !== 'all' 
                ? 'Try clearing your search query or switching filter tabs.' 
                : 'When clients leave feedback, drawings, or chat messages in your review rooms, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => navigate(`/room/${notif.room_id}`)}
                className="p-4 md:p-5 rounded-xl bg-[#0e0e11] hover:bg-[#131317] transition-all cursor-pointer border border-white/[0.08] hover:border-white/[0.16] group shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                {/* Left: Avatar + Content Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {notif.avatar_url || notif.author_avatar ? (
                    <img
                      src={notif.avatar_url || notif.author_avatar}
                      alt={notif.author_name || 'Client'}
                      className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0 uppercase shadow-sm">
                      {(notif.author_name || 'C').substring(0, 2)}
                    </div>
                  )}

                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header Row: Author, Time, Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {notif.author_name || 'Client'}
                      </span>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className="text-[11px] text-zinc-400 font-mono" title={dayjs(notif.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                        {dayjs(notif.created_at).fromNow()}
                      </span>

                      {/* Metadata Badges */}
                      <div className="flex items-center gap-1.5 ml-auto md:ml-2 flex-wrap">
                        {notif.version && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-medium">
                            Version {notif.version}
                          </span>
                        )}
                        {notif.hasDrawing && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20 font-medium flex items-center gap-1">
                            <Pencil className="w-2.5 h-2.5 text-white" /> Drawing
                          </span>
                        )}
                        {notif.isRange && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {notif.formattedTime}
                          </span>
                        )}
                        {!notif.isRange && !notif.isChat && notif.timestamp >= 0 && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> @ {notif.formattedTime}
                          </span>
                        )}
                        {notif.isChat && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> Room Chat
                          </span>
                        )}
                        {notif.hasImage && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/20 font-medium flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" /> Image Attached
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment Body / Clean Preview */}
                    {notif.plainText ? (
                      <p className="text-xs text-zinc-200 leading-relaxed font-normal bg-[#141417] p-3 rounded-lg border border-white/[0.06]">
                        "{notif.plainText}"
                      </p>
                    ) : (
                      <div className="text-xs text-zinc-400 bg-[#141417] p-2.5 rounded-lg border border-white/[0.06] italic flex items-center gap-2">
                        {notif.hasDrawing ? (
                          <>
                            <Pencil className="w-3.5 h-3.5 text-white shrink-0" />
                            <span>Visual canvas drawing added at timestamp {notif.formattedTime}</span>
                          </>
                        ) : notif.hasImage ? (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Image screenshot attached</span>
                          </>
                        ) : (
                          <span>{notif.previewText}</span>
                        )}
                      </div>
                    )}

                    {/* Attached Image Preview if present */}
                    {notif.hasImage && notif.imageUrl && (
                      <div className="pt-1">
                        <div className="relative inline-block max-w-xs rounded-lg overflow-hidden border border-white/[0.08] bg-black/40 shadow-sm group/img">
                          <img 
                            src={notif.imageUrl} 
                            alt="Attachment preview" 
                            className="max-h-40 object-cover rounded-lg transition-transform duration-200 group-hover/img:scale-105"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}

                    {/* Room Badge */}
                    <div className="pt-1 flex items-center gap-2">
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 bg-[#141417] px-2.5 py-1 rounded-md border border-white/[0.06] w-fit">
                        <Video className="w-3 h-3 text-purple-400" />
                        <span className="text-zinc-500">Session:</span>
                        <span className="font-semibold text-zinc-200 truncate max-w-xs">{notif.roomTitle}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 flex items-center justify-end md:self-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/room/${notif.room_id}`);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Open Room</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
