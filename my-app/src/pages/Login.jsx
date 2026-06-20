import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaySquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LiquidGlass from 'liquid-glass-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const handleEmailAuth = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="h-screen w-full bg-[#090214] font-sans relative overflow-hidden">
      {/* Blurred Lunar Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/lunar.jpg)',
          filter: 'blur(12px)',
          transform: 'scale(1.1)' // Scale up slightly to hide blurred edges
        }}
      ></div>
      {/* Overlay to ensure glass UI remains legible against bright parts of the image */}
      <div className="absolute inset-0 z-0 bg-black/40"></div>

      <LiquidGlass
        displacementScale={100}
        blurAmount={0.05}
        saturation={150}
        aberrationIntensity={4}
        elasticity={0.4}
        cornerRadius={32}
        className="w-[calc(100vw-32px)] max-w-md z-10"
        style={{ position: 'absolute', top: '50%', left: '50%' }}
      >
        <div className="bg-transparent border-t border-l border-white/20 border-b border-r border-black/40 p-8 w-full shadow-2xl backdrop-blur-sm relative rounded-[32px]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-[32px]"></div>
          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-indigo-500/20 p-3 rounded-xl mb-4">
                <PlaySquare className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isSignUp ? 'Create an Account' : 'Welcome to Aurora'}
              </h1>
              <p className="text-zinc-400 text-sm mt-2">
                {isSignUp ? 'Sign up for a new account' : 'Sign in to your account'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 text-sm p-3 rounded-lg mb-6">
                {message}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
                  {!isSignUp && (
                    <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="relative w-full h-[52px]">
                <LiquidGlass
                  displacementScale={20}
                  blurAmount={0.02}
                  saturation={150}
                  aberrationIntensity={2}
                  elasticity={0.2}
                  cornerRadius={12}
                  padding="0"
                  className="liquid-button w-full z-10"
                  style={{ position: 'absolute', top: '50%', left: '50%' }}
                  onClick={loading ? undefined : handleEmailAuth}
                >
                  <div className="flex items-center justify-center w-full h-[52px] bg-indigo-500/20 border border-indigo-400/30 text-white font-medium hover:bg-indigo-500/30 transition-colors">
                    {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                  </div>
                </LiquidGlass>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-center space-x-4">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider">Or continue with</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <div className="mt-6 relative w-full h-[52px]">
              <LiquidGlass
                displacementScale={20}
                blurAmount={0.02}
                saturation={150}
                aberrationIntensity={2}
                elasticity={0.2}
                cornerRadius={12}
                padding="0"
                className="liquid-button w-full z-10"
                style={{ position: 'absolute', top: '50%', left: '50%' }}
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center justify-center gap-3 w-full h-[52px] bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </div>
              </LiquidGlass>
            </div>

            <p className="mt-8 text-center text-sm text-zinc-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </span>
            </p>
          </div>
        </div>
      </LiquidGlass>
    </div>
  );
}
