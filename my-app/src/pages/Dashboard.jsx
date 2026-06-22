import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Clock, Users, ArrowRight, LogOut, User as UserIcon, Trash2, Home, Search, Bell, Cloud, Settings, HelpCircle, Folder, LayoutGrid, MonitorPlay, Image as ImageIcon, Music, CheckCircle, ListFilter, MessageSquare, ChevronDown, Check, XCircle, MoreVertical, Edit2, Menu, X } from 'lucide-react';
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
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All Rooms');
  const [activeState, setActiveState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenForRoom, setMenuOpenForRoom] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [customFolders, setCustomFolders] = useState(() => {
    const saved = localStorage.getItem('feedplayer_folders');
    return saved ? JSON.parse(saved) : ['Marketing Assets', 'Internal Reviews'];
  });

  useEffect(() => {
    localStorage.setItem('feedplayer_folders', JSON.stringify(customFolders));
  }, [customFolders]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(600, e.clientX));
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

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
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

  const toggleRoomSelection = (e, roomId) => {
    e.stopPropagation();
    setSelectedRooms(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const toggleAllRooms = () => {
    if (selectedRooms.length === rooms.length && rooms.length > 0) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(r => r.id));
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


      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Secondary Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex-shrink-0 bg-[#0c0a14] border-r border-white/5 flex flex-col overflow-y-auto z-40 ${isResizing ? 'transition-none' : 'transition-transform duration-300'}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5">
          {(() => {
            const avatarUrl = user?.user_metadata?.avatar_url || 
                              user?.user_metadata?.picture || 
                              user?.raw_user_meta_data?.avatar_url || 
                              user?.raw_user_meta_data?.picture || 
                              user?.identities?.[0]?.identity_data?.avatar_url || 
                              user?.identities?.[0]?.identity_data?.picture;
            
            return avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-md object-cover shadow-sm border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-white text-black rounded-md flex items-center justify-center font-bold text-lg uppercase">
                {user?.email?.[0] || 'D'}
              </div>
            );
          })()}
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Folders</h2>
          <Plus className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white" onClick={handleCreateFolder} />
        </div>
        <div className="flex flex-col px-2 gap-1 mb-6">
          <button 
            onClick={() => setActiveFolder('All Rooms')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === 'All Rooms' ? 'text-white bg-zinc-800 font-medium' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Folder className={`w-4 h-4 ${activeFolder === 'All Rooms' ? 'text-white' : ''}`} /> All Rooms
          </button>
          {customFolders.map(f => (
            <button 
              key={f}
              onClick={() => setActiveFolder(f)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === f ? 'text-white bg-zinc-800 font-medium' : 'text-zinc-400 hover:bg-white/5'}`}>
              <Folder className={`w-4 h-4 ${activeFolder === f ? 'text-white' : ''}`} /> {f}
            </button>
          ))}
        </div>

        <div className="p-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">State</h2>
        </div>
        <div className="flex flex-col px-2 gap-1 mb-6">
          <button 
            onClick={() => setActiveState(activeState === 'Approved' ? null : 'Approved')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeState === 'Approved' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <CheckCircle className="w-4 h-4 text-white" /> Approved
          </button>
          <button 
            onClick={() => setActiveState(activeState === 'In Progress' ? null : 'In Progress')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeState === 'In Progress' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <Clock className="w-4 h-4 text-white" /> In Progress
          </button>
          <button 
            onClick={() => setActiveState(activeState === 'Rejected' ? null : 'Rejected')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeState === 'Rejected' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
            <XCircle className="w-4 h-4 text-white" /> Rejected
          </button>
        </div>

        {/* Resize Handle */}
        <div 
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 opacity-40"
          style={{ backgroundImage: 'url(/dashboard.jpg)' }}
        ></div>
        <div className="absolute inset-0 bg-[#0f0e17]/80 backdrop-blur-[2px] z-0"></div>

        {/* Top Header */}
        <div className="h-14 border-b border-white/5 flex items-center px-4 md:px-6 relative z-10 justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mr-2 p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-medium hover:text-white cursor-pointer hidden sm:inline">Teaser</span>
            <span className="hidden sm:inline">/</span>
            <span className="hover:text-white cursor-pointer hidden sm:inline">All Assets</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-white font-medium">Rooms</span>
            <ChevronDown className="w-4 h-4 ml-1 cursor-pointer hidden sm:inline" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-medium border border-white/10">A</div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-medium border border-white/10 -ml-4">B</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 md:px-6 py-4 relative z-10 flex flex-col items-stretch md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm text-zinc-400">
            <button 
              onClick={toggleAllRooms}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                selectedRooms.length > 0 && selectedRooms.length === rooms.length
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : selectedRooms.length > 0
                    ? 'bg-indigo-500/50 border-indigo-500 text-white'
                    : 'border-white/20 hover:border-white/40'
              }`}>
                {selectedRooms.length > 0 && <Check className="w-3 h-3" />}
              </div>
              <span className="hidden sm:inline">Select {selectedRooms.length > 0 ? `(${selectedRooms.length})` : 'All'}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-white transition-colors"><LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Appearance</span></button>
            <button className="flex items-center gap-2 hover:text-white transition-colors"><ListFilter className="w-4 h-4" /> <span className="hidden sm:inline">Fields 1 Visible</span></button>
            <button className="flex items-center gap-2 hover:text-white transition-colors text-xs sm:text-sm">Date Uploaded</button>
          </div>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            {selectedRooms.length > 0 && (
              <button 
                onClick={async () => {
                  if (!window.confirm("Delete selected rooms?")) return;
                  const { error } = await supabase.from('rooms').delete().in('id', selectedRooms);
                  if (!error) {
                    setRooms(rooms.filter(r => !selectedRooms.includes(r.id)));
                    setSelectedRooms([]);
                  } else {
                    alert("Error deleting rooms: " + error.message);
                  }
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedRooms.length})
              </button>
            )}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search in Rooms" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-colors placeholder:text-zinc-600" 
              />
            </div>
            <button 
              onClick={handleCreateRoom}
              className="bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        <div className="px-4 md:px-6 pb-2 relative z-10 text-xs text-zinc-500">
          {rooms.length} Assets · {loading ? 'Loading...' : 'Ready'}
        </div>

        {/* Grid and Right Sidebar */}
        <div className="flex flex-1 overflow-hidden relative z-10">
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 relative z-10">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {rooms.filter(room => {
                if (activeFolder !== 'All Rooms' && (room.folder || 'All Rooms') !== activeFolder) return false;
                if (activeState && (room.state || 'In Progress') !== activeState) return false;
                if (searchQuery.trim() && !room.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
                return true;
              }).map(room => (
                <div 
                  key={room.id} 
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="bg-[#101014] border border-white/5 rounded-2xl hover:border-white/10 hover:bg-[#15151a] transition-all cursor-pointer group flex flex-col aspect-video relative shadow-md"
                >
                  {/* Background Thumbnail */}
                  {room.video_url && getThumbnailUrl(room.video_url) && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                        style={{ backgroundImage: `url(${getThumbnailUrl(room.video_url)})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#101014]/80 to-[#101014]/30"></div>
                    </div>
                  )}
                  
                  <div className="relative z-10 flex flex-col h-full p-5">
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {/* Show checkbox on hover or if selected */}
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
                        
                        {/* 3-dots Menu Dropdown */}
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
                                  } else {
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

                                const { error } = await supabase.from('rooms').update({ folder: folderName }).eq('id', room.id);
                                if (!error) {
                                  setRooms(rooms.map(r => r.id === room.id ? { ...r, folder: folderName } : r));
                                } else {
                                  setRooms(rooms.map(r => r.id === room.id ? { ...r, folder: folderName } : r));
                                }
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
                                  const { error } = await supabase.from('rooms').update({ state: st }).eq('id', room.id);
                                  if (!error) {
                                    setRooms(rooms.map(r => r.id === room.id ? { ...r, state: st } : r));
                                  } else {
                                    setRooms(rooms.map(r => r.id === room.id ? { ...r, state: st } : r));
                                  }
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
                    
                    {/* Middle: Title */}
                    <div className="mt-auto mb-4">
                      <h3 className="text-[17px] font-bold text-white tracking-wide truncate">{room.title}</h3>
                    </div>
                    
                    {/* Bottom Row */}
                    <div className="pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-medium text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {dayjs(room.created_at).fromNow()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        1
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {room.comments?.[0]?.count || 0}
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {(() => {
                            const isYouTube = room.video_url && (room.video_url.includes('youtube.com') || room.video_url.includes('youtu.be'));
                            const isDrive = room.video_url && room.video_url.includes('drive.google.com');
                            if (isYouTube) {
                              return <img src="/youtube.png" alt="YouTube" className="w-4 h-4 object-contain opacity-80" />;
                            } else if (isDrive) {
                              return <img src="/drive.png" alt="Drive" className="w-4 h-4 object-contain opacity-80" />;
                            } else {
                              return <Video className="w-4 h-4 text-zinc-500" />;
                            }
                        })()}
                        <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-zinc-400">
                          V1
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Icon Sidebar on the right */}
        <div className="hidden md:flex w-14 flex-shrink-0 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl flex-col items-center py-4 mr-4 mb-6 z-20 shadow-xl overflow-hidden h-[calc(100%-1rem)]">
          {(() => {
            const avatarUrl = user?.user_metadata?.avatar_url || 
                              user?.user_metadata?.picture || 
                              user?.raw_user_meta_data?.avatar_url || 
                              user?.raw_user_meta_data?.picture || 
                              user?.identities?.[0]?.identity_data?.avatar_url || 
                              user?.identities?.[0]?.identity_data?.picture;
            
            return avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-md object-cover mb-8 shadow-sm border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-white text-black rounded-md flex items-center justify-center font-bold text-lg mb-8 uppercase">
                {user?.email?.[0] || 'D'}
              </div>
            );
          })()}
          <div className="flex flex-col gap-6 w-full items-center flex-1">
            <button onClick={() => alert('Home feature coming soon!')} className="p-2 text-zinc-500 hover:text-white transition-colors"><Home className="w-5 h-5" /></button>
            <button onClick={() => alert('Search feature coming soon!')} className="p-2 text-zinc-500 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
            <button onClick={() => alert('Notifications feature coming soon!')} className="p-2 text-zinc-500 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
            <button onClick={() => alert('Cloud feature coming soon!')} className="p-2 text-zinc-500 hover:text-white transition-colors"><Cloud className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col gap-6 w-full items-center mt-auto">
            <button onClick={() => alert('Help center coming soon!')} className="p-2 text-zinc-500 hover:text-white transition-colors"><HelpCircle className="w-5 h-5" /></button>
            <button className="p-2 text-zinc-500 hover:text-white transition-colors" onClick={handleLogout} title="Sign Out"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
