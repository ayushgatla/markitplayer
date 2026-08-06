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
  const [updateModalConfig, setUpdateModalConfig] = useState(null); // { isOpen, platform }
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);

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

  const handleUpdateLink = (platform) => {
    setUpdateModalConfig({ isOpen: true, platform });
    setNewVideoUrl('');
  };

  const submitUpdateLink = async (e) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;
    
    setIsUpdatingUrl(true);
    const { error } = await supabase
      .from('rooms')
      .update({ video_url: newVideoUrl.trim() })
      .eq('id', roomId);
      
    setIsUpdatingUrl(false);
    if (error) {
      alert("Error updating link: " + error.message);
    } else {
      setRoomData({ ...roomData, video_url: newVideoUrl.trim() });
      setUpdateModalConfig(null);
    }
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
      {/* Custom Update Link Modal */}
      {updateModalConfig?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setUpdateModalConfig(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
              {updateModalConfig.platform === 'drive' ? (
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <img src="/drive.png" alt="Drive" className="w-5 h-5 object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <img src="/youtube.png" alt="YouTube" className="w-5 h-5 object-contain" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">Update Video Link</h3>
                <p className="text-sm text-zinc-400">
                  {updateModalConfig.platform === 'drive' ? 'Enter a new Google Drive link.' : 'Enter a new YouTube link.'}
                </p>
              </div>
            </div>

            <form onSubmit={submitUpdateLink} className="flex flex-col gap-4">
              <input
                type="url"
                required
                placeholder={updateModalConfig.platform === 'drive' ? "https://drive.google.com/file/d/..." : "https://youtube.com/watch?v=..."}
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setUpdateModalConfig(null)}
                  className="px-4 py-2 rounded-lg font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUrl || !newVideoUrl.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg font-medium transition-all"
                >
                  {isUpdatingUrl ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProjectHeader 
        title={roomData?.title || 'Loading Session...'} 
        onRename={handleRenameRoom}
        roomId={roomId}
        onUpdateLink={handleUpdateLink}
        videoUrl={roomData?.video_url}
      />
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {roomData?.video_url ? (
          <ReviewPlayer videoUrl={roomData.video_url} roomId={roomId} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-[104px] h-16 hover:scale-105 transition-transform duration-300">
                  <div className="absolute left-0 w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl flex items-center justify-center z-10 p-3">
                    <img src="/drive.png" alt="Google Drive" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute left-10 w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-xl flex items-center justify-center z-0 p-3">
                    <img src="/youtube.png" alt="YouTube" className="w-full h-full object-contain" />
                  </div>
                </div>
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
