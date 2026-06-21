import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectHeader from '../components/ProjectHeader';
import ReviewPlayer from '../components/ReviewPlayer';
import { supabase } from '../supabaseClient';
import { Video } from 'lucide-react';

export default function ClientRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [isJoined, setIsJoined] = useState(false);

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
        
      if (error) {
        console.error('Error fetching room:', error);
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

  const handleJoin = (e) => {
    e.preventDefault();
    if (guestName.trim()) {
      localStorage.setItem(`guestName_${roomId}`, guestName.trim());
      setIsJoined(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans text-white">
        Loading session...
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-white items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <h2 className="text-2xl font-bold mb-2 text-center">Join Session</h2>
          <p className="text-zinc-400 mb-6 text-center">
            You've been invited to {roomData?.title || 'a session'}. Please enter your name to join.
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-3 rounded-xl font-medium transition-all"
            >
              Join Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-white">
      <ProjectHeader 
        title={roomData?.title || 'Loading Session...'} 
        isClient={true}
        roomId={roomId}
      />
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {roomData?.video_url ? (
          <ReviewPlayer videoUrl={roomData.video_url} roomId={roomId} isClient={true} guestName={guestName} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Waiting for host...</h2>
              <p className="text-zinc-400">The host hasn't added a video to this session yet.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
