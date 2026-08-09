import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabaseClient, isSupabaseConfigured } from '../services/supabase';
import { LoginScreen } from './LoginScreen';

type AuthState = 'CHECKING_SESSION' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(
    isSupabaseConfigured ? 'CHECKING_SESSION' : 'AUTHENTICATED'
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabaseClient) {
      setAuthState('AUTHENTICATED');
      return;
    }

    let mounted = true;

    // 1. Initial Session Check
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setAuthState('AUTHENTICATED');
        } else {
          setAuthState('UNAUTHENTICATED');
        }
      }
    }).catch(() => {
      if (mounted) setAuthState('UNAUTHENTICATED');
    });

    // 2. Listen for Auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          if (session) {
            setAuthState('AUTHENTICATED');
          } else {
            setAuthState('UNAUTHENTICATED');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authState === 'CHECKING_SESSION') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-sm uppercase tracking-wider">JOB HUNTER AI</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Verificando autenticação...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'UNAUTHENTICATED') {
    return <LoginScreen onLoginSuccess={() => setAuthState('AUTHENTICATED')} />;
  }

  return <>{children}</>;
};
