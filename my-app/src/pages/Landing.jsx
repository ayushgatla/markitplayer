import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HardDrive, MessageSquare, History, Users, FileText, Library, PlayCircle, CheckCircle2 } from 'lucide-react';
import Video from '../components/Video';

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
        className={`fixed inset-0 bg-black/80 transition-opacity duration-500 pointer-events-none z-[55] ${
          hoveredImage ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-zinc-950" />
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
      <section className="pt-24 lg:pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-start"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6 leading-[1.1]">
                One Platform<br />
                Every Client<br />
                <span className="text-zinc-500">Zero Chaos</span>
              </h1>
              <p className="text-base md:text-lg text-zinc-400 max-w-xl mb-8 leading-relaxed">
                Blasync is for freelancers - powered by your own Google Drive. Manage projects, collect feedback, and deliver files without juggling six tools.
              </p>
              <div className="flex flex-col sm:flex-row items-start justify-start gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                >
                  Start Free - No Credit Card
                </button>
                <button 
                  onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white font-medium hover:bg-zinc-800 transition-colors"
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
      <section className="py-20 border-y border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-zinc-500 mb-12 uppercase tracking-widest">
            Trusted by top editors globally
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Tool Replaced', value: '6 in 1' },
              { label: 'Storage Cost (Your drive)', value: '0$' },
              { label: 'Client Portals on Pro', value: '∞' },
              { label: 'Fewer Revision Rounds', value: '60%' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm text-zinc-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Built for how editors<br />actually work
            </h2>
            <p className="text-lg text-zinc-400">
              Every feature is designed around the real freelance video workflow - from first project to final invoice.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Remaining features and more info */}
            <div className="flex flex-col gap-8">
              <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
                <h3 className="text-2xl font-bold mb-4">Everything you need in one place</h3>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Stop constantly switching between email, WhatsApp, and Google Drive. 
                  Bring your entire workflow into a single, unified workspace designed specifically for professional video editors.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-white group cursor-pointer">
                  Learn more about our workflow
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {features.slice(4).map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual Composition (Imaginary Rectangle) */}
            <div className="mt-12 lg:mt-0 w-full grid grid-cols-3 gap-6 items-center">
              {/* Left Side: Two stacked images */}
              <div className="col-span-2 flex flex-col gap-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('feat-1')}
                  onHoverEnd={() => setHoveredImage(null)}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'feat-1' ? 'z-[60]' : 'z-10'}`}
                >
                  <img 
                    src="/product/video_projects.png" 
                    alt="Projects Dashboard" 
                    className="w-full h-auto rounded-2xl shadow-2xl border border-white/10" 
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('feat-2')}
                  onHoverEnd={() => setHoveredImage(null)}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'feat-2' ? 'z-[60]' : 'z-10'}`}
                >
                  <img 
                    src="/product/video_player.png" 
                    alt="Video Player" 
                    className="w-full h-auto rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10" 
                  />
                </motion.div>
              </div>
              
              {/* Right Side: Tall image */}
              <div className="col-span-1">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  onHoverStart={() => setHoveredImage('feat-3')}
                  onHoverEnd={() => setHoveredImage(null)}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className={`relative cursor-crosshair ${hoveredImage === 'feat-3' ? 'z-[60]' : 'z-10'}`}
                >
                  <img 
                    src="/product/front.png" 
                    alt="Comments Panel" 
                    className="w-full h-auto rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10" 
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Workflow Section */}
      <section id="workflow" className="py-32">
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              How it works
            </h2>
            <p className="text-lg text-zinc-400">
              A seamless flow from the first cut to the final payment.
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
                    title: 'Deliver & Bill',
                    desc: 'Approve the final version, send the high-res files, and generate an invoice in one click.',
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

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-zinc-950/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-zinc-400">
              Start for free, upgrade when you need to scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <p className="text-zinc-400 mb-8">Perfect for freelancers just starting out.</p>
              
              <ul className="space-y-4 mb-8">
                {['1 Active Project', 'Basic Video Reviews', 'Standard Support', 'Google Drive Integration'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-full bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl bg-white text-black relative">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-zinc-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">$15<span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <p className="text-zinc-600 mb-8">Everything you need to run your freelance business.</p>
              
              <ul className="space-y-4 mb-8">
                {['Unlimited Projects', 'Custom Client Portals', 'Invoice Generator', 'Priority Support', 'Custom Branding'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-full bg-black text-white font-medium hover:bg-zinc-800 transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
            Ready to stop juggling tools?
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join thousands of professional video editors who have simplified their workflow with Blasync.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors text-lg"
            >
              Start Free - No Credit Card
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-zinc-500 text-sm">
        <p>© 2026 Blasync. All rights reserved.</p>
      </footer>
    </div>
  );
}
