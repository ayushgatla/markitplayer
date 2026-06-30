import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Initial session:", session, "Error:", error);
      if (error) alert("Auth Error: " + error.message);
      if (window.location.hash.includes('error_description')) {
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        alert("OAuth Error: " + urlParams.get('error_description'));
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Clear the URL hash if it contains an access token to prevent accidental sharing
      if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
        setTimeout(() => {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
