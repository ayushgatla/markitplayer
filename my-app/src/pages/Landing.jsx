import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HardDrive, MessageSquare, History, Users, FileText, Library, PlayCircle, CheckCircle2 } from 'lucide-react';
import Landing3DBackground from '../components/Landing3DBackground';
import FeatureCube from '../components/FeatureCube';

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

  return (
    <div className="min-h-screen bg-background text-primary selection:bg-zinc-800 selection:text-white font-sans overflow-x-hidden">
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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <Landing3DBackground />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse"></span>
              Now in beta - Join Waitlist
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 leading-[1.1]">
              One Platform<br />
              Every Client<br />
              <span className="text-zinc-500">Zero Chaos</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Blasync is for freelancers - powered by your own Google Drive. Manage projects, collect feedback, and deliver files without juggling six tools.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
              >
                Start Free - No Credit Card
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white font-medium hover:bg-zinc-800 transition-colors">
                Watch Demo
              </button>
            </div>
          </motion.div>
        </div>
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

            {/* Right Column: 3D Feature Cube (first 4 features) */}
            <div className="flex flex-col items-center justify-center">
              <FeatureCube features={features.slice(0, 4)} />
            </div>
          </div>
        </div>
      </section>

      {/* Video Review Preview */}
      <section className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 md:p-12 shadow-glow-strong"
          >
            <div className="mb-10">
              <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Video Review System</div>
              <h2 className="text-3xl md:text-4xl font-bold">Frame-by-frame feedback,<br />zero WhatsApp chaos</h2>
            </div>
            
            {/* Mock UI */}
            <div className="rounded-xl border border-zinc-800 bg-black overflow-hidden flex flex-col md:flex-row shadow-2xl">
              <div className="flex-1 bg-zinc-950 aspect-video flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 relative">
                <PlayCircle className="w-16 h-16 text-zinc-700" />
                <div className="absolute bottom-0 left-0 w-full p-4">
                  <div className="h-1 bg-zinc-800 rounded-full w-full relative">
                    <div className="absolute left-0 top-0 h-full bg-zinc-500 rounded-full w-1/3"></div>
                    <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-80 p-6 bg-zinc-900 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <span className="font-semibold text-sm">Comments</span>
                  <span className="text-xs text-zinc-500">2 total</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0"></div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">Client</span>
                      <span className="text-xs text-zinc-500">0:12</span>
                    </div>
                    <p className="text-sm text-zinc-300">Can we make the logo slightly bigger here?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0"></div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-medium text-sm">Director</span>
                      <span className="text-xs text-zinc-500">1:45</span>
                    </div>
                    <p className="text-sm text-zinc-300">Great transition. Ship it!</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-zinc-500 text-sm">
        <p>© 2026 Blasync. All rights reserved.</p>
      </footer>
    </div>
  );
}
