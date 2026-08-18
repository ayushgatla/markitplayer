import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import ReviewPlayer from '../components/ReviewPlayer';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Link, Video, Plus, Layers } from 'lucide-react';
import {
  parseVideoData,
  getActiveVideoUrl,
  addVideoVersion,
  switchVideoVersion,
  deleteVideoVersion
} from '../utils/versionHelper';

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
  const [newVersionTitle, setNewVersionTitle] = useState('');
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

  const videoData = parseVideoData(roomData?.video_url, roomData?.created_at);
  const activeVideoUrl = getActiveVideoUrl(roomData?.video_url);
  const nextVersionNum = (videoData.versions?.length > 0 
    ? Math.max(...videoData.versions.map(v => v.version || 0)) 
    : 0) + 1;

  const handleSaveVideoUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    
    setSavingUrl(true);
    const initialVersionData = addVideoVersion(null, urlInput.trim(), null, 'V1');

    const { data, error } = await supabase
      .from('rooms')
      .update({ video_url: initialVersionData })
      .eq('id', roomId)
      .select();
      
    if (error) {
      console.error('Error saving video url:', error);
      alert(`Failed to save video URL: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Failed to save video URL: Permission denied. Please ensure you have an 'UPDATE' policy for the 'rooms' table in Supabase.");
    } else {
      setRoomData({ ...roomData, video_url: initialVersionData });
    }
    setSavingUrl(false);
  };

  const handleUpdateLink = (platform) => {
    setUpdateModalConfig({ isOpen: true, platform: platform || 'drive' });
    setNewVideoUrl('');
    setNewVersionTitle(`V${nextVersionNum}`);
  };

  const submitUpdateLink = async (e) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;
    
    setIsUpdatingUrl(true);
    const updatedVersionJson = addVideoVersion(
      roomData?.video_url,
      newVideoUrl.trim(),
      updateModalConfig.platform,
      newVersionTitle.trim() || `V${nextVersionNum}`
    );

    const { error } = await supabase
      .from('rooms')
      .update({ video_url: updatedVersionJson })
      .eq('id', roomId);
      
    setIsUpdatingUrl(false);
    if (error) {
      alert("Error adding new version: " + error.message);
    } else {
      setRoomData({ ...roomData, video_url: updatedVersionJson });
      setUpdateModalConfig(null);
    }
  };

  const handleSwitchVersion = async (targetVersionNum) => {
    const switchedJson = switchVideoVersion(roomData?.video_url, targetVersionNum);
    // Optimistically update local state
    setRoomData(prev => ({ ...prev, video_url: switchedJson }));

    const { error } = await supabase
      .from('rooms')
      .update({ video_url: switchedJson })
      .eq('id', roomId);

    if (error) {
      console.error("Error switching version in DB:", error);
    }
  };

  const handleDeleteVersion = async (versionNumToDelete) => {
    const remainingJson = deleteVideoVersion(roomData?.video_url, versionNumToDelete);
    setRoomData(prev => ({ ...prev, video_url: remainingJson }));

    const { error } = await supabase
      .from('rooms')
      .update({ video_url: remainingJson })
      .eq('id', roomId);

    if (error) {
      alert("Error deleting version: " + error.message);
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
      {/* Minimal Add New Version Modal */}
      {updateModalConfig?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-md shadow-xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>New Version</span>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                  V{nextVersionNum}
                </span>
              </h3>
              <button 
                onClick={() => setUpdateModalConfig(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Platform Selector Segmented Control */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-4">
              <button
                type="button"
                onClick={() => setUpdateModalConfig(prev => ({ ...prev, platform: 'drive' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  updateModalConfig.platform === 'drive'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <img src="/drive.png" alt="Drive" className="w-3.5 h-3.5 object-contain" />
                <span>Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setUpdateModalConfig(prev => ({ ...prev, platform: 'youtube' }))}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  updateModalConfig.platform === 'youtube'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <img src="/youtube.png" alt="YouTube" className="w-3.5 h-3.5 object-contain" />
                <span>YouTube</span>
              </button>
            </div>

            <form onSubmit={submitUpdateLink} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {updateModalConfig.platform === 'drive' ? 'Google Drive Link' : 'YouTube Link'}
                </label>
                <input
                  type="url"
                  required
                  autoFocus
                  placeholder={updateModalConfig.platform === 'drive' ? "https://drive.google.com/file/d/..." : "https://youtube.com/watch?v=..."}
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Label <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={`V${nextVersionNum}`}
                  value={newVersionTitle}
                  onChange={(e) => setNewVersionTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setUpdateModalConfig(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUrl || !newVideoUrl.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {isUpdatingUrl ? 'Saving...' : `Add Version`}
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
        onSwitchVersion={handleSwitchVersion}
        onDeleteVersion={handleDeleteVersion}
      />
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {activeVideoUrl ? (
          <ReviewPlayer
            videoUrl={activeVideoUrl}
            rawVideoUrl={roomData?.video_url}
            roomId={roomId}
            currentVersionNum={videoData.currentVersion}
          />
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

