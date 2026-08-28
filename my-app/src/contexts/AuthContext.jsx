import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { syncCurrentUserProfile } from '../utils/userRegistry';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const hasAuthHash = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('code=')
    );

    // Safety fallback: Give 3.5s for OAuth hash exchanges, 1.5s for normal page loads
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }, hasAuthHash ? 3500 : 1500);

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase getSession error:", error);
        }
        if (!isMountedRef.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            syncCurrentUserProfile(currentUser);
          } catch (profileErr) {
            console.warn("Error syncing profile:", profileErr);
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve initial session:", err);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    checkSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    let subscription = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMountedRef.current) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            syncCurrentUserProfile(currentUser);
          } catch (profileErr) {
            console.warn("Error syncing profile on auth change:", profileErr);
          }
        }
        setLoading(false);

        // Clear the URL hash if it contains an access token to prevent accidental sharing
        if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      });
      subscription = data?.subscription;
    } catch (authSubErr) {
      console.warn("Could not attach onAuthStateChange listener:", authSubErr);
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimeout);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-[9999] select-none">
          <div className="relative flex items-center justify-center">
            {/* Ambient Pulse Glow */}
            <div className="absolute w-20 h-20 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            
            {/* App Icon Container */}
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl relative z-10 animate-pulse">
              <img src="/blasync_icon.svg" alt="Blasync" className="w-8 h-8 object-contain" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-zinc-500 text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            Loading Blasync...
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

