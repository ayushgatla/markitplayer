import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Clock, Users, ArrowRight, LogOut, User as UserIcon, Trash2, Home, Search, Bell, Cloud, Settings, HelpCircle, Folder, LayoutGrid, MonitorPlay, Image as ImageIcon, Music, CheckCircle, ListFilter, MessageSquare, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const getThumbnailUrl = (url) => {
  if (!url) return null;
  
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  
  const gdMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/);
  if (gdMatch && gdMatch[1]) {
    const baseUrl = import.meta.env.PROD 
      ? 'https://markitplayer-production.up.railway.app' 
      : 'http://localhost:3001';
    return `${baseUrl}/api/thumbnail/${gdMatch[1]}`;
  }
  
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching rooms:', error);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        { title: 'Untitled Session', user_id: user.id }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;

    const { data, error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .select();
    
    if (error) {
      console.error('Error deleting room:', error);
      alert(`Failed to delete room: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Failed to delete room: Permission denied.");
    } else {
      setRooms(rooms.filter(r => r.id !== roomId));
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-zinc-300 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Icon Sidebar */}
      <div className="w-14 flex-shrink-0 bg-[#050508] border-r border-white/5 flex flex-col items-center py-4 z-20">
        <div className="w-8 h-8 bg-white text-black rounded-md flex items-center justify-center font-bold text-lg mb-8">
          D
        </div>
        <div className="flex flex-col gap-6 w-full items-center flex-1">
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><Home className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><Cloud className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-6 w-full items-center mt-auto">
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><HelpCircle className="w-5 h-5" /></button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors" onClick={handleLogout} title="Sign Out"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Secondary Sidebar */}
      <div className="w-60 flex-shrink-0 bg-[#0c0a14] border-r border-white/5 flex flex-col overflow-y-auto z-20">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assets</h2>
          <Plus className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white" onClick={handleCreateRoom} />
        </div>
        <div className="flex flex-col px-2 gap-1 mb-6">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <Folder className="w-4 h-4" /> All Assets
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <Folder className="w-4 h-4" /> Episodes
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white bg-indigo-600/20 font-medium">
            <Folder className="w-4 h-4 text-indigo-400" /> Rooms
          </button>
        </div>

        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Collections</h2>
          <Plus className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white" />
        </div>
        <div className="flex flex-col px-2 gap-1 mb-6">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <MonitorPlay className="w-4 h-4" /> Videos
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <ImageIcon className="w-4 h-4" /> Images
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <Music className="w-4 h-4" /> Audio
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition-colors">
            <CheckCircle className="w-4 h-4 text-green-500" /> Approved
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 opacity-40"
          style={{ backgroundImage: 'url(/dashboard.jpg)' }}
        ></div>
        <div className="absolute inset-0 bg-[#0f0e17]/80 backdrop-blur-[2px] z-0"></div>

        {/* Top Header */}
        <div className="h-14 border-b border-white/5 flex items-center px-6 relative z-10 justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="font-medium hover:text-white cursor-pointer">Teaser</span>
            <span>/</span>
            <span className="hover:text-white cursor-pointer">All Assets</span>
            <span>/</span>
            <span className="text-white font-medium">Rooms</span>
            <ChevronDown className="w-4 h-4 ml-1 cursor-pointer" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-medium border border-white/10">A</div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-medium border border-white/10 -ml-4">B</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <button className="flex items-center gap-2 hover:text-white transition-colors"><LayoutGrid className="w-4 h-4" /> Appearance</button>
            <button className="flex items-center gap-2 hover:text-white transition-colors"><ListFilter className="w-4 h-4" /> Fields 1 Visible</button>
            <button className="flex items-center gap-2 hover:text-white transition-colors">Sorted by Date Uploaded</button>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Search in Rooms" className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-colors placeholder:text-zinc-600" />
            </div>
            <button 
              onClick={handleCreateRoom}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        <div className="px-6 pb-2 relative z-10 text-xs text-zinc-500">
          {rooms.length} Assets · {loading ? 'Loading...' : 'Ready'}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-zinc-500">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-xl bg-white/5">
              <Video className="w-8 h-8 text-zinc-600 mb-4" />
              <p className="text-zinc-400 mb-4 text-sm">No rooms created yet.</p>
              <button 
                onClick={handleCreateRoom}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rooms.map(room => (
                <div 
                  key={room.id} 
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="bg-[#1a1625] border border-white/5 rounded-xl hover:border-indigo-500/50 hover:bg-[#221c32] transition-all cursor-pointer group flex flex-col h-64 relative overflow-hidden shadow-lg"
                >
                  {/* Thumbnail Feature implementation */}
                  {room.video_url && getThumbnailUrl(room.video_url) && (
                    <>
                      <div 
                        className="absolute inset-0 bg-cover bg-center z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                        style={{ backgroundImage: `url(${getThumbnailUrl(room.video_url)})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e15] via-[#0f0e15]/80 to-transparent z-0"></div>
                    </>
                  )}
                  
                  <div className="relative z-10 flex flex-col h-full p-4">
                    <div className="flex justify-between items-start mb-auto">
                      <div className="w-5 h-5 rounded-[4px] border border-white/20 bg-black/20 backdrop-blur-sm group-hover:border-white/40 transition-colors"></div>
                      <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-zinc-300">
                        V1
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-16">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs font-medium">
                          <MessageSquare className="w-3 h-3" /> 0
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs font-medium ml-auto">
                          00:00
                        </div>
                      </div>
                      
                      <h3 className="text-sm font-medium text-white truncate mb-1">{room.title}</h3>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                        <span className="truncate">{user?.user_metadata?.full_name || 'Admin'}</span>
                        <span>·</span>
                        <span>{dayjs(room.created_at).format('MMM Do, YYYY')}</span>
                      </div>
                      
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Role</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">Review</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDeleteRoom(e, room.id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
