import React, { useState, useEffect } from 'react';
import { User, ArrowRight, Sparkles, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, signInAnonymously } from '../lib/firebase';
import { UserProfile } from '../types';
import { getUserAvatar, getUserDisplayName } from '../utils/userUtils';
import { safeLocalStorageGet } from '../utils/storageUtils';

interface LoginScreenProps {
  onGuestLogin?: (name?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGuestLogin }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [inputName, setInputName] = useState('');
  const [savedUser, setSavedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const cached = safeLocalStorageGet<UserProfile | null>('omnisym_user', null);
    if (cached && cached.name && cached.name !== 'Guest User') {
      setSavedUser(cached);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn('Google Sign-In Notice:', error?.message || error);
      setIsAuthenticating(false);
      setShowNamePrompt(true);
    }
  };

  const handleStartGuestFlow = () => {
    setShowNamePrompt(true);
  };

  const handleConfirmGuestName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = inputName.trim() || 'Guest';

    try {
      setIsAuthenticating(true);
      await signInAnonymously(auth);
    } catch (error: any) {
      console.warn('Anonymous Firebase sign-in notice:', error?.message || error);
    } finally {
      setIsAuthenticating(false);
      if (onGuestLogin) {
        onGuestLogin(finalName);
      }
    }
  };

  const handleResumeSavedSession = () => {
    if (savedUser && onGuestLogin) {
      onGuestLogin(savedUser.name);
    }
  };

  return (
    <div
      id="omnisym-login-screen"
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0c] font-sans text-slate-100 p-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0a0a0c] to-[#0a0a0c] pointer-events-none" />
      
      {/* Brand Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center mb-12"
      >
        <div className="w-20 h-20 bg-indigo-950 flex items-center justify-center rounded-3xl mb-6 shadow-2xl shadow-indigo-900/50 border border-indigo-800/50 overflow-hidden">
          <Sparkles className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter text-white">Omnisym</h1>
        <p className="text-sm font-medium text-indigo-400 mt-2 uppercase tracking-[0.2em]">Multi-modal AI Workspace</p>
      </motion.div>

      {/* Main Card / Controls */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm flex flex-col gap-4"
      >
        {savedUser && (
          <div className="p-4 rounded-2xl border border-indigo-900/50 bg-[#16161a] flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <img
                src={getUserAvatar(savedUser)}
                alt={getUserDisplayName(savedUser)}
                className="w-10 h-10 rounded-full border border-indigo-700 bg-white/5"
              />
              <div className="text-left">
                <p className="text-xs font-semibold text-white">Resume as {getUserDisplayName(savedUser)}</p>
              </div>
            </div>
            <button
              onClick={handleResumeSavedSession}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Resume
            </button>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isAuthenticating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-xl transition-all shadow-xl backdrop-blur-md disabled:opacity-50"
        >
          <Lock className="w-5 h-5 text-indigo-400" />
          <span>{isAuthenticating ? 'Authenticating...' : 'Sign in with Google'}</span>
        </button>

        <button
          onClick={handleStartGuestFlow}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-indigo-900/30"
        >
          <User className="w-5 h-5" />
          <span>Continue as Guest</span>
        </button>
      </motion.div>
      
      {/* Footer */}
      <div className="relative z-10 mt-12 text-xs text-indigo-500/50 font-mono">
        OMNISYM v3.6 · PRIVATE & SECURE
      </div>

      {/* Guest Name Prompt Modal */}
      <AnimatePresence>
        {showNamePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#16161a] rounded-3xl border border-indigo-900/50 p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-2">What's your name?</h3>
              <p className="text-indigo-300/70 text-sm mb-6">Personalise your workspace greeting.</p>
              
              <form onSubmit={handleConfirmGuestName} className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter your name..."
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-indigo-900 rounded-xl text-white placeholder:text-indigo-800"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  Enter Workspace
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
