import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Clock, Users, ArrowRight, LogOut, User as UserIcon, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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
      alert("Failed to delete room: Permission denied. Please ensure you have a 'DELETE' policy for the 'rooms' table in Supabase.");
    } else {
      setRooms(rooms.filter(r => r.id !== roomId));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-1">Manage your video review sessions</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {/* Profile Section */}
            <div className="flex items-center justify-between sm:justify-start gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex-1 sm:flex-none">
              <div className="flex items-center gap-3">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate max-w-[120px] sm:max-w-[150px]">
                    {user?.user_metadata?.full_name || 'User Profile'}
                  </span>
                  <span className="text-xs text-zinc-400 truncate max-w-[120px] sm:max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
              <button 
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button 
                onClick={handleCreateRoom}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-5 h-5" />
                New Room
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
            <div className="bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-medium mb-2">No rooms yet</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">Create your first room to start collaborating on videos with your team.</p>
            <button 
              onClick={handleCreateRoom}
              className="bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div 
                key={room.id} 
                onClick={() => navigate(`/room/${room.id}`)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all cursor-pointer group flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-zinc-800 p-3 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                    <Video className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDeleteRoom(e, room.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors z-10"
                      title="Delete room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-indigo-300 transition-colors truncate flex-1">{room.title}</h2>
                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {dayjs(room.created_at).fromNow()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    1
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
