/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles } from 'lucide-react';
import {
  Message,
  ChatSession,
  UserProfile,
  SavedImage,
  SavedSnippet,
  SlashCommandType,
  GroundingCitation,
  ToastNotification,
} from './types';
import { exportSessionToPdf } from './utils/pdfExport';
import { detectSessionCategory } from './utils/categorizer';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ThinkingAnimation } from './components/ThinkingAnimation';
import { TypingAnimation } from './components/TypingAnimation';
import { FeedbackModal } from './components/FeedbackModal';
import { MyStuffModal } from './components/MyStuffModal';
import { TemplateLibrary } from './components/TemplateLibrary';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { LiveSandboxModal } from './components/LiveSandboxModal';
import { WelcomeProModal } from './components/WelcomeProModal';
import { PublicSharedChatView } from './components/PublicSharedChatView';
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer } from './components/Toast';
import { auth, onAuthStateChanged, signOut } from './lib/firebase';
import {
  getLocalSubscription,
  saveLocalSubscription,
  saveTransactionToHistory,
  clearPersistentOrderId,
  STORAGE_KEY_PRO_TIER,
  STORAGE_KEY_SUBSCRIPTION,
  STORAGE_KEY_USER_TIER,
  STORAGE_KEY_PENDING_ORDER_ID,
  STORAGE_KEY_PENDING_ORDER_TS,
  ORDER_EXPIRY_MS,
  UPI_CONFIG,
  SUBSCRIPTION_PLANS,
} from './data/subscriptionPlans';
import { UserSubscription, SubscriptionTier } from './types';
import {
  saveSessionToCloud,
  deleteSessionFromCloud,
  loadSessionsFromCloud,
  saveImageToCloud,
  loadImagesFromCloud,
  saveSnippetToCloud,
  loadSnippetsFromCloud,
  getPublicShareFromCloud,
  syncUserProfile,
  logActivity,
  isCloudSyncPaused,
} from './lib/firestoreUtils';
import { PublicShareData } from './types';
import { getUserAvatar, getUserDisplayName } from './utils/userUtils';
import { processImagePrompt } from './utils/imagePromptEngine';
import { AdminDashboard } from './components/AdminDashboard';

import { PaymentVerification } from './components/PaymentFlow';
import { PrivacyPolicy, TermsConditions } from './components/LegalPages';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  triggerConfetti,
  triggerMilestoneCelebration,
  triggerRoastFlames,
  triggerFlipEffect,
  triggerCreatorGoldBurst,
} from './utils/confetti';
import { checkEasterEgg } from './utils/easterEggs';
import { 
  safeLocalStorageGet, 
  safeLocalStorageSet, 
  safeLocalStorageRemove,
  safeJsonParse
} from './utils/storageUtils';

const STORAGE_KEY_SESSIONS = 'omnisym_sessions_v1';
const STORAGE_KEY_IMAGES = 'omnisym_saved_images_v1';
const STORAGE_KEY_SNIPPETS = 'omnisym_saved_snippets_v1';
const STORAGE_KEY_MEMORIES = 'omnisym_user_memories_v1';

const DEFAULT_MEMORIES = [
  'User appreciates clean modular TypeScript architecture',
  'User prefers concise, high-contrast, structured explanations',
];

// Exponential Backoff Retry utility for API calls
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || String(err);
      const isRateLimit = 
        errMsg.includes('429') || 
        errMsg.includes('RESOURCE_EXHAUSTED') || 
        errMsg.includes('quota') ||
        errMsg.includes('rate limit');
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Retry] API rate limit hit. Retrying attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

let on403Error: (() => void) | null = null;

/**
 * Safely performs API POST requests, ensuring non-JSON responses (e.g. HTML 404/500)
 * are cleanly handled without throwing unexpected token syntax errors.
 */
async function safeApiPost<T>(url: string, body: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 403) {
    localStorage.clear();
    sessionStorage.clear();
    if (on403Error) {
        on403Error();
    }
    window.location.href = '/login';
    throw new Error('403 Forbidden');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    throw new Error(
      `Server responded with ${response.status} (${response.statusText || 'Unexpected format'}): ${rawText.slice(0, 150)}`
    );
  }

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export default function App() {
  const [isInitialising, setIsInitialising] = useState(true);
  // Auth state
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Fallback guest login handler for public links & personalized guest sessions
  const handleDirectGuestLogin = (customName?: string) => {
    const finalName = customName?.trim() || 'Guest';
    const guestUser: UserProfile = {
      id: generateUniqueId('guest'),
      name: finalName,
      displayName: finalName,
      email: `guest@omnisym.ai`,
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(finalName)}`,
      badge: 'Guest Member',
      isGuest: true,
      createdAt: Date.now()
    };
    try {
      safeLocalStorageSet('omnisym_user', guestUser);
    } catch (e) {
      console.warn('LocalStorage error saving guest user:', e);
    }
    setCurrentUser(guestUser);
    setIsAuthenticated(true);
    setIsAuthLoading(false);
  };

  useEffect(() => {
    // Safety timeout to prevent getting stuck in loading state on public shares
    const authTimeout = setTimeout(() => {
      setIsAuthLoading((prev) => {
        if (prev) {
          const cachedUser = safeLocalStorageGet<UserProfile | null>('omnisym_user', null);
          if (cachedUser) {
            setCurrentUser(cachedUser);
            setIsAuthenticated(true);
          }
          return false;
        }
        return false;
      });
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // We don't clear the timeout immediately, we let it run as a second safety layer
      // unless we successfully reach the end of this callback.
      
      if (user) {
        const initialProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || 'Guest User',
          email: user.email || 'guest@omnisym.local',
          avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          photoURL: user.photoURL || undefined,
          isGuest: user.isAnonymous,
        };

        try {
          // Sync profile with Firestore (preserves role, status, and subscription)
          const syncedProfile = await syncUserProfile(initialProfile);
          
          if (syncedProfile.status === 'banned') {
            await signOut(auth);
            localStorage.removeItem('omnisym_user');
            setCurrentUser(null);
            setIsAuthenticated(false);
            alert('Your account has been suspended by an administrator.');
            clearTimeout(authTimeout);
            setIsAuthLoading(false);
            return;
          }

          // CRITICAL: Pull premium status directly from the database record (Cross-device fix)
          if (syncedProfile.subscription) {
            setSubscription(syncedProfile.subscription);
            saveLocalSubscription(syncedProfile.subscription);
          }

          // Log login activity (non-blocking)
          logActivity(user.uid, user.email || 'unknown', 'email_login', {
            isGuest: false,
            userName: user.displayName || 'Omnisym User',
            details: 'Securely logged in via Cloud Auth',
          }).catch(() => {});

          setIsAuthenticated(true);
          setCurrentUser(syncedProfile);
          safeLocalStorageSet('omnisym_user', syncedProfile);
        } catch (err) {
          console.error('Profile sync failed:', err);
          setIsAuthenticated(true);
          setCurrentUser(initialProfile);
        }
      } else {
        // Check if there is an active local guest user or a real user session
        const cachedUser = safeLocalStorageGet<UserProfile | null>('omnisym_user', null);
        if (cachedUser) {
          setCurrentUser(cachedUser);
          setIsAuthenticated(true);
          
          clearTimeout(authTimeout);
          setIsAuthLoading(false);

          // Log session visit
          if (!sessionStorage.getItem('omnisym_session_logged')) {
            try {
              sessionStorage.setItem('omnisym_session_logged', '1');
            } catch (e) {}
            logActivity(
              cachedUser.id || 'anon',
              cachedUser.email || 'unknown',
              cachedUser.isGuest ? 'guest_visit' : 'email_visit',
              { isGuest: !!cachedUser.isGuest, userName: cachedUser.name || 'User', details: 'User opened workspace' }
            ).catch(() => {});
          }
          return;
        }
        
        // NO USER FOUND: Auto-login as Guest (Taste-First Landing Showcase)
        // This eliminates the forced login wall for new visitors
        handleDirectGuestLogin();
      }
      
      // Successfully processed auth state, safe to hide loader
      clearTimeout(authTimeout);
      setIsAuthLoading(false);
    });
    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Hide boot screen after auth and data is stabilized
    if (!isAuthLoading) {
      setIsInitialising(false);
    }
  }, [isAuthLoading]);

  // Sessions state with local storage hydration
  const [sessions, setSessions] = useState<ChatSession[]>(() => 
    safeLocalStorageGet<ChatSession[]>(STORAGE_KEY_SESSIONS, [])
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<SlashCommandType | 'default'>('default');

  // "My Stuff" state with local storage hydration
  const [savedImages, setSavedImages] = useState<SavedImage[]>(() => 
    safeLocalStorageGet<SavedImage[]>(STORAGE_KEY_IMAGES, [])
  );
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>(() => 
    safeLocalStorageGet<SavedSnippet[]>(STORAGE_KEY_SNIPPETS, [])
  );

  // Continuous Learning & Memory State
  const [userMemories, setUserMemories] = useState<string[]>(() => 
    safeLocalStorageGet<string[]>(STORAGE_KEY_MEMORIES, DEFAULT_MEMORIES)
  );

  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Easter Egg & Animation Interactive States
  const [isFlippingScreen, setIsFlippingScreen] = useState(false);
  const [isMatrixMode, setIsMatrixMode] = useState(false);

  // Standalone Routing State for Legal and Payment Verification
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Sync with cloud on auth change (strictly when Firebase Auth currentUser is present)
  useEffect(() => {
    if (currentUser && !currentUser.isGuest && auth.currentUser && auth.currentUser.uid === currentUser.id) {
      Promise.all([
        loadSessionsFromCloud(currentUser.id),
        loadImagesFromCloud(currentUser.id),
        loadSnippetsFromCloud(currentUser.id),
      ]).then(([cloudSessions, cloudImages, cloudSnippets]) => {
        if (cloudSessions && cloudSessions.length > 0) {
          const autoCategorizedSessions = cloudSessions.map((s) => {
            if (!s.category && s.messages && s.messages.length > 0) {
              const firstUserMsg = s.messages.find((m) => m.role === 'user');
              const firstAiMsg = s.messages.find((m) => m.role === 'assistant');
              if (firstUserMsg) {
                const intent = detectSessionCategory({
                  text: firstUserMsg.text,
                  mode: s.mode,
                  assistantText: firstAiMsg?.text,
                  hasImageAttachment: !!firstUserMsg.imageAttachment,
                });
                return { ...s, category: intent.category, tags: intent.tags };
              }
            }
            return s;
          });

          // Deduplicate sessions before setting state to prevent key collisions
          // Robustly deduplicate sessions from cloud to prevent key collisions
          setSessions((prev) => {
            const existingIds = new Set(prev.map(s => s.id));
            const uniqueNewSessions: ChatSession[] = [];
            const seenNewIds = new Set<string>();

            for (const s of autoCategorizedSessions) {
              if (!existingIds.has(s.id) && !seenNewIds.has(s.id)) {
                uniqueNewSessions.push(s);
                seenNewIds.add(s.id);
              }
            }

            return [...uniqueNewSessions, ...prev];
          });
        }
        if (cloudImages && cloudImages.length > 0) {
          setSavedImages((prev) => {
            const existingUrls = new Set(prev.map(i => i.url));
            const uniqueNew = cloudImages.filter(i => !existingUrls.has(i.url));
            // Further deduplicate within cloudImages itself
            const internalUnique = Array.from(new Map(uniqueNew.map(i => [i.url, i])).values());
            return [...internalUnique, ...prev];
          });
        }
        if (cloudSnippets && cloudSnippets.length > 0) {
          setSavedSnippets((prev) => {
            const existingKeys = new Set(prev.map(s => s.code));
            const uniqueNew = cloudSnippets.filter(s => !existingKeys.has(s.code));
            // Further deduplicate within cloudSnippets itself
            const internalUnique = Array.from(new Map(uniqueNew.map(s => [s.code, s])).values());
            return [...internalUnique, ...prev];
          });
        }
      }).catch((e) => console.warn("Cloud data sync notice:", e));
    }
  }, [currentUser]);

  const [learnedMemoryNotification, setLearnedMemoryNotification] = useState<string | null>(null);

  // UI Modals & Panels
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [myStuffModalOpen, setMyStuffModalOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Subscription & Pro Tier State
  const [subscription, setSubscription] = useState<UserSubscription>(() => getLocalSubscription());
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionInitialTier, setSubscriptionInitialTier] = useState<SubscriptionTier | undefined>(undefined);
  const [welcomeProModalOpen, setWelcomeProModalOpen] = useState(false);

  // Multi-Tab Subscription Sync: Updates subscription state across all open tabs
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_PRO_TIER ||
        e.key === STORAGE_KEY_SUBSCRIPTION ||
        e.key === STORAGE_KEY_USER_TIER
      ) {
        const freshSub = getLocalSubscription();
        setSubscription(freshSub);
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / for Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      }
      
      // Cmd/Ctrl + B for Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }

      // Cmd/Ctrl + N for New Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }

      // Cmd/Ctrl + K for Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-session-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Cmd/Ctrl + L for Focus Chat Input
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        const chatInput = document.getElementById('chat-textarea');
        if (chatInput) {
          chatInput.focus();
        }
      }

      // Cmd/Ctrl + U for Upload
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        const fileInput = document.getElementById('chat-file-input');
        if (fileInput) {
          fileInput.click();
        }
      }

      // Esc to close all modals
      if (e.key === 'Escape') {
        setShortcutsModalOpen(false);
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        setMyStuffModalOpen(false);
        setTemplateLibraryOpen(false);
        setAuthModalOpen(false);
        setShareModalOpen(false);
        setSubscriptionModalOpen(false);
        setIsAdminDashboardOpen(false);
        setLegalView(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSessionId, currentUser]);

  // Session Recovery on Re-entry: If a pending order ID exists within 20 mins, check backend
  useEffect(() => {
    const checkPendingOrderRecovery = async () => {
      try {
        const pendingOrderId = safeLocalStorageGet<string | null>(STORAGE_KEY_PENDING_ORDER_ID, null);
        const pendingOrderTs = safeLocalStorageGet<string | null>(STORAGE_KEY_PENDING_ORDER_TS, null);

        if (!pendingOrderId || !pendingOrderTs) return;

        const timestamp = parseInt(pendingOrderTs, 10);
        const now = Date.now();

        // Must be within 20-minute freshness window
        if (now - timestamp > ORDER_EXPIRY_MS) {
          clearPersistentOrderId();
          return;
        }

        // Only check if current subscription is not already pro
        const currentSub = getLocalSubscription();
        if (currentSub.isPro) {
          clearPersistentOrderId();
          return;
        }

        const endpoint = `${UPI_CONFIG.apiEndpoint}?orderId=${encodeURIComponent(pendingOrderId)}`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (
            data &&
            (data.status === 'SUCCESS' || data.status === 'VERIFIED') &&
            (data.paid === true || data.verified === true)
          ) {
            // Determine matching tier from data or fallback to flash
            const matchedTier = (data.tier && SUBSCRIPTION_PLANS[data.tier as keyof typeof SUBSCRIPTION_PLANS])
              ? data.tier
              : (Object.values(SUBSCRIPTION_PLANS).find((p) => p.price === data.amount)?.id || 'flash');
            const planDef = SUBSCRIPTION_PLANS[matchedTier as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.flash;

            const expiresAt = now + planDef.validityDays * 24 * 60 * 60 * 1000;
            const cleanUtr = data.utr || data.refId || pendingOrderId;

            const recoveredSub: UserSubscription = {
              isPro: true,
              tier: planDef.id,
              planName: planDef.name,
              badge: planDef.badge,
              price: planDef.price,
              currency: 'INR',
              validityDays: planDef.validityDays,
              activatedAt: now,
              expiresAt: expiresAt,
              utr: cleanUtr,
              storageLimitGB: planDef.storageGB,
            };

            saveLocalSubscription(recoveredSub);
            saveTransactionToHistory({
              orderId: cleanUtr,
              tier: planDef.id,
              planName: planDef.name,
              price: planDef.price,
              activatedAt: now,
            });
            clearPersistentOrderId();
            setSubscription(recoveredSub);
            setWelcomeProModalOpen(true);
            triggerConfetti();
            addToast({
              type: 'cloud',
              title: '👑 Pro Plan Recovered!',
              description: `Payment for Omnisym ${planDef.name} was verified and activated.`,
            });
          }
        }
      } catch (err) {
        console.warn('Session recovery check error:', err);
      }
    };

    checkPendingOrderRecovery();
  }, []);

  // Check if first-time pro user needs to see celebration modal
  useEffect(() => {
    const tierData = safeLocalStorageGet<any>('omnisym_user_tier', null);
    if (tierData?.isPro && tierData?.hasSeenWelcome === false) {
      setWelcomeProModalOpen(true);
    }
  }, []);

  // Creator Live Sandbox State
  const [liveSandboxOpen, setLiveSandboxOpen] = useState(false);
  const [sandboxInitialCode, setSandboxInitialCode] = useState<{ html?: string; css?: string; js?: string }>({});

  const handleOpenSubscription = (tier?: SubscriptionTier) => {
    setSubscriptionInitialTier(tier);
    setSubscriptionModalOpen(true);
  };

  const handleStartPaymentVerification = () => {
    setSubscriptionModalOpen(false);
    setIsVerifyingPayment(true);
  };

  const handlePaymentVerified = () => {
    setIsVerifyingPayment(false);
  };

  const handleOpenLiveSandbox = (initialCode?: { html?: string; css?: string; js?: string }) => {
    if (initialCode) {
      setSandboxInitialCode(initialCode);
    }
    setLiveSandboxOpen(true);
  };

  const handleSubscriptionSuccess = (updated: UserSubscription) => {
    setSubscription(updated);
    saveLocalSubscription(updated);
    setSubscriptionModalOpen(false);
    setWelcomeProModalOpen(true);
    addToast({
      type: 'cloud',
      title: '👑 Pro Plan Activated!',
      description: `Omnisym ${updated.tier.toUpperCase()} Pass is now live with enhanced cloud storage!`,
    });
  };

  const [darkMode, setDarkMode] = useState(() => {
    return safeLocalStorageGet<string | null>('omnisym_theme', null) === 'dark';
  });

  // Public Share URL handling (?share=<shareId>)
  const [publicShareId, setPublicShareId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('share');
    } catch {
      return null;
    }
  });
  const [publicShareData, setPublicShareData] = useState<PublicShareData | null>(null);
  const [isLoadingPublicShare, setIsLoadingPublicShare] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return !!params.get('share');
    } catch {
      return false;
    }
  });
  const [publicShareError, setPublicShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicShareId) return;
    setIsLoadingPublicShare(true);
    setPublicShareError(null);
    getPublicShareFromCloud(publicShareId)
      .then((data) => {
        if (data) {
          setPublicShareData(data);
        } else {
          setPublicShareError('This shared conversation was not found or has expired.');
        }
      })
      .catch((err) => {
        console.error('Error fetching public share:', err);
        setPublicShareError('Unable to load shared conversation.');
      })
      .finally(() => {
        setIsLoadingPublicShare(false);
      });
  }, [publicShareId]);

  // Keep dark mode synced with HTML class and data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      safeLocalStorageSet('omnisym_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      safeLocalStorageSet('omnisym_theme', 'light');
    }
  }, [darkMode]);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    messageId: string;
    promptSnippet: string;
    aiResponseSnippet: string;
  }>({
    isOpen: false,
    messageId: '',
    promptSnippet: '',
    aiResponseSnippet: '',
  });

  // Loading & Thinking states
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [initialInputPrompt, setInitialInputPrompt] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev.slice(-3), newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    on403Error = () => {
      addToast({
        type: 'error',
        title: 'Session expired',
        description: 'Please log in again.'
      });
    };
    return () => { on403Error = null; };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist sessions to LocalStorage and Cloud (if authenticated)
  useEffect(() => {
    try {
      const persistableSessions = sessions.filter((s) => !s.isTemp);
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(persistableSessions));
    } catch (e) {
      console.warn('LocalStorage sessions save error:', e);
    }

    if (!currentUser || currentUser.isGuest || !auth.currentUser || auth.currentUser.uid !== currentUser.id || isCloudSyncPaused()) return;
    try {
      const persistableSessions = sessions.filter((s) => !s.isTemp);
      persistableSessions.forEach((session) => {
        saveSessionToCloud(currentUser.id, session).catch((e) => console.warn('Cloud sync session notice:', e));
      });
    } catch (e) {
      console.warn('Sync error:', e);
    }
  }, [sessions, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(savedImages));
    } catch (e) {
      console.warn('LocalStorage images save error:', e);
    }

    if (!currentUser || currentUser.isGuest || !auth.currentUser || auth.currentUser.uid !== currentUser.id || isCloudSyncPaused()) return;
    try {
      savedImages.forEach((img) => {
        saveImageToCloud(currentUser.id, img).catch((e) => console.warn('Cloud sync image notice:', e));
      });
    } catch (e) {
      console.warn('Sync images error:', e);
    }
  }, [savedImages, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SNIPPETS, JSON.stringify(savedSnippets));
    } catch (e) {
      console.warn('LocalStorage snippets save error:', e);
    }

    if (!currentUser || currentUser.isGuest || !auth.currentUser || auth.currentUser.uid !== currentUser.id || isCloudSyncPaused()) return;
    try {
      savedSnippets.forEach((snippet) => {
        saveSnippetToCloud(currentUser.id, snippet).catch((e) => console.warn('Cloud sync snippet notice:', e));
      });
    } catch (e) {
      console.warn('Sync snippets error:', e);
    }
  }, [savedSnippets, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(userMemories));
    } catch (e) {
      console.warn('LocalStorage memories error:', e);
    }
  }, [userMemories]);

  // Memory management actions
  const handleAddMemory = (memory: string) => {
    if (!memory || userMemories.includes(memory)) return;
    setUserMemories((prev) => [memory, ...prev]);
  };

  const handleDeleteMemory = (index: number) => {
    setUserMemories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearMemories = () => {
    setUserMemories([]);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId, isLoading, isThinking]);

  // Current session finder
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  // Global Keyboard Shortcuts: Cmd/Ctrl + K (Focus input), Cmd/Ctrl + N (New conversation)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus chat input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const textarea = document.getElementById('chat-textarea') as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
      }

      // Cmd/Ctrl + N: Start new conversation
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
        setTimeout(() => {
          const textarea = document.getElementById('chat-textarea') as HTMLTextAreaElement | null;
          textarea?.focus();
        }, 50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Session Actions
  const handleNewChat = (mode: SlashCommandType | 'default' = 'default') => {
    const isTemp = mode === 'temp';
    const newSession: ChatSession = {
      id: generateUniqueId('session'),
      title: isTemp ? 'Incognito Session' : 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      isTemp,
      mode,
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveMode(mode);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
    if (currentUser) {
      deleteSessionFromCloud(id).catch(e => console.error(e));
    }
  };

  const handleTogglePinSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
    );
  };

  const handleToggleStarSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  };

  const handleToggleArchiveSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const isNowArchived = !s.isArchived;
          const updated = { ...s, isArchived: isNowArchived };
          if (currentUser && !currentUser.isGuest && !isCloudSyncPaused()) {
            saveSessionToCloud(currentUser.id, updated).catch(console.error);
          }
          return updated;
        }
        return s;
      })
    );
    addToast({
      type: 'info',
      title: 'Session Updated',
      description: 'Archived status updated.',
    });
  };

  const handleToggleReadOnlySession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const isNowReadOnly = !s.isReadOnly;
          const updated = { ...s, isReadOnly: isNowReadOnly };
          if (currentUser && !currentUser.isGuest && !isCloudSyncPaused()) {
            saveSessionToCloud(currentUser.id, updated).catch(console.error);
          }
          return updated;
        }
        return s;
      })
    );
    addToast({
      type: 'info',
      title: 'Read-Only Mode',
      description: 'Conversation read-only status updated.',
    });
  };

  // Auto-archive inactive sessions older than 30 days (unless pinned or temp)
  useEffect(() => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    setSessions((prev) => {
      let hasChanges = false;
      const updated = prev.map((session) => {
        if (session.isPinned || session.isTemp || session.isArchived) {
          return session;
        }
        const lastActive = session.updatedAt || session.createdAt || 0;
        if (now - lastActive >= THIRTY_DAYS_MS) {
          hasChanges = true;
          return { ...session, isArchived: true };
        }
        return session;
      });
      return hasChanges ? updated : prev;
    });
  }, []);

  const handleReorderSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(newSessions));
    } catch (e) {
      console.warn('LocalStorage save error on reorder:', e);
    }
  };

  const handleClearCurrentSession = () => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s))
    );
  };

  const handleExportSession = () => {
    if (!currentSession) return;
    const transcript = currentSession.messages
      .map((m) => `[${m.role.toUpperCase()}]: ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(transcript);
  };

  const handleForkPublicSession = (shareData: PublicShareData) => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setPublicShareId(null);
    setPublicShareData(null);
    setPublicShareError(null);

    const forkedSession: ChatSession = {
      id: generateUniqueId('session_fork'),
      title: `${shareData.title} (Shared)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: shareData.messages.map((m) => ({
        ...m,
        id: generateUniqueId('msg_fork'),
      })),
      category: shareData.category,
      tags: shareData.tags,
    };

    setSessions((prev) => [forkedSession, ...prev]);
    setCurrentSessionId(forkedSession.id);

    addToast({
      type: 'success',
      title: 'Shared Conversation Forked',
      description: 'You can now continue prompting and chatting in this session.',
    });
  };

  const handleGoToHomeApp = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setPublicShareId(null);
    setPublicShareData(null);
    setPublicShareError(null);
  };

  const handleDownloadPdf = () => {
    if (!currentSession || currentSession.messages.length === 0) return;
    exportSessionToPdf(currentSession, currentUser.displayName || currentUser.name || 'User');
  };

  // Like / Dislike Handlers
  const handleLikeMessage = (messageId: string) => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId
              ? { ...m, reaction: m.reaction === 'like' ? null : 'like' }
              : m
          ),
        };
      })
    );
  };

  const handleDislikeMessage = (messageId: string) => {
    if (!currentSession) return;
    const msg = currentSession.messages.find((m) => m.id === messageId);
    const prevUserMsg = currentSession.messages
      .slice(0, currentSession.messages.indexOf(msg as any))
      .reverse()
      .find((m) => m.role === 'user');

    // Update reaction state to dislike
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, reaction: 'dislike' } : m
          ),
        };
      })
    );

    // Open feedback modal
    setFeedbackModal({
      isOpen: true,
      messageId,
      promptSnippet: prevUserMsg?.text || 'Prompt snippet',
      aiResponseSnippet: msg?.text || '',
    });
  };

  const handleFeedbackSubmittedSuccess = (messageId: string) => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, feedbackSubmitted: true } : m
          ),
        };
      })
    );
  };

  // "My Stuff" repository actions
  const handleSaveImage = (img: SavedImage) => {
    if (savedImages.some((i) => i.url === img.url)) return;
    setSavedImages((prev) => [img, ...prev]);
    addToast({
      type: 'cloud',
      title: 'Image Synced to Cloud',
      description: `Saved "${img.prompt.slice(0, 28)}..." to My Stuff.`,
    });
  };

  const handleDeleteSavedImage = (id: string) => {
    setSavedImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveSnippet = (snip: SavedSnippet) => {
    setSavedSnippets((prev) => [snip, ...prev]);
    addToast({
      type: 'cloud',
      title: 'Snippet Synced to Cloud',
      description: `Saved "${snip.title || snip.language}" snippet successfully.`,
    });
  };

  const handleDeleteSavedSnippet = (id: string) => {
    setSavedSnippets((prev) => prev.filter((s) => s.id !== id));
  };

  const generateUniqueId = (prefix: string) => 
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Send Message Logic (Multi-Agent Routing)
  const handleSendMessage = async (
    text: string,
    imageAttachment?: { dataUrl: string; mimeType: string; name?: string },
    options?: {
      mode?: SlashCommandType | 'default';
      aspectRatio?: string;
      imageSize?: string;
      thinking?: boolean;
    }
  ) => {
    const finalMode = options?.mode || activeMode || 'default';
    const isTemp = finalMode === 'temp';

    // Ensure session exists
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: generateUniqueId('session'),
        title: text.slice(0, 32) || 'Image Analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        isTemp,
        mode: finalMode,
      };
      setSessions((prev) => [newSession, ...prev]);
      activeSessionId = newSession.id;
      setCurrentSessionId(activeSessionId);
    }

    const userMessage: Message = {
      id: generateUniqueId('msg_user'),
      role: 'user',
      text,
      timestamp: Date.now(),
      imageAttachment,
      mode: finalMode,
    };

    const isImageRequest =
      finalMode === '3d' && text.toLowerCase().includes('generate') ||
      text.toLowerCase().includes('generate image') ||
      text.toLowerCase().includes('create image') ||
      text.toLowerCase().includes('draw ');

    if (isImageRequest) {
      setIsGeneratingImage(true);
    }

    const initialIntent = detectSessionCategory({
      text,
      mode: finalMode,
      hasImageAttachment: !!imageAttachment,
      isImageGen: isImageRequest,
    });

    // Instant Loading / Thinking State
    setIsLoading(true);
    setIsThinking(true);

    // Log Activity for both registered email users and guest sessions
    const activeUserId = currentUser?.id || `guest_${activeSessionId.substring(0, 10)}`;
    const activeUserEmail = currentUser && !currentUser.isGuest ? currentUser.email : (currentUser?.email || 'guest@omnisym.local');
    const activeUserName = currentUser?.displayName || currentUser?.name || 'Guest User';
    const isGuestUser = !currentUser || currentUser.isGuest || !auth.currentUser;

    // GUEST LIMIT CHECK (5 Prompts Max)
    if (isGuestUser) {
      const guestPrompts = parseInt(safeLocalStorageGet<string>('omnisym_guest_prompts', '0'));
      if (guestPrompts >= 5) {
        addToast({
          type: 'info',
          title: 'Guest Limit Reached',
          description: 'Sign in to unlock unlimited high-speed prompts & cloud sync.'
        });
        setAuthModalOpen(true);
        return;
      }
      safeLocalStorageSet('omnisym_guest_prompts', (guestPrompts + 1).toString());
    }

    const actionType = isImageRequest 
      ? 'image_gen' 
      : finalMode === 'roast' 
      ? 'roast_chat' 
      : finalMode !== 'default' 
      ? `slash_${finalMode}` 
      : 'chat_message';

    logActivity(activeUserId, activeUserEmail, actionType, {
      isGuest: isGuestUser,
      userName: activeUserName,
      details: text.slice(0, 70),
    }).catch(() => {});

    // Add user message to session
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const updatedTitle =
          s.messages.length === 0 ? text.slice(0, 36) || 'New Conversation' : s.title;
        return {
          ...s,
          title: updatedTitle,
          updatedAt: Date.now(),
          category: s.category || initialIntent.category,
          tags: s.tags && s.tags.length > 0 ? s.tags : initialIntent.tags,
          messages: [...s.messages, userMessage],
        };
      })
    );

    // Trigger immediate smooth auto-scroll to reveal thinking state
    setTimeout(() => {
      scrollToBottom();
    }, 20);

    // Easter Egg & Special Animation Triggers
    const easterEgg = checkEasterEgg(text);
    if (easterEgg.isEasterEgg) {
      if (easterEgg.type === 'flip') {
        setIsFlippingScreen(true);
        triggerFlipEffect();
        setTimeout(() => setIsFlippingScreen(false), 1300);
      } else if (easterEgg.type === 'matrix') {
        setIsMatrixMode(true);
        setTimeout(() => setIsMatrixMode(false), 5500);
      } else if (easterEgg.type === 'party') {
        triggerMilestoneCelebration();
      } else if (easterEgg.type === 'creator') {
        triggerCreatorGoldBurst();
      } else if (easterEgg.type === 'roast') {
        triggerRoastFlames();
      }
    } else if (finalMode === 'roast' || text.toLowerCase().includes('/roast') || text.toLowerCase().includes('roast me')) {
      triggerRoastFlames();
    }

    // Milestone Celebration Tracking
    const totalUserMsgCount = sessions.reduce((acc, s) => acc + s.messages.filter(m => m.role === 'user').length, 0) + 1;
    if ([5, 10, 25, 50, 100].includes(totalUserMsgCount)) {
      setTimeout(() => {
        triggerMilestoneCelebration();
        addToast({
          type: 'cloud',
          title: `🎉 Milestone Achieved: ${totalUserMsgCount} Chats!`,
          description: 'Omnisym level pro status unlocked!',
        });
      }, 750);
    }

    // Instant Easter Egg Custom Response Shortcut (snappy feedback)
    if (easterEgg.isEasterEgg && easterEgg.customResponse && !imageAttachment) {
      setTimeout(() => {
        const aiMessage: Message = {
          id: generateUniqueId('msg_ai'),
          role: 'assistant',
          text: easterEgg.customResponse!,
          timestamp: Date.now(),
          mode: finalMode,
          status: 'done',
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  updatedAt: Date.now(),
                  messages: [...s.messages, aiMessage],
                }
              : s
          )
        );
        setIsLoading(false);
        setIsThinking(false);
      }, 450);
      return;
    }

    try {
      // 1. Direct Image Generation Route
      if (isImageRequest && !imageAttachment) {
        // Apply Omnisym Image Prompt Intelligence
        const processed = processImagePrompt(text);
        const finalPrompt = processed.prompt;
        const finalAspectRatio = processed.aspectRatio;

        const imageData = await withRetry(async () => {
          return await safeApiPost<{ imageUrl: string; description?: string }>('/api/generate-image', {
            prompt: finalPrompt,
            aspectRatio: finalAspectRatio,
            imageSize: options?.imageSize || '1K',
          });
        });

        const aiMessage: Message = {
          id: generateUniqueId('msg_ai'),
          role: 'assistant',
          text: imageData.description || `I've generated this visual asset for you: "${finalPrompt}"`,
          timestamp: Date.now(),
          generatedImage: {
            url: imageData.imageUrl,
            prompt: finalPrompt,
            aspectRatio: finalAspectRatio,
            imageSize: options?.imageSize || '1K',
          },
          mode: finalMode,
          status: 'done',
        };

        const imgIntent = detectSessionCategory({
          text,
          mode: finalMode,
          assistantText: imageData.description,
          hasImageAttachment: false,
          isImageGen: true,
        });

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  category: imgIntent.category,
                  tags: imgIntent.tags,
                  updatedAt: Date.now(),
                  messages: [...s.messages, aiMessage],
                }
              : s
          )
        );

        if (currentUser && !currentUser.isGuest) {
          addToast({
            type: 'cloud',
            title: 'Image Synced with Cloud',
            description: 'Asset saved and synced to your cloud history.',
          });
        }
      } else {
        // 2. Chat / Reasoning / Vision / Search Grounding Route
        const historyTurns = currentSession
          ? currentSession.messages
              .filter((m) => m.status !== 'error')
              .map((m) => ({ role: m.role, text: m.text }))
              .slice(-10)
          : [];

        const chatData = await withRetry(async () => {
          return await safeApiPost<{
            text: string;
            model?: string;
            citations?: GroundingCitation[];
            triggeredImagePrompt?: string;
            newMemories?: string[];
          }>('/api/chat', {
            prompt: text,
            mode: finalMode,
            history: historyTurns,
            imageBase64: imageAttachment?.dataUrl,
            imageMimeType: imageAttachment?.mimeType,
            useSearch: finalMode === 'research',
            thinking: options?.thinking || finalMode === 'code',
            userName: currentUser ? (currentUser.displayName || currentUser.name || 'User') : 'User',
            memories: userMemories,
          });
        });

        // Process continuous learning memory capture
        if (
          Array.isArray(chatData.newMemories) &&
          chatData.newMemories.length > 0 &&
          finalMode !== 'temp'
        ) {
          setUserMemories((prev) => {
            const next = [...prev];
            for (const mem of chatData.newMemories) {
              if (!next.includes(mem)) {
                next.unshift(mem);
              }
            }
            return next;
          });
          setLearnedMemoryNotification(chatData.newMemories[0]);
          setTimeout(() => setLearnedMemoryNotification(null), 4500);
        }

        let generatedImagePayload = undefined;

        // If backend returned a triggered image prompt, generate image seamlessly
        if (chatData.triggeredImagePrompt) {
          try {
            // Apply intelligence to triggered prompts too
            const processedTriggered = processImagePrompt(chatData.triggeredImagePrompt);

            const imgResData = await withRetry(async () => {
              return await safeApiPost<{ imageUrl: string }>('/api/generate-image', {
                prompt: processedTriggered.prompt,
                aspectRatio: processedTriggered.aspectRatio,
                imageSize: options?.imageSize || '1K',
              });
            });
            if (imgResData.imageUrl) {
              generatedImagePayload = {
                url: imgResData.imageUrl,
                prompt: processedTriggered.prompt,
                aspectRatio: processedTriggered.aspectRatio,
                imageSize: options?.imageSize || '1K',
              };
            }
          } catch (imgErr) {
            console.warn('Triggered image error:', imgErr);
          }
        }

        const aiMessage: Message = {
          id: generateUniqueId('msg_ai'),
          role: 'assistant',
          text: chatData.text,
          timestamp: Date.now(),
          model: chatData.model,
          citations: chatData.citations,
          generatedImage: generatedImagePayload,
          thinkingProcess: options?.thinking
            ? [
                'Context decomposed & constraints mapped',
                'Synthesized optimal algorithmic pattern',
                'Constructed robust types and error boundaries',
                'Response verified against best practices',
              ]
            : undefined,
          mode: finalMode,
          status: 'done',
        };

        const refinedIntent = detectSessionCategory({
          text,
          mode: finalMode,
          assistantText: chatData.text,
          hasImageAttachment: !!imageAttachment,
          isImageGen: isImageRequest || !!generatedImagePayload,
        });

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  category: refinedIntent.category,
                  tags: refinedIntent.tags,
                  updatedAt: Date.now(),
                  messages: [...s.messages, aiMessage],
                }
              : s
          )
        );

        if (currentUser && !currentUser.isGuest) {
          addToast({
            type: 'cloud',
            title: 'Session Synced with Cloud',
            description: 'Conversation safely synced to your Firestore database.',
          });
        }

        // Trigger background auto-titling if this was the first exchange
        const currentSess = sessions.find(s => s.id === activeSessionId);
        if (currentSess && currentSess.messages.length === 1) {
          // currentSess.messages length is 1 because the state update hasn't finalized 
          // (we are inside the async chain where we just called setSessions)
          // Actually, let's just check if the session title is 'New Chat' or a slice
          if ((currentSess.title === 'New Chat' || currentSess.messages.length <= 1) && !isCloudSyncPaused()) {
            generateSessionTitle(activeSessionId, text);
          }
        }
      }
    } catch (err: any) {
      console.error('Generation failure:', err);
      const errorMessage: Message = {
        id: generateUniqueId('msg_ai_err'),
        role: 'assistant',
        text: `I encountered an issue processing this request: ${err.message || 'Unknown network error'}. Please check your connection or try refining your prompt.`,
        timestamp: Date.now(),
        status: 'error',
        mode: finalMode,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, updatedAt: Date.now(), messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setIsGeneratingImage(false);
    }
  };

  /**
   * SILENT BACKGROUND AUTO-TITLING
   * Runs after the first user-AI exchange to summarize the conversation.
   */
  const generateSessionTitle = async (sessionId: string, firstMessage: string) => {
    try {
      const data = await safeApiPost<{ title: string }>('/api/generate-title', {
        message: firstMessage,
      });
      
      if (data.title && data.title !== 'New Chat') {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: data.title } : s))
        );
      }
    } catch (err) {
      console.warn('Auto-titling failed:', err);
    }
  };

  const handleSelectDashboardPrompt = (prompt: string, isImageGen?: boolean) => {
    if (prompt.startsWith('/')) {
      const mode = prompt.split(' ')[0].replace('/', '') as SlashCommandType;
      setActiveMode(mode);
    }
    setInitialInputPrompt(prompt);
  };

  // Assign global handler for Payment Verification Flow (Triggered from SubscriptionModal.tsx)
  useEffect(() => {
    window.__OMNISYM_START_VERIFICATION__ = handleStartPaymentVerification;
    return () => {
      delete window.__OMNISYM_START_VERIFICATION__;
    };
  }, []);

  const handleUpdateUser = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    safeLocalStorageSet('omnisym_user', updatedUser);
    
    if (!currentUser.isGuest && auth.currentUser && !isCloudSyncPaused()) {
      await syncUserProfile(updatedUser);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('omnisym_user');
      await signOut(auth);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const starredSessions = sessions.filter((s) => s.isFavorite);

  // If a public share link (?share=...) is being accessed, render the public viewer
  if (publicShareId) {
    if (isLoadingPublicShare) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-bounce">
            <Brain className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Loading shared conversation...</p>
          <p className="text-xs text-slate-500">Retrieving read-only snapshot</p>
        </div>
      );
    }

    if (publicShareData) {
      return (
        <PublicSharedChatView
          shareData={publicShareData}
          onForkSession={handleForkPublicSession}
          onGoToApp={handleGoToHomeApp}
        />
      );
    }

    if (publicShareError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6 text-center">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
            <Brain className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Shared Link Unavailable</h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
            {publicShareError} It may have been deleted by the author or the URL may be incorrect.
          </p>
          <button
            type="button"
            onClick={handleGoToHomeApp}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            Go to Omnisym Workspace
          </button>
        </div>
      );
    }
  }

  if (legalView === 'privacy') {
    return <PrivacyPolicy onClose={() => setLegalView(null)} />;
  }

  if (legalView === 'terms') {
    return <TermsConditions onClose={() => setLegalView(null)} />;
  }

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black">
        <Sparkles className="w-10 h-10 animate-pulse text-zinc-900 dark:text-zinc-100" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onGuestLogin={handleDirectGuestLogin} />;
  }

  return (
    <div
      id="omnisym-app"
      className={`flex h-[100dvh] w-full overflow-hidden bg-[var(--bg-main)] font-sans text-[var(--text-primary)] transition-all ${
        isFlippingScreen ? 'animate-do-a-flip' : ''
      } ${isMatrixMode ? 'matrix-mode-active' : ''}`}
    >
      {/* Left Sidebar */}
      {/* 1. Premium PWA Splash Screen */}
      <AnimatePresence>
        {isInitialising && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ 
              y: -20,
              opacity: 0,
              filter: 'blur(10px)'
            }}
            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 1,
                ease: "easeOut",
                rotate: { duration: 5, repeat: Infinity, ease: "linear" }
              }}
              className="relative w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] z-10"
            >
              <Sparkles className="w-10 h-10 text-white" />
              <div className="absolute inset-0 rounded-3xl border border-white/20" />
            </motion.div>

            <div className="mt-8 flex flex-col items-center gap-4 z-10">
              <motion.h1 
                initial={{ letterSpacing: "0.5em", opacity: 0 }}
                animate={{ letterSpacing: "0.2em", opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="text-2xl font-black text-white uppercase tracking-[0.2em]"
              >
                Omnisym
              </motion.h1>
              
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="h-full bg-linear-to-r from-indigo-500 to-indigo-400"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">
                  System Synchronising
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onNewChat={() => handleNewChat()}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        onToggleStarSession={handleToggleStarSession}
        onToggleArchiveSession={handleToggleArchiveSession}
        onToggleReadOnlySession={handleToggleReadOnlySession}
        onReorderSessions={handleReorderSessions}
        onOpenMyStuff={() => setMyStuffModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        currentUser={currentUser}
        subscription={subscription}
        onOpenSubscription={handleOpenSubscription}
        onOpenLiveSandbox={() => handleOpenLiveSandbox()}
        savedImagesCount={savedImages.length}
        savedSnippetsCount={savedSnippets.length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenAdmin={() => setIsAdminDashboardOpen(true)}
        onOpenFeedback={(sid) => {
          const sess = sessions.find(s => s.id === sid);
          if (sess && sess.messages.length > 0) {
            const lastAiMsg = [...sess.messages].reverse().find(m => m.role === 'assistant');
            const lastUserMsg = [...sess.messages].reverse().find(m => m.role === 'user');
            setFeedbackModal({
              isOpen: true,
              messageId: lastAiMsg?.id || 'sid_feedback',
              promptSnippet: lastUserMsg?.text || '',
              aiResponseSnippet: lastAiMsg?.text || '',
            });
          } else {
            addToast({
              type: 'info',
              title: 'No context',
              description: 'Start a chat first to provide feedback.'
            });
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-main)]">
        {/* Guest Mode Active Banner */}
        {currentUser?.isGuest && (
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between z-[45]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                Guest Mode — 5 Free Prompts Remaining
              </span>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2 cursor-pointer uppercase tracking-tight"
            >
              Sign in for Cloud Sync
            </button>
          </div>
        )}

        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentSession={currentSession}
          currentUser={currentUser}
          subscription={subscription}
          onOpenSubscription={() => handleOpenSubscription()}
          onOpenLiveSandbox={() => handleOpenLiveSandbox()}
          onOpenMyStuff={() => setMyStuffModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onClearSession={handleClearCurrentSession}
          onExportSession={handleExportSession}
          onDownloadPdf={handleDownloadPdf}
          onOpenShare={() => setShareModalOpen(true)}
          onToggleReadOnly={() => currentSession && handleToggleReadOnlySession(currentSession.id)}
          onToggleArchive={() => currentSession && handleToggleArchiveSession(currentSession.id)}
          onCelebrate={() => {
            triggerMilestoneCelebration();
            addToast({
              type: 'cloud',
              title: '🎉 Celebration Triggered!',
              description: 'Party confetti shower unlocked by Omnisym!',
            });
          }}
          savedItemsTotal={savedImages.length + savedSnippets.length}
          isSyncPaused={isCloudSyncPaused()}
        />

        {/* Matrix Mode Active HUD Notification */}
        {isMatrixMode && (
          <div className="bg-green-950 border-b border-green-500/40 text-green-400 px-4 py-1.5 text-xs font-mono flex items-center justify-between animate-pulse shrink-0">
            <span>🟢 [MATRIX OVERRIDE ACTIVE] SYSTEM INJECTED</span>
            <span>DISCONNECTING IN 5s</span>
          </div>
        )}

        {/* Chat / Dashboard Body */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-950 dark:to-zinc-900">
          {!currentSession || currentSession.messages.length === 0 ? (
            <HomeDashboard
              user={currentUser}
              subscription={subscription}
              onOpenSubscription={() => handleOpenSubscription()}
              onOpenLiveSandbox={() => handleOpenLiveSandbox()}
              onSelectPrompt={handleSelectDashboardPrompt}
            />
          ) : (
            <div className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 pb-36 sm:pb-44 space-y-4 virtual-scroll-area optimize-gpu">
              {currentSession.messages.map((message, mIndex) => (
                <ChatMessage
                  key={message.id ? `${message.id}_${mIndex}` : `msg_${mIndex}`}
                  message={message}
                  userAvatar={getUserAvatar(currentUser)}
                  onLike={handleLikeMessage}
                  onDislike={handleDislikeMessage}
                  onRegenerate={(msg) => {
                    const prevUserMsg = currentSession.messages
                      .slice(0, currentSession.messages.indexOf(msg))
                      .reverse()
                      .find((m) => m.role === 'user');
                    if (prevUserMsg) {
                      handleSendMessage(prevUserMsg.text, prevUserMsg.imageAttachment);
                    }
                  }}
                  onSaveImage={handleSaveImage}
                  onSaveSnippet={handleSaveSnippet}
                  isImageSaved={
                    message.generatedImage
                      ? savedImages.some((i) => i.url === message.generatedImage?.url)
                      : false
                  }
                />
              ))}

              {/* Instant Loading / Thinking State */}
              {isLoading && (
                <div className="px-2 sm:px-4 py-1">
                  <ThinkingAnimation
                    mode={activeMode}
                    isImageGen={isGeneratingImage}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Input Area */}
        <footer className="shrink-0 bg-white/95 border-t border-slate-100 pt-3 pb-2">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            activeMode={activeMode}
            onChangeMode={(mode) => setActiveMode(mode)}
            isTempSession={currentSession?.isTemp}
            isReadOnly={currentSession?.isReadOnly}
            onToggleReadOnly={() => currentSession && handleToggleReadOnlySession(currentSession.id)}
            initialPrompt={initialInputPrompt}
            onClearInitialPrompt={() => setInitialInputPrompt('')}
            onOpenTemplates={() => setTemplateLibraryOpen(true)}
          />
        </footer>
      </div>

      {/* Legal Overlays */}
      <AnimatePresence>
        {legalView === 'privacy' && (
          <PrivacyPolicy onClose={() => setLegalView(null)} />
        )}
        {legalView === 'terms' && (
          <TermsConditions onClose={() => setLegalView(null)} />
        )}
      </AnimatePresence>

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={templateLibraryOpen}
        onClose={() => setTemplateLibraryOpen(false)}
        onUseTemplate={(prompt) => {
          setInitialInputPrompt(prompt);
          if (prompt.startsWith('/')) {
            const parts = prompt.split(' ');
            const cmd = parts[0].replace('/', '') as SlashCommandType;
            if (['code', 'research', '3d', 'human', 'temp', 'roast'].includes(cmd)) {
              setActiveMode(cmd);
            }
          }
        }}
      />

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal 
        isOpen={shortcutsModalOpen} 
        onClose={() => setShortcutsModalOpen(false)} 
      />

      {/* Feedback Modal for Dislike Reports */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        messageId={feedbackModal.messageId}
        promptSnippet={feedbackModal.promptSnippet}
        aiResponseSnippet={feedbackModal.aiResponseSnippet}
        userEmail={currentUser.email}
        onSubmitSuccess={handleFeedbackSubmittedSuccess}
      />

      {/* Continuous Memory Notification Toast */}
      <AnimatePresence>
        {learnedMemoryNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-5 right-5 z-[550] bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-zinc-800 flex items-center gap-3 max-w-sm sm:max-w-md pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 shadow-sm border border-white/10">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">System Learned</p>
              <p className="text-xs text-zinc-100 truncate font-bold mt-0.5">{learnedMemoryNotification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "My Stuff" Repository & Memory Modal */}
      <MyStuffModal
        isOpen={myStuffModalOpen}
        onClose={() => setMyStuffModalOpen(false)}
        savedImages={savedImages}
        savedSnippets={savedSnippets}
        starredSessions={starredSessions}
        sessions={sessions}
        userMemories={userMemories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearMemories={handleClearMemories}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onDeleteImage={handleDeleteSavedImage}
        onDeleteSnippet={handleDeleteSavedSnippet}
        onUsePrompt={(prompt) => {
          setInitialInputPrompt(prompt);
          if (prompt.startsWith('/')) {
            const mode = prompt.split(' ')[0].replace('/', '') as SlashCommandType;
            setActiveMode(mode);
          }
        }}
      />

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={authModalOpen}
        currentUser={currentUser}
        subscription={subscription}
        onOpenSubscription={() => handleOpenSubscription()}
        onClose={() => setAuthModalOpen(false)}
        onSelectUser={(user) => setCurrentUser(user)}
        onLogout={handleLogout}
      />

      {/* Subscription & Plans Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        currentSubscription={subscription}
        initialTier={subscriptionInitialTier}
        onSubscriptionSuccess={handleSubscriptionSuccess}
        addToast={addToast}
      />

      {/* First-time Pro Upgrade Celebration Modal */}
      <WelcomeProModal
        isOpen={welcomeProModalOpen}
        onClose={() => {
          setWelcomeProModalOpen(false);
          const tierData = safeLocalStorageGet<any>('omnisym_user_tier', null);
          if (tierData) {
            tierData.hasSeenWelcome = true;
            safeLocalStorageSet('omnisym_user_tier', tierData);
          }
        }}
        subscription={subscription}
        onOpenLiveSandbox={() => {
          setWelcomeProModalOpen(false);
          handleOpenLiveSandbox();
        }}
      />

      {/* Live Sandbox & ZIP Export Modal */}
      <LiveSandboxModal
        isOpen={liveSandboxOpen}
        onClose={() => setLiveSandboxOpen(false)}
        initialHtml={sandboxInitialCode.html}
        initialCss={sandboxInitialCode.css}
        initialJs={sandboxInitialCode.js}
        subscription={subscription}
        onOpenSubscription={() => handleOpenSubscription('creator')}
      />

      {/* Share Conversation Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        session={currentSession}
        currentUser={currentUser}
        onUpdateSessionShareId={(sessionId, shareId) => {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, shareId } : s))
          );
        }}
      />

      {/* Cloud Sync Toast Notifications */}
      <AnimatePresence>
        {isAdminDashboardOpen && currentUser && (
          <AdminDashboard 
            onClose={() => setIsAdminDashboardOpen(false)} 
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      {/* Hidden Global Triggers for Sidebar */}
      <div className="hidden">
        <button id="global-privacy-btn" onClick={() => setLegalView('privacy')} />
        <button id="global-terms-btn" onClick={() => setLegalView('terms')} />
      </div>

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {isVerifyingPayment && <PaymentVerification onComplete={handlePaymentVerified} />}
    </div>
  );
}
