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
        <ReviewPlayer videoUrl={"https://drive.google.com/file/d/1KlkKg_IurRrTpww1X44ubEl0bnh0Ad_t/view?usp=drivesdk"} />
      </main>
    </div>
  );
}

export default App;
