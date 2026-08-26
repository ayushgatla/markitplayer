import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Film, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Layers,
  ArrowUpRight,
  Activity,
  Sparkles,
  Zap,
  Filter
} from 'lucide-react';
import dayjs from 'dayjs';

/**
 * Modern, handcrafted SVG analytics charts with interactive tooltips and sleek dark aesthetics.
 */
export function AnalyticsCharts({ rooms = [], comments = [] }) {
  const [timeRange, setTimeRange] = useState('14d'); // '7d' | '14d' | '30d'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activePlatformHover, setActivePlatformHover] = useState(null);

  const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

  // Aggregate daily statistics for the selected timeframe
  const dailyData = useMemo(() => {
    const data = [];
    const now = dayjs();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = now.subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const label = d.format(daysCount <= 7 ? 'ddd D' : 'MMM D');

      const dayRooms = rooms.filter(r => dayjs(r.created_at).format('YYYY-MM-DD') === dateStr);
      const dayComments = comments.filter(c => dayjs(c.created_at).format('YYYY-MM-DD') === dateStr);
      const dayApproved = dayRooms.filter(r => (r.state || '').toLowerCase() === 'approved');

      data.push({
        date: dateStr,
        label,
        rooms: dayRooms.length,
        comments: dayComments.length,
        approved: dayApproved.length,
        total: dayRooms.length + dayComments.length,
      });
    }
    return data;
  }, [rooms, comments, daysCount]);

  // Max value for chart Y scaling
  const maxDailyValue = useMemo(() => {
    const max = Math.max(...dailyData.map(d => Math.max(d.rooms, d.comments, d.total)), 4);
    return Math.ceil(max * 1.25);
  }, [dailyData]);

  // Platform Distribution
  const platformStats = useMemo(() => {
    let drive = 0;
    let yt = 0;
    let insta = 0;
    let other = 0;

    rooms.forEach(r => {
      const url = r.video_url || '';
      if (url.includes('drive.google.com') || url.includes('/file/d/')) drive++;
      else if (url.includes('youtube.com') || url.includes('youtu.be')) yt++;
      else if (url.includes('instagram.com')) insta++;
      else if (url.trim()) other++;
    });

    const total = drive + yt + insta + other || 1;
    return {
      drive: { count: drive, pct: Math.round((drive / total) * 100), color: '#10B981', label: 'Google Drive' },
      yt: { count: yt, pct: Math.round((yt / total) * 100), color: '#EF4444', label: 'YouTube' },
      insta: { count: insta, pct: Math.round((insta / total) * 100), color: '#EC4899', label: 'Instagram' },
      other: { count: other, pct: Math.round((other / total) * 100), color: '#8B5CF6', label: 'Direct Video' },
      totalCount: drive + yt + insta + other
    };
  }, [rooms]);

  // Status Lifecycle Funnel
  const statusStats = useMemo(() => {
    const total = rooms.length || 1;
    const inProgress = rooms.filter(r => (r.state || 'In Progress') === 'In Progress').length;
    const approved = rooms.filter(r => (r.state || '') === 'Approved').length;
    const rejected = rooms.filter(r => (r.state || '') === 'Rejected').length;

    return {
      inProgress: { count: inProgress, pct: Math.round((inProgress / total) * 100) },
      approved: { count: approved, pct: Math.round((approved / total) * 100) },
      rejected: { count: rejected, pct: Math.round((rejected / total) * 100) },
      totalRooms: rooms.length
    };
  }, [rooms]);

  // SVG Area Chart Dimensions
  const chartWidth = 700;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 30;
  const graphWidth = chartWidth - paddingX * 2;
  const graphHeight = chartHeight - paddingY * 2;

  // Generate SVG Points
  const getCoordinates = (index, value) => {
    const x = paddingX + (index / (dailyData.length - 1 || 1)) * graphWidth;
    const y = paddingY + graphHeight - (value / maxDailyValue) * graphHeight;
    return { x, y };
  };

  const commentsPoints = dailyData.map((d, i) => getCoordinates(i, d.comments));
  const roomsPoints = dailyData.map((d, i) => getCoordinates(i, d.rooms));

  // Build SVG Path
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  const commentsLinePath = buildSmoothPath(commentsPoints);
  const commentsAreaPath = `${commentsLinePath} L ${commentsPoints[commentsPoints.length - 1].x},${chartHeight - paddingY} L ${commentsPoints[0].x},${chartHeight - paddingY} Z`;

  const roomsLinePath = buildSmoothPath(roomsPoints);

  return (
    <div className="space-y-6">
      {/* Chart 1: Interactive Activity & Review Velocity Area Chart */}
      <div className="bg-[#0c0a14] border border-purple-950/50 rounded-none p-5 md:p-6 shadow-xl relative overflow-hidden">
        {/* Header with Title & Time Range Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-none bg-purple-500/15 text-purple-400 border border-purple-500/25">
                <Activity size={15} />
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">Review Activity & Velocity</h3>
            </div>
            <p className="text-xs text-zinc-400">Timeline feedback and session creations over time</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 ring-2 ring-purple-400/20"></span>
                <span className="text-zinc-300">Comments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20"></span>
                <span className="text-zinc-300">Sessions</span>
              </div>
            </div>

            {/* Time Filter Pills */}
            <div className="bg-[#07050e] p-0.5 rounded-none border border-purple-950/60 flex items-center gap-0.5 text-xs">
              {[
                { id: '7d', label: '7D' },
                { id: '14d', label: '14D' },
                { id: '30d', label: '30D' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  className={`px-2.5 py-1 rounded-none font-medium transition-colors cursor-pointer ${
                    timeRange === t.id
                      ? 'bg-white text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Graphic */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px] relative">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-48 overflow-visible"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {/* Indigo Area Gradient */}
                <linearGradient id="indigoAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>

                {/* Subtle Grid Line Stroke */}
                <pattern id="gridLines" width="100" height="40" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Background Grid Horizontal Lines */}
              {[0, 0.33, 0.66, 1].map((pct, idx) => {
                const y = paddingY + graphHeight * pct;
                const val = Math.round(maxDailyValue * (1 - pct));
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingX} 
                      y1={y} 
                      x2={chartWidth - paddingX} 
                      y2={y} 
                      stroke="rgba(255,255,255,0.06)" 
                      strokeDasharray="3 3"
                    />
                    <text 
                      x={paddingX - 8} 
                      y={y + 3} 
                      textAnchor="end" 
                      className="text-[9px] fill-zinc-500 font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              <path d={commentsAreaPath} fill="url(#indigoAreaGrad)" />

              {/* Comments Smooth Line */}
              <path 
                d={commentsLinePath} 
                fill="none" 
                stroke="#6366F1" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Rooms Smooth Line */}
              <path 
                d={roomsLinePath} 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="2" 
                strokeDasharray="4 4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Interactive Data Point Dots & Hover Trackers */}
              {dailyData.map((d, i) => {
                const cPt = commentsPoints[i];
                const rPt = roomsPoints[i];
                const isHovered = hoveredPoint?.index === i;

                return (
                  <g key={i} className="cursor-pointer">
                    {/* Invisible vertical hit area */}
                    <rect
                      x={cPt.x - (graphWidth / dailyData.length) / 2}
                      y={paddingY}
                      width={graphWidth / dailyData.length}
                      height={graphHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint({ index: i, data: d, x: cPt.x, y: cPt.y })}
                    />

                    {/* Vertical Highlight Ruler on Hover */}
                    {isHovered && (
                      <line
                        x1={cPt.x}
                        y1={paddingY}
                        x2={cPt.x}
                        y2={chartHeight - paddingY}
                        stroke="rgba(99,102,241,0.5)"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Comments Circle Dot */}
                    <circle
                      cx={cPt.x}
                      cy={cPt.y}
                      r={isHovered ? 5 : 3}
                      fill="#6366F1"
                      stroke="#15161e"
                      strokeWidth="2"
                      className="transition-all"
                    />

                    {/* Rooms Circle Dot */}
                    <circle
                      cx={rPt.x}
                      cy={rPt.y}
                      r={isHovered ? 4.5 : 2.5}
                      fill="#10B981"
                      stroke="#15161e"
                      strokeWidth="1.5"
                      className="transition-all"
                    />

                    {/* Bottom X-axis Date Labels */}
                    {(daysCount <= 7 || i % Math.ceil(daysCount / 7) === 0 || i === dailyData.length - 1) && (
                      <text
                        x={cPt.x}
                        y={chartHeight - paddingY + 16}
                        textAnchor="middle"
                        className={`text-[10px] font-mono ${isHovered ? 'fill-indigo-300 font-semibold' : 'fill-zinc-500'}`}
                      >
                        {d.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip Card */}
            {hoveredPoint && (
              <div 
                className="absolute -top-3 z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#1e202d] border border-indigo-500/40 rounded-xl p-2.5 shadow-2xl backdrop-blur-md min-w-[140px]"
                style={{ left: `${(hoveredPoint.x / chartWidth) * 100}%` }}
              >
                <div className="text-[11px] font-semibold text-zinc-300 mb-1 border-b border-white/10 pb-1 flex items-center justify-between">
                  <span>{dayjs(hoveredPoint.data.date).format('MMM D, YYYY')}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-3 text-indigo-300">
                    <span className="flex items-center gap-1"><MessageSquare size={11} /> Comments:</span>
                    <span className="font-mono font-bold">{hoveredPoint.data.comments}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-emerald-300">
                    <span className="flex items-center gap-1"><Film size={11} /> Sessions:</span>
                    <span className="font-mono font-bold">{hoveredPoint.data.rooms}</span>
                  </div>
                  {hoveredPoint.data.approved > 0 && (
                    <div className="flex items-center justify-between gap-3 text-amber-300">
                      <span className="flex items-center gap-1"><CheckCircle size={11} /> Approved:</span>
                      <span className="font-mono font-bold">{hoveredPoint.data.approved}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 Side-by-Side Modern Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 2: Platform Distribution Donut & Analytics */}
        <div className="bg-[#15161e] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" />
                  <span>Video Storage Ecosystem</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Asset source distribution across review sessions</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 border border-white/10">
                {platformStats.totalCount} Assets
              </span>
            </div>

            {/* Donut Progress Visual */}
            <div className="flex items-center gap-6 my-4">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Ring */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                  
                  {/* Google Drive Segment */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth={activePlatformHover === 'drive' ? '14' : '12'}
                    strokeDasharray={`${(platformStats.drive.pct / 100) * 238.7} 238.7`}
                    strokeDashoffset="0"
                    className="transition-all duration-300"
                  />

                  {/* YouTube Segment */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="none" 
                    stroke="#EF4444" 
                    strokeWidth={activePlatformHover === 'yt' ? '14' : '12'}
                    strokeDasharray={`${(platformStats.yt.pct / 100) * 238.7} 238.7`}
                    strokeDashoffset={`-${(platformStats.drive.pct / 100) * 238.7}`}
                    className="transition-all duration-300"
                  />

                  {/* Instagram / Direct Segment */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="38" 
                    fill="none" 
                    stroke="#EC4899" 
                    strokeWidth={activePlatformHover === 'insta' ? '14' : '12'}
                    strokeDasharray={`${((platformStats.insta.pct + platformStats.other.pct) / 100) * 238.7} 238.7`}
                    strokeDashoffset={`-${((platformStats.drive.pct + platformStats.yt.pct) / 100) * 238.7}`}
                    className="transition-all duration-300"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-bold text-white font-mono leading-none">
                    {platformStats.drive.pct}%
                  </span>
                  <span className="text-[9px] text-zinc-500 font-medium mt-0.5">Drive</span>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="flex-1 space-y-2">
                {[
                  { key: 'drive', stat: platformStats.drive, logo: '/drive.png', bg: 'bg-emerald-500' },
                  { key: 'yt', stat: platformStats.yt, logo: '/youtube.png', bg: 'bg-red-500' },
                  { key: 'insta', stat: platformStats.insta, logo: '/instagram.png', bg: 'bg-pink-500' },
                  { key: 'other', stat: platformStats.other, logo: null, bg: 'bg-purple-500' },
                ].map(({ key, stat, logo, bg }) => (
                  <div 
                    key={key}
                    onMouseEnter={() => setActivePlatformHover(key)}
                    onMouseLeave={() => setActivePlatformHover(null)}
                    className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${bg}`}></span>
                      <span className="text-zinc-300 font-medium">{stat.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-zinc-400">
                      <span>{stat.count}</span>
                      <span className="text-[10px] text-zinc-500">({stat.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Primary storage provider:</span>
            <span className="font-semibold text-emerald-400">Google Drive API</span>
          </div>
        </div>

        {/* Chart 3: Workflow State & Approval Funnel */}
        <div className="bg-[#15161e] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>Review Approval Pipeline</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Real-time status conversion across review rooms</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                {statusStats.approved.pct}% Approval Rate
              </span>
            </div>

            {/* Horizontal Conversion Funnel Bars */}
            <div className="space-y-4 my-3">
              {/* In Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-zinc-200 font-medium">In Progress (Active Feedback)</span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {statusStats.inProgress.count} ({statusStats.inProgress.pct}%)
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full p-0.5 border border-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, statusStats.inProgress.pct)}%` }}
                  />
                </div>
              </div>

              {/* Approved */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-zinc-200 font-medium">Approved by Client</span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {statusStats.approved.count} ({statusStats.approved.pct}%)
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full p-0.5 border border-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, statusStats.approved.pct)}%` }}
                  />
                </div>
              </div>

              {/* Revisions / Rejected */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="text-zinc-200 font-medium">Revisions Requested</span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {statusStats.rejected.count} ({statusStats.rejected.pct}%)
                  </span>
                </div>
                <div className="h-3 bg-black/40 rounded-full p-0.5 border border-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, statusStats.rejected.pct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Workflow efficiency:</span>
            <span className="font-semibold text-indigo-400 flex items-center gap-1">
              <Zap size={11} /> Real-time instant sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsCharts;
