import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import ReviewPlayer from '../components/ReviewPlayer';
import { supabase } from '../supabaseClient';
import { Video } from 'lucide-react';
import { parseVideoData, getActiveVideoUrl } from '../utils/versionHelper';

export default function ClientRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [selectedVersionNum, setSelectedVersionNum] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem(`guestName_${roomId}`);
    if (savedName) {
      setGuestName(savedName);
      setIsJoined(true);
    }

    async function fetchRoom() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
        
      if (error || (data?.folder && data.folder.startsWith('__system_')) || (data?.title && data.title.startsWith('Profile:'))) {
        console.error('Error fetching room or system config row:', error);
        alert('Room not found or unavailable.');
        navigate('/');
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
  const currentVersion = selectedVersionNum !== null ? selectedVersionNum : videoData.currentVersion;
  const activeVideoUrl = getActiveVideoUrl(roomData?.video_url, currentVersion);

  const handleJoin = (e) => {
    e.preventDefault();
    if (guestName.trim()) {
      localStorage.setItem(`guestName_${roomId}`, guestName.trim());
      setIsJoined(true);
    }
  };

  const handleSwitchVersion = (verNum) => {
    setSelectedVersionNum(verNum);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center font-sans text-zinc-300">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-3"></div>
        <span className="text-xs text-zinc-400 font-medium tracking-wide">Loading session...</span>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col font-sans text-white items-center justify-center p-4">
        <div className="bg-[#141417] border border-white/[0.08] rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mb-5 mx-auto text-zinc-200">
            <Video className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-center text-white">Join Review Session</h2>
          <p className="text-zinc-400 text-xs mb-6 text-center leading-relaxed">
            You've been invited to review <span className="text-zinc-200 font-semibold">{roomData?.title || 'a video session'}</span>. Enter your name to start leaving feedback.
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your Name (e.g. Alex Reviewer)"
              className="w-full bg-zinc-950 border border-white/[0.1] text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 px-4 py-3 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              Join Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#09090b] flex flex-col font-sans text-white lg:overflow-hidden">
      <ProjectHeader 
        title={roomData?.title || 'Loading Session...'} 
        isClient={true}
        roomId={roomId}
        videoUrl={roomData?.video_url}
        onSwitchVersion={handleSwitchVersion}
      />
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#09090b]">
        {activeVideoUrl ? (
          <ReviewPlayer
            key={`${roomId}_v${currentVersion}_${activeVideoUrl}`}
            videoUrl={activeVideoUrl}
            rawVideoUrl={roomData?.video_url}
            roomId={roomId}
            isClient={true}
            guestName={guestName}
            currentVersionNum={currentVersion}
            onSwitchVersion={handleSwitchVersion}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#09090b]">
            <div className="w-full max-w-xl bg-[#141417] border border-white/[0.08] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-zinc-900 border border-white/[0.08] text-purple-400 rounded-xl flex items-center justify-center mb-5">
                <Video className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Waiting for host...</h2>
              <p className="text-zinc-400 text-xs max-w-sm">The host hasn't added a video to this review session yet.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

