import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import ReviewPlayer from '../components/ReviewPlayer';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Link, Video } from 'lucide-react';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    async function fetchRoom() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (error) {
        console.error('Error fetching room:', error);
        navigate('/dashboard');
      } else {
        setRoomData(data);
      }
      setLoading(false);
    }
    
    if (roomId) {
      fetchRoom();
    }
  }, [roomId, navigate]);

  const handleSaveVideoUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    setSavingUrl(true);
    const { data, error } = await supabase
      .from('rooms')
      .update({ video_url: urlInput })
      .eq('id', roomId)
      .select();
      
    if (error) {
      console.error('Error saving video url:', error);
      alert(`Failed to save video URL: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Failed to save video URL: Permission denied. Please ensure you have an 'UPDATE' policy for the 'rooms' table in Supabase.");
    } else {
      setRoomData({ ...roomData, video_url: urlInput });
    }
    setSavingUrl(false);
  };

  const handleRenameRoom = async (newTitle) => {
    const { data, error } = await supabase
      .from('rooms')
      .update({ title: newTitle })
      .eq('id', roomId)
      .select();
      
    if (error) {
      console.error('Error renaming room:', error);
      alert(`Failed to rename room: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Failed to rename room: Permission denied. Ensure you have an 'UPDATE' policy for the 'rooms' table.");
    } else {
      setRoomData({ ...roomData, title: newTitle });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans text-white">
        Loading session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-white">
      <ProjectHeader 
        title={roomData?.title || 'Loading Session...'} 
        onRename={handleRenameRoom}
      />
      <main className="flex-1 flex overflow-hidden">
        {roomData?.video_url ? (
          <ReviewPlayer videoUrl={roomData.video_url} roomId={roomId} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Setup Your Session</h2>
              <p className="text-zinc-400 mb-8">Paste a Google Drive or YouTube link to start reviewing and collaborating.</p>
              
              <form onSubmit={handleSaveVideoUrl} className="w-full relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Link className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl pl-12 pr-32 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={savingUrl || !urlInput.trim()}
                  className="absolute inset-y-2 right-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 rounded-lg font-medium transition-all"
                >
                  {savingUrl ? 'Saving...' : 'Start'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
