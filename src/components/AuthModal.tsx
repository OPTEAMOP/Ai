import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Crown, HardDrive, Sparkles, ArrowUpRight, Settings, CreditCard, LifeBuoy } from 'lucide-react';
import { UserProfile, UserSubscription } from '../types';
import confetti from 'canvas-confetti';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { logActivity } from '../lib/firestoreUtils';
import { getUserAvatar, getUserDisplayName } from '../utils/userUtils';

interface AuthModalProps {
  isOpen: boolean;
  currentUser?: UserProfile | null;
  subscription?: UserSubscription;
  onOpenSubscription?: () => void;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  subscription,
  onOpenSubscription,
  onClose,
  onSelectUser,
  onLogout,
}) => {
  const [customName, setCustomName] = useState(currentUser?.name || 'PRABHJOT SINGH');
  const [customEmail, setCustomEmail] = useState(currentUser?.email || 'apar123445@gmail.com');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (user: UserProfile) => {
    onSelectUser(user);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    setIsEditingProfile(false);
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const u = result.user;
        const profile: UserProfile = {
          id: u.uid,
          name: u.displayName || 'Omnisym User',
          displayName: u.displayName || 'Omnisym User',
          email: u.email || '',
          avatar: u.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(u.displayName || 'User')}`,
          photoURL: u.photoURL || undefined,
          isGuest: false,
        };
        handleSelect(profile);
      }
      onClose();
    } catch (error: any) {
      console.warn('Google sign-in popup notice:', error?.message || error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    setIsUpdating(true);

    const updatedUser: UserProfile = {
      id: currentUser?.id || 'user_' + Date.now().toString(36),
      name: customName.trim(),
      displayName: customName.trim(),
      email: customEmail.trim() || currentUser?.email || 'user@omnisym.local',
      avatar: currentUser?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(customName.trim())}`,
      photoURL: currentUser?.photoURL,
      isGuest: currentUser?.isGuest || false,
    };

    try {
      // Local Persistence
      localStorage.setItem('omnisym_user', JSON.stringify(updatedUser));
      
      // Activity Log (Firestore)
      logActivity(
        updatedUser.id || 'guest_user',
        updatedUser.email || 'guest@omnisym.local',
        updatedUser.isGuest ? 'guest_profile_update' : 'profile_update',
        {
          isGuest: !!updatedUser.isGuest,
          userName: updatedUser.name,
          details: `Updated name to "${updatedUser.name}"`,
        }
      ).catch(() => {});

      // Success Feedback
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
      handleSelect(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const userAvatar = getUserAvatar(currentUser);
  const userName = getUserDisplayName(currentUser);
  const userEmail = currentUser?.email || 'apar123445@gmail.com';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          id="auth-modal"
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button top-right for quick dismiss */}
          <button
            id="close-auth-btn"
            onClick={onClose}
            aria-label="Close Account Modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 🌟 HTML STRUCTURE */}
          <div className="omni-modal-container">
            
            {/* Profile Section */}
            <div className="omni-profile-header">
              <img 
                src={userAvatar} 
                alt="Profile" 
                className="avatar-circle shadow-lg border-2 border-white dark:border-zinc-800"
                style={{ 
                  width: '72px', 
                  height: '72px', 
                  objectFit: 'cover', 
                  borderRadius: '50%',
                  margin: '0 auto 16px auto',
                  display: 'block'
                }}
              />
              <h2 className="omni-user-name" style={{ textAlign: 'center' }}>{userName}</h2>
              <p className="omni-user-email" style={{ textAlign: 'center' }}>{userEmail}</p>

              {/* Active Plan Badge */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  subscription?.isPro
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <Crown className={`w-3.5 h-3.5 ${subscription?.isPro ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>
                    {subscription?.tier === 'student'
                      ? 'Student Pass (15GB Cloud)'
                      : subscription?.tier === 'creator'
                      ? 'Creator Pro (25GB Cloud)'
                      : subscription?.tier === 'flash'
                      ? 'Flash Pass (10GB Cloud)'
                      : 'Free Plan (1GB)'}
                  </span>
                </span>
              </div>
              
              {!isEditingProfile ? (
                <div className="flex flex-col gap-2 items-center w-full px-4">
                  <button
                    type="button"
                    id="omni-edit-account-btn"
                    onClick={() => {
                      setCustomName(userName);
                      setCustomEmail(userEmail);
                      setIsEditingProfile(true);
                    }}
                    className="omni-edit-btn hover:bg-[#F3F4F6]"
                  >
                    Edit Account Info
                  </button>

                  {onOpenSubscription && (
                    <button
                      type="button"
                      id="omni-manage-plan-btn"
                      onClick={() => {
                        onClose();
                        onOpenSubscription();
                      }}
                      className="w-full py-2 px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 hover:bg-[#F3F4F6] border border-indigo-100/80 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{subscription?.isPro ? 'Manage / Extend Subscription' : 'Upgrade to Pro (₹9/₹29/₹49)'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="mt-3 space-y-2 text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-400/20"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="Your Email"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? <Check className="w-3.5 h-3.5 animate-pulse" /> : <Check className="w-3.5 h-3.5" />} 
                      {isUpdating ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {updateSuccess && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-emerald-600 font-bold text-center mt-2"
                    >
                      ✓ Settings saved successfully
                    </motion.p>
                  )}
                </form>
              )}
            </div>

            <div className="omni-divider"></div>

            {/* Actions Section */}
            <div className="omni-action-list">
              
              {/* Try Instant Demo for new users */}
              <button
                type="button"
                onClick={() => {
                  handleSelect({
                    id: 'guest_' + Math.random().toString(36).substring(2, 9),
                    name: 'Guest User',
                    email: 'guest@omnisym.ai',
                    isGuest: true,
                    avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=Guest`,
                  });
                  onClose();
                }}
                className="omni-action-item bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 mb-2"
              >
                <Sparkles className="omni-icon text-indigo-600" />
                <span className="text-indigo-700 font-bold">Try Instant Demo (Guest)</span>
              </button>

              {/* Switch Identity */}
              <button
                type="button"
                id="omni-switch-identity-btn"
                onClick={handleGoogleAuth}
                className="omni-action-item"
              >
                <svg className="omni-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch Identity
              </button>

              {/* Connect Discord */}
              <a
                id="omni-discord-link"
                href="https://discord.gg/kbvYTvtqFv"
                target="_blank"
                rel="noopener noreferrer"
                className="omni-action-item omni-discord-item"
              >
                <svg className="omni-icon" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.08 0 72.37 72.37 0 0 0-3.38-6.83 105.15 105.15 0 0 0-26.23 8.07C3.4 29.09-3.3 54.45 1.09 81.18a105.43 105.43 0 0 0 32.14 16.14 75.35 75.35 0 0 0 6.89-11.2 68.3 68.3 0 0 1-10.85-5.18c.9-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.66 1.76 1.34 2.66 2a68.3 68.3 0 0 1-10.87 5.19 75.35 75.35 0 0 0 6.89 11.2 105.43 105.43 0 0 0 32.14-16.14c4.88-30.82-7.17-53.53-29.37-73.11ZM42.63 65.59c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Zm41.88 0c-6.19 0-11.31-5.71-11.31-12.72s5.04-12.72 11.31-12.72 11.39 5.71 11.31 12.72c0 7-5.04 12.72-11.31 12.72Z"/>
                </svg>
                Connect Discord
              </a>

              <div className="omni-divider"></div>

              {/* General Settings */}
              <button
                type="button"
                className="omni-action-item"
                onClick={() => {
                  setCustomName(userName);
                  setCustomEmail(userEmail);
                  setIsEditingProfile(true);
                }}
              >
                <Settings className="omni-icon" />
                General Settings
              </button>

              {/* Billing & Subscriptions */}
              <button
                type="button"
                className="omni-action-item"
                onClick={() => {
                  onClose();
                  if (onOpenSubscription) onOpenSubscription();
                }}
              >
                <CreditCard className="omni-icon" />
                Billing & Subscriptions
              </button>

              {/* Help & Support */}
              <a
                href="https://discord.gg/kbvYTvtqFv"
                target="_blank"
                rel="noopener noreferrer"
                className="omni-action-item"
              >
                <LifeBuoy className="omni-icon" />
                Help & Support
              </a>

            </div>

            <div className="omni-divider"></div>

            {/* Sign Out */}
            <div className="omni-action-list">
              <button
                type="button"
                id="omni-signout-btn"
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
                className="omni-action-item omni-signout-item"
              >
                <svg className="omni-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>

            {/* Footer / Privacy Policy */}
            <div className="omni-footer">
              <button 
                type="button" 
                onClick={() => setShowPolicyModal('privacy')} 
                className="omni-footer-link bg-transparent border-none p-0 inline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span style={{ color: '#d1d5db', margin: '0 8px' }}>•</span>
              <button 
                type="button" 
                onClick={() => setShowPolicyModal('terms')} 
                className="omni-footer-link bg-transparent border-none p-0 inline cursor-pointer"
              >
                Terms of Service
              </button>
            </div>

          </div>

          {/* Simple In-Modal Sheet for Privacy / Terms if clicked */}
          {showPolicyModal && (
            <div className="absolute inset-0 bg-white/98 rounded-[28px] p-6 z-20 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {showPolicyModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                  </h4>
                  <button
                    onClick={() => setShowPolicyModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 mt-3 space-y-2 leading-relaxed">
                  {showPolicyModal === 'privacy' ? (
                    <>
                      <p>Omnisym AI respects your privacy. All your prompts, local conversations, and images are stored securely on your browser or authenticated cloud database.</p>
                      <p>We do not sell personal identification data or conversation history to any third parties.</p>
                    </>
                  ) : (
                    <>
                      <p>By using Omnisym AI, you agree to generate safe, respectful content and adhere to applicable community guidelines.</p>
                      <p>Designed and created exclusively by Prabhjot Sandhu.</p>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPolicyModal(null)}
                className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Back to Account
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

