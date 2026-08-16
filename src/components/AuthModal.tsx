import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, User, Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { PRESET_USERS } from '../data/constants';
import { UserProfile } from '../types';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectUser,
  onLogout,
}) => {
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (user: UserProfile) => {
    onSelectUser(user);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    onClose();
  };

  const handleGoogleAuth = () => {
    // Simulate standard Google OAuth SSO popup
    const googleUser: UserProfile = {
      id: `google_user_${Date.now()}`,
      name: 'Prabhjot Singh',
      email: 'prabhjot.singh@google.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      badge: 'Verified Google Account',
      isGuest: false,
    };
    handleSelect(googleUser);
  };

  const handleGuestContinue = () => {
    const guest = PRESET_USERS.find((u) => u.isGuest) || PRESET_USERS[2];
    handleSelect(guest);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newUser: UserProfile = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      email: customEmail.trim() || `${customName.toLowerCase().replace(/\s+/g, '')}@omnisym.ai`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customName)}`,
      badge: 'Custom Member',
      isGuest: false,
    };
    handleSelect(newUser);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          id="auth-modal"
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Welcome to Omnisym</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to sync your multi-modal intelligence, history & My Stuff
            </p>

            <button
              id="close-auth-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 pt-0 space-y-4">
            {/* Google OAuth Button */}
            <button
              type="button"
              id="google-oauth-btn"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-2xs transition-all active:scale-[0.99]"
            >
              {/* Google SVG Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Or select pre-saved profile
              </span>
            </div>

            {/* Pre-saved accounts */}
            <div className="space-y-2">
              {PRESET_USERS.map((user) => {
                const isActive = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    id={`profile-${user.id}`}
                    onClick={() => handleSelect(user)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                          {user.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {user.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </div>
                    </div>

                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Guest button, Custom toggle & Logout */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="continue-guest-btn"
                  onClick={handleGuestContinue}
                  className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Continue with Guest
                </button>
                {onLogout && (
                  <>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      id="modal-logout-btn"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingCustom(!isCreatingCustom)}
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {isCreatingCustom ? 'Hide custom' : '+ Custom Profile'}
              </button>
            </div>

            {/* Custom user form */}
            {isCreatingCustom && (
              <form onSubmit={handleCreateCustom} className="pt-2 border-t border-slate-100 space-y-2">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Prabhjot)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
                >
                  Create & Sign In <ArrowRight className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
