import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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
        .select('id, title')
        .eq('user_id', user.id);

      if (roomsError) throw roomsError;

      if (!rooms || rooms.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const roomIds = rooms.map(r => r.id);
      const roomMap = {};
      rooms.forEach(r => { roomMap[r.id] = r.title || 'Untitled Session'; });

      // 2. Fetch recent comments across those rooms
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      const formatted = (comments || []).map(c => ({
        ...c,
        roomTitle: roomMap[c.room_id] || 'Room'
      }));

      setNotifications(formatted);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121318] text-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1a1b23]/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10 flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="h-5 w-px bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">Client Messages & Notifications</h1>
            </div>
          </div>

          <button 
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10 cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Refresh Notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="mb-6 flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">All Client Messages</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Recent feedback and comments left across your video review rooms.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {notifications.length} Total
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-sm">Loading client messages...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1b23]/50 rounded-2xl border border-white/5 p-8">
            <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-zinc-300 mb-1">No Client Messages Yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">When clients post comments or chat messages in your review rooms, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => navigate(`/room/${notif.room_id}`)}
                className="p-4 rounded-xl bg-[#1a1b23] hover:bg-[#20222d] transition-all cursor-pointer border border-white/10 hover:border-indigo-500/40 group shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-indigo-300">
                      {notif.author_name || 'Client'}
                    </span>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="text-xs text-zinc-400">
                      {dayjs(notif.created_at).fromNow()}
                    </span>
                    <span className="ml-auto sm:ml-2 text-[11px] px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/5 font-medium flex items-center gap-1">
                      <span className="text-zinc-500">Room:</span> {notif.roomTitle}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed font-normal bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    "{notif.comment_text}"
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  <button className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-md group-hover:scale-105 transform">
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
