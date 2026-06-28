import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Video, MessageSquare, Users, Folder, Search, 
  ChevronDown, CheckCircle2, Sparkles, Clock, Layers
} from 'lucide-react';

export default function Help() {
  const navigate = useNavigate();
  
  // State to manage open/closed accordion tabs. Default first tab to open.
  const [openTabs, setOpenTabs] = useState({ 0: true });

  const toggleTab = (index) => {
    setOpenTabs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const expandAll = () => {
    const allOpen = {};
    features.forEach((_, i) => { allOpen[i] = true; });
    setOpenTabs(allOpen);
  };

  const collapseAll = () => {
    setOpenTabs({});
  };

  const features = [
    {
      id: 'video-review',
      title: 'Video Review & Frame Timestamping',
      icon: Video,
      category: 'Core Feature',
      summary: 'Precision video player with frame-by-frame navigation and direct timestamp comments.',
      details: [
        'Frame-Accurate Controls: Play, pause, skip forward or back, and adjust playback speed with smooth player responsiveness.',
        'Multi-Source Support: Seamlessly review MP4 videos, YouTube links, and Google Drive hosted assets.',
        'Timeline Markers: Visual indicator dots placed right on the progress bar showing where client comments and feedback are located.',
        'Fullscreen Mode: Review high-resolution video cuts in immersive fullscreen view.'
      ]
    },
    {
      id: 'timestamp-comments',
      title: 'Time-stamped Comments & Feedback',
      icon: MessageSquare,
      category: 'Collaboration',
      summary: 'Leave feedback tied to exact moments in the video for crystal-clear communication.',
      details: [
        'Exact Timestamping: Comments automatically capture current playback time when typed.',
        'Comment Resolution: Mark feedback items as resolved once changes are implemented in your edit.',
        'Interactive Jump: Click any comment card in the sidebar to jump the video directly to that timestamp.',
        'Filter & Search: Easily switch between active comments and resolved items.'
      ]
    },
    {
      id: 'client-collaboration',
      title: 'Client Review Rooms & Guest Links',
      icon: Users,
      category: 'Sharing',
      summary: 'Share custom client review links allowing clients to give feedback without signing up.',
      details: [
        'One-Click Share Links: Generate secure, dedicated client URLs (/room/:roomId/client).',
        'No Login Required for Clients: Clients can enter their name and immediately leave feedback and chat.',
        'Real-Time Sync: Comments and chat messages update live via Supabase real-time subscriptions without refreshing.',
        'Owner Privacy: Clients get a simplified, focus-oriented review player while keeping admin controls protected.'
      ]
    },
    {
      id: 'live-chat',
      title: 'Live Chat & Project Messaging',
      icon: Clock,
      category: 'Communication',
      summary: 'Separate general discussion chat alongside timestamped video comments.',
      details: [
        'Dual Sidebar Tabs: Switch between timestamped video "Comments" and general "Chat".',
        'General Discussion: Perfect for high-level project direction, scope notes, and quick team syncs.',
        'Unread Notifications: Receive real-time pop-up alerts when clients post new messages in your rooms.'
      ]
    },
    {
      id: 'room-management',
      title: 'Room Management & Asset Tracking',
      icon: Layers,
      category: 'Organization',
      summary: 'Organize your video projects, track review status, and manage versions.',
      details: [
        'Status Badges: Categorize projects by status such as Draft, In Review, and Approved.',
        'Quick Actions: Rename rooms, update video source URLs, or archive/delete old sessions.',
        'Comment Counters: View total feedback count per room directly on your dashboard overview cards.'
      ]
    },
    {
      id: 'workspace-organization',
      title: 'Folders, Search & Workspace Customization',
      icon: Folder,
      category: 'Workflow',
      summary: 'Keep your dashboard clean with custom folders, instant search, and customizable views.',
      details: [
        'Custom Folders: Group projects into custom categories like "Marketing Assets" or "Internal Reviews".',
        'Instant Search: Search through all rooms instantly by title or keyword.',
        'Grid & List Views: Toggle between responsive card grids and structured table views.',
        'Resizable Sidebar: Adjust dashboard navigation panel width to fit your workflow perfectly.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#121318] text-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1a1b23]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10 flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-5 w-px bg-white/10"></div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h1 className="text-xl font-bold tracking-tight text-white">Platform Features Guide</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 cursor-pointer"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 cursor-pointer"
            >
              Contract All
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="mb-8 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent p-6 rounded-2xl border border-indigo-500/20 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span>Welcome to Feedplayer</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl">
            Explore all the features and capabilities of Feedplayer below. Click on any feature tab to expand or contract its detailed explanation, workflow tips, and capabilities.
          </p>
        </div>

        {/* Feature Accordion Tabs */}
        <div className="space-y-4">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            const isOpen = !!openTabs[idx];

            return (
              <div 
                key={feature.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'bg-[#1a1b23] border-indigo-500/40 shadow-lg shadow-indigo-950/20' 
                    : 'bg-[#16171e] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Accordion Header / Tab Toggle Button */}
                <button
                  onClick={() => toggleTab(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg transition-colors ${
                      isOpen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-white/10'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {feature.title}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-white/5 text-zinc-400 border border-white/5">
                          {feature.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {feature.summary}
                      </p>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 group-hover:text-white'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {/* Collapsible Content */}
                {isOpen && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/[0.01]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {feature.details.map((detail, dIdx) => {
                        const parts = detail.split(': ');
                        const title = parts[0];
                        const desc = parts.slice(1).join(': ');
                        return (
                          <div key={dIdx} className="p-3.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-semibold text-zinc-200 block mb-0.5">{title}</span>
                              <span className="text-zinc-400 leading-normal">{desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
