import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HardDrive, MessageSquare, History, Users, FileText, Library, PlayCircle, CheckCircle2, Link } from 'lucide-react';
import Video from '../components/Video';
import RadialStats from '../components/RadialStats';
import { FeedbackForm } from '../components/FeedbackForm';
const features = [
  {
    icon: <img src="/drive_mono_chrome.png" alt="Google Drive" className="w-8 h-8 object-contain" />,
    title: 'Google Drive Native',
    description: 'Syncs with your cloud, zero extra uploading.'
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-zinc-300" />,
    title: 'Timeline Comments',
    description: 'Clients leave frame-accurate feedback.'
  },
  {
    icon: <History className="w-6 h-6 text-zinc-300" />,
    title: 'Version Control',
    description: 'Compare versions and iterate quickly.'
  },
  {
    icon: <Users className="w-6 h-6 text-zinc-300" />,
    title: 'Client Portal',
    description: 'Professional links with custom branding.'
  },
  {
    icon: <FileText className="w-6 h-6 text-zinc-300" />,
    title: 'Invoice Generator',
    description: 'Get paid faster with integrated billing.'
  },
  {
    icon: <Library className="w-6 h-6 text-zinc-300" />,
    title: 'Asset Library',
    description: 'Manage all project files in one secure place.'
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [hoveredImage, setHoveredImage] = useState(null);

  return (
    <div className="min-h-screen bg-background text-primary selection:bg-zinc-800 selection:text-white font-sans overflow-x-hidden">
      {/* Dimming Overlay for Image Hover */}
      <div
        className={`fixed inset-0 bg-black/80 transition-opacity duration-500 pointer-events-none z-[55] ${hoveredImage ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center">
              <img src="/blasync_icon.svg" alt="Blasync" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight">Blasync</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-start"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6 leading-[1.05]">
                Stop managing .<br />
                video revisions<br />
                <span className="text-[#a8a292]"> in WhatsApp</span>
              </h1>
              <p className="text-base md:text-lg text-zinc-400 max-w-xl mb-8 leading-relaxed">
                Stop managing video revisions in WhatsApp. Blasync turns your Google Drive videos into professional client review pages — with timeline comments, approvals, and everything in one place.
              </p>
              <div className="flex flex-col sm:flex-row items-start justify-start gap-4 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-medium transition-colors"
                >
                  Start Free - No Credit Card
                </button>
                <button
                  onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-transparent border border-zinc-600 text-zinc-300 font-medium hover:bg-zinc-800/50 transition-colors"
                >
                  Watch Demo
                </button>
              </div>
            </motion.div>

            {/* Right Column: Visual Composition (Imaginary Rectangle) */}
            <div className="mt-12 lg:mt-0 w-full grid grid-cols-3 gap-6 items-center">
              {/* Left Side: Two stacked images */}
              <div className="col-span-2 flex flex-col gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('hero-1')}
                  onHoverEnd={() => setHoveredImage(null)}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'hero-1' ? 'z-[60]' : 'z-10'}`}
                >
                  <img
                    src="/product/video_projects.png"
                    alt="Projects Dashboard"
                    fetchPriority="high"
                    className="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('hero-2')}
                  onHoverEnd={() => setHoveredImage(null)}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'hero-2' ? 'z-[60]' : 'z-10'}`}
                >
                  <img
                    src="/product/video_player.png"
                    alt="Video Player"
                    fetchPriority="high"
                    className="w-full h-auto rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                  />
                </motion.div>
              </div>

              {/* Right Side: Tall image */}
              <div className="col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('hero-3')}
                  onHoverEnd={() => setHoveredImage(null)}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'hero-3' ? 'z-[60]' : 'z-10'}`}
                >
                  <img
                    src="/product/front.png"
                    alt="Comments Panel"
                    fetchPriority="high"
                    className="w-full h-auto rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo-video" className="px-6">
        <Video />
      </section>

      {/* Stats Section */}
      <section className="py-12 lg:py-16 border-y border-white/5 bg-zinc-950/50 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <p className="text-center text-sm font-medium text-zinc-500 mb-12 uppercase tracking-widest">
            Built for freelance video editors
          </p>
          <div className="flex flex-col lg:grid lg:grid-cols-[1.5fr_auto_1fr] gap-12 lg:gap-8 items-center justify-center">
            {/* Left Side: Two stacked images */}
            <div className="hidden lg:flex flex-col gap-12 w-full max-w-[380px] lg:max-w-[500px] mx-auto order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative z-10"
              >
                <img
                  src="/3_page_images/Screenshot-2026-08-09_11-16-02.png"
                  alt="Video Player"
                  loading="lazy"
                  className="w-full h-auto rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative z-10"
              >
                <img
                  src="/3_page_images/Screenshot-2026-08-09_11-15-17.png"
                  alt="Projects Dashboard"
                  loading="lazy"
                  className="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
                />
              </motion.div>
            </div>

            {/* Center: Wheel */}
            <div className="flex justify-center w-full relative z-20 order-1 lg:order-2">
              <RadialStats />
            </div>

            {/* Right Side: Tall image */}
            <div className="hidden lg:block w-full max-w-[280px] lg:max-w-[320px] mx-auto order-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative z-10"
              >
                <img
                  src="/3_page_images/textbox.png"
                  alt="Comments Panel"
                  loading="lazy"
                  className="w-full h-auto rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              How it works
            </h2>
            <p className="text-lg text-zinc-400">
              A seamless workflow from first cut to client approval
            </p>
          </div>
        </div>

        {/* Infinite Scrolling Strip */}
        <div className="relative overflow-hidden w-full flex">
          <motion.div
            className="flex gap-8 w-max pl-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 30,
            }}
          >
            {[...Array(4)].map((_, arrayIndex) => (
              <React.Fragment key={arrayIndex}>
                {[
                  {
                    step: '01',
                    title: 'Sync & Share',
                    desc: 'Connect your Google Drive and generate a professional, branded review link in seconds.',
                  },
                  {
                    step: '02',
                    title: 'Review & Iterate',
                    desc: 'Clients leave frame-accurate comments directly on the video. No more confusing timestamps.',
                  },
                  {
                    step: '03',
                    title: 'Approve & Deliver',
                    desc: 'Resolve feedback and get final approval from your clients seamlessly.',
                  }
                ].map((item, i) => (
                  <div
                    key={`${arrayIndex}-${i}`}
                    className="w-[300px] md:w-[400px] flex-shrink-0 bg-zinc-900/40 p-8 border border-white/5 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="text-sm font-bold text-zinc-500 mb-4">STEP {item.step}</div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-zinc-400 leading-relaxed whitespace-normal">{item.desc}</p>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Built for how editors<br />actually work
            </h2>
            <p className="text-lg text-zinc-400">
              Every feature is designed around the real freelance video workflow - from first project to final invoice.
            </p>
          </div>

          <div className="max-w-6xl mx-auto relative mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {features.map((feature, i) => {
                // Determine grid placement for snake layout
                let colStart = "";
                let rowStart = "";
                if (i === 0) { colStart = "md:col-start-1"; rowStart = "md:row-start-1"; }
                if (i === 1) { colStart = "md:col-start-2"; rowStart = "md:row-start-1"; }
                if (i === 2) { colStart = "md:col-start-3"; rowStart = "md:row-start-1"; }
                if (i === 3) { colStart = "md:col-start-3"; rowStart = "md:row-start-2"; }
                if (i === 4) { colStart = "md:col-start-2"; rowStart = "md:row-start-2"; }
                if (i === 5) { colStart = "md:col-start-1"; rowStart = "md:row-start-2"; }

                return (
                  <div key={i} className={`relative flex flex-col ${colStart} ${rowStart}`}>

                    {/* Connecting Lines */}
                    {/* Mobile: All except last have a vertical line down */}
                    {i !== 5 && (
                      <div className="md:hidden absolute bottom-[-32px] left-1/2 -translate-x-1/2 w-[2px] h-[32px] bg-white/20 z-0"></div>
                    )}

                    {/* Desktop Lines */}
                    {i === 0 && <div className="hidden md:block absolute right-[-32px] top-1/2 -translate-y-1/2 w-[32px] h-[2px] bg-white/20 z-0"></div>}
                    {i === 1 && <div className="hidden md:block absolute right-[-32px] top-1/2 -translate-y-1/2 w-[32px] h-[2px] bg-white/20 z-0"></div>}
                    {i === 2 && <div className="hidden md:block absolute bottom-[-32px] left-1/2 -translate-x-1/2 w-[2px] h-[32px] bg-white/20 z-0"></div>}
                    {i === 3 && <div className="hidden md:block absolute left-[-32px] top-1/2 -translate-y-1/2 w-[32px] h-[2px] bg-white/20 z-0"></div>}
                    {i === 4 && <div className="hidden md:block absolute left-[-32px] top-1/2 -translate-y-1/2 w-[32px] h-[2px] bg-white/20 z-0"></div>}

                    {/* The Box */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="w-full h-full bg-zinc-950 border border-white/10 p-8 relative z-10 hover:border-white/30 transition-colors flex flex-col justify-center"
                    >
                      <div className="text-xs font-bold text-zinc-500 mb-4 tracking-widest uppercase">STEP 0{i + 1}</div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-zinc-400 leading-relaxed text-sm">{feature.description}</p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 lg:py-24 px-6 bg-zinc-950/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Blasync is free during beta.
            </h2>
            <p className="text-lg text-zinc-400">
              We're building Blasync with video editors, not guessing what they need. Join the beta and get full access while we're testing and improving the workflow.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 relative">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-white text-black px-4 py-1 rounded-full text-sm font-bold tracking-wider">
                BETA
              </div>
              <div className="text-5xl font-bold mb-2">$0</div>
              <p className="text-zinc-400 mb-8 font-medium">Free during beta</p>

              <ul className="space-y-4 mb-8">
                {['Timeline video reviews', 'Google Drive integration', 'Client review links', 'Frame-accurate comments', 'Client approval', 'No credit card required'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
              >
                Join the Beta →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
            Help us build Blasync.
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            We're in beta, and we're building Blasync with real video editors. Tell us what's missing, what's confusing, or what would make your workflow better.
          </p>

          <FeedbackForm />

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-zinc-950 border-t border-white/5 py-10 px-6 text-sm">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">

          {/* Primary Column */}
          <div className="flex flex-col gap-2">
            <h3 className="text-zinc-100 font-semibold mb-1">Primary</h3>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Home</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Products</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Our Work</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Contact Us</a>
          </div>

          {/* Others Column */}
          <div className="flex flex-col gap-2">
            <h3 className="text-zinc-100 font-semibold mb-1">Others</h3>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Guidelines</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Credits</a>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-zinc-100 font-semibold mb-1">Contact</h3>
              <p className="text-zinc-400 mb-1">Email:</p>
              <a href="mailto:blasync93@gmail.com" className="text-white hover:text-zinc-300 transition-colors">
                blasync93@gmail.com
              </a>
            </div>

            <div>
              <h3 className="text-zinc-100 font-semibold mb-1">Socials</h3>
              <div className="flex gap-4 font-bold text-xs mt-1">
                <a href="#" className="text-zinc-400 hover:text-white transition-colors">IG</a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors">IN</a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors">X</a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors">FB</a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors">YT</a>
              </div>
            </div>
          </div>

        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5 text-center text-zinc-500 text-xs">
          <p>© 2026 Blasync. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
