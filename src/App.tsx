/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain } from 'lucide-react';
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
import { LoginScreen } from './components/LoginScreen';
import { ToastContainer } from './components/Toast';
import { auth, onAuthStateChanged, signOut } from './lib/firebase';
import {
  saveSessionToCloud,
  deleteSessionFromCloud,
  loadSessionsFromCloud,
  saveImageToCloud,
  loadImagesFromCloud,
  saveSnippetToCloud,
  loadSnippetsFromCloud
} from './lib/firestoreUtils';

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
  // Auth state
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Fallback guest login handler for public links & non-Firebase environments
  const handleDirectGuestLogin = () => {
    const guestUser: UserProfile = {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      email: 'guest@omnisym.ai',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isGuest: true,
    };
    try {
      localStorage.setItem('omnisym_user', JSON.stringify(guestUser));
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
          try {
            const cachedUser = localStorage.getItem('omnisym_user');
            if (cachedUser) {
              const parsed = JSON.parse(cachedUser);
              setCurrentUser(parsed);
              setIsAuthenticated(true);
            }
          } catch {
            // ignore
          }
          return false;
        }
        return false;
      });
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(authTimeout);
      if (user) {
        const profile: UserProfile = {
          id: user.uid,
          name: user.displayName || 'Guest User',
          email: user.email || 'guest@omnisym.local',
          avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isGuest: user.isAnonymous,
        };
        setIsAuthenticated(true);
        setCurrentUser(profile);
        try {
          localStorage.setItem('omnisym_user', JSON.stringify(profile));
        } catch {
          // ignore
        }
      } else {
        // Check if there is an active local guest user
        try {
          const cachedUser = localStorage.getItem('omnisym_user');
          if (cachedUser) {
            const parsed = JSON.parse(cachedUser);
            if (parsed && parsed.isGuest) {
              setCurrentUser(parsed);
              setIsAuthenticated(true);
              setIsAuthLoading(false);
              return;
            }
          }
        } catch {
          // ignore
        }
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<SlashCommandType | 'default'>('default');

  // "My Stuff" state
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>([]);

  // Continuous Learning & Memory State
  const [userMemories, setUserMemories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEMORIES);
      return saved ? JSON.parse(saved) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });

  // Sync with cloud on auth change
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        loadSessionsFromCloud(currentUser.id),
        loadImagesFromCloud(currentUser.id),
        loadSnippetsFromCloud(currentUser.id)
      ]).then(([cloudSessions, cloudImages, cloudSnippets]) => {
        setSessions(cloudSessions);
        setSavedImages(cloudImages);
        setSavedSnippets(cloudSnippets);
      }).catch(e => console.error("Error loading cloud data:", e));
    }
  }, [currentUser]);

  const [learnedMemoryNotification, setLearnedMemoryNotification] = useState<string | null>(null);

  // UI Modals & Panels
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [myStuffModalOpen, setMyStuffModalOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('omnisym_theme') === 'dark';
  });

  // Keep dark mode synced with HTML class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('omnisym_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('omnisym_theme', 'light');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync to Cloud
  useEffect(() => {
    if (!currentUser || currentUser.isGuest || !auth.currentUser) return;
    try {
      const persistableSessions = sessions.filter((s) => !s.isTemp);
      persistableSessions.forEach(session => {
        saveSessionToCloud(currentUser.id, session).catch(e => console.error(e));
      });
    } catch (e) {
      console.warn('Sync error:', e);
    }
  }, [sessions, currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.isGuest || !auth.currentUser) return;
    try {
      savedImages.forEach(img => {
        saveImageToCloud(currentUser.id, img).catch(e => console.error(e));
      });
    } catch (e) {
      console.warn('Sync images error:', e);
    }
  }, [savedImages, currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.isGuest || !auth.currentUser) return;
    try {
      savedSnippets.forEach(snippet => {
        saveSnippetToCloud(currentUser.id, snippet).catch(e => console.error(e));
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
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
      imageAttachment,
      mode: finalMode,
    };

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
          messages: [...s.messages, userMessage],
        };
      })
    );

    setIsLoading(true);
    setIsThinking(true);

    const isImageRequest =
      finalMode === '3d' && text.toLowerCase().includes('generate') ||
      text.toLowerCase().includes('generate image') ||
      text.toLowerCase().includes('create image') ||
      text.toLowerCase().includes('draw ');

    if (isImageRequest) {
      setIsGeneratingImage(true);
    }

    try {
      // 1. Direct Image Generation Route
      if (isImageRequest && !imageAttachment) {
        const imageData = await withRetry(async () => {
          return await safeApiPost<{ imageUrl: string; description?: string }>('/api/generate-image', {
            prompt: text,
            aspectRatio: options?.aspectRatio || '1:1',
            imageSize: options?.imageSize || '1K',
          });
        });

        const aiMessage: Message = {
          id: `msg_ai_${Date.now()}`,
          role: 'assistant',
          text: imageData.description || `I've generated this visual asset for you: "${text}"`,
          timestamp: Date.now(),
          generatedImage: {
            url: imageData.imageUrl,
            prompt: text,
            aspectRatio: options?.aspectRatio || '1:1',
            imageSize: options?.imageSize || '1K',
          },
          mode: finalMode,
          status: 'done',
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, updatedAt: Date.now(), messages: [...s.messages, aiMessage] }
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
            const imgResData = await withRetry(async () => {
              return await safeApiPost<{ imageUrl: string }>('/api/generate-image', {
                prompt: chatData.triggeredImagePrompt,
                aspectRatio: options?.aspectRatio || '1:1',
                imageSize: options?.imageSize || '1K',
              });
            });
            if (imgResData.imageUrl) {
              generatedImagePayload = {
                url: imgResData.imageUrl,
                prompt: chatData.triggeredImagePrompt,
                aspectRatio: options?.aspectRatio || '1:1',
                imageSize: options?.imageSize || '1K',
              };
            }
          } catch (imgErr) {
            console.warn('Triggered image error:', imgErr);
          }
        }

        const aiMessage: Message = {
          id: `msg_ai_${Date.now()}`,
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

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, updatedAt: Date.now(), messages: [...s.messages, aiMessage] }
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
      }
    } catch (err: any) {
      console.error('Generation failure:', err);
      const errorMessage: Message = {
        id: `msg_ai_err_${Date.now()}`,
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

  const handleSelectDashboardPrompt = (prompt: string, isImageGen?: boolean) => {
    if (prompt.startsWith('/')) {
      const mode = prompt.split(' ')[0].replace('/', '') as SlashCommandType;
      setActiveMode(mode);
    }
    setInitialInputPrompt(prompt);
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

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#121212]">
        <Brain className="w-10 h-10 animate-pulse text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onGuestLogin={handleDirectGuestLogin} />;
  }

  return (
    <div id="omnisym-app" className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Left Sidebar */}
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
        onReorderSessions={handleReorderSessions}
        onOpenMyStuff={() => setMyStuffModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        currentUser={currentUser}
        savedImagesCount={savedImages.length}
        savedSnippetsCount={savedSnippets.length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#121212]">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentSession={currentSession}
          currentUser={currentUser}
          onOpenMyStuff={() => setMyStuffModalOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onClearSession={handleClearCurrentSession}
          onExportSession={handleExportSession}
          onDownloadPdf={handleDownloadPdf}
          savedItemsTotal={savedImages.length + savedSnippets.length}
        />

        {/* Chat / Dashboard Body */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {!currentSession || currentSession.messages.length === 0 ? (
            <HomeDashboard
              user={currentUser}
              onSelectPrompt={handleSelectDashboardPrompt}
            />
          ) : (
            <div className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
              {currentSession.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
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

              {/* Animated Thinking and Typing States */}
              {isLoading && (
                <div className="px-4">
                  {isThinking && (
                    <ThinkingAnimation
                      mode={activeMode}
                      isImageGen={isGeneratingImage}
                    />
                  )}
                  <TypingAnimation />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Input Area */}
        <footer className="shrink-0 bg-white/95 border-t border-slate-100 pt-2">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            activeMode={activeMode}
            onChangeMode={(mode) => setActiveMode(mode)}
            isTempSession={currentSession?.isTemp}
            initialPrompt={initialInputPrompt}
            onClearInitialPrompt={() => setInitialInputPrompt('')}
            onOpenTemplates={() => setTemplateLibraryOpen(true)}
          />
        </footer>
      </div>

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={templateLibraryOpen}
        onClose={() => setTemplateLibraryOpen(false)}
        onUseTemplate={(prompt) => {
          setInitialInputPrompt(prompt);
          if (prompt.startsWith('/')) {
            const parts = prompt.split(' ');
            const cmd = parts[0].replace('/', '') as SlashCommandType;
            if (['code', 'research', '3d', 'human', 'temp'].includes(cmd)) {
              setActiveMode(cmd);
            }
          }
        }}
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
            className="fixed top-5 right-5 z-60 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-violet-500/30 flex items-center gap-3 max-w-sm sm:max-w-md pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-violet-300 tracking-wide uppercase">Omnisym Learned & Remembered</p>
              <p className="text-xs text-slate-200 truncate font-medium mt-0.5">{learnedMemoryNotification}</p>
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
        onClose={() => setAuthModalOpen(false)}
        onSelectUser={(user) => setCurrentUser(user)}
        onLogout={handleLogout}
      />

      {/* Cloud Sync Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
