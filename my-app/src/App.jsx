import React from 'react';
import ProjectHeader from './components/ProjectHeader';
import ReviewPlayer from './components/ReviewPlayer';

function App() {
  // Using a well-known public sample video for demonstration
  const sampleVideoUrl = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      <ProjectHeader title="Project Aurora - Final Cut" />
      <main className="flex-1 flex overflow-hidden">
        <ReviewPlayer videoUrl={"https://drive.google.com/file/d/1fRY86tjekvOS6IwRs0PKLnf02XogRHn6/view?usp=drivesdk"} />
      </main>
    </div>
  );
}

export default App;
