import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  increment,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  disableNetwork,
  terminate,
  setLogLevel,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatSession, SavedImage, SavedSnippet, PublicShareData, UserProfile, ActivityLog } from '../types';
import { safeLocalStorageGet, safeLocalStorageSet, safeJsonParse } from '../utils/storageUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialise sync status synchronously from localStorage to prevent race conditions during module load
let isSyncPaused = false;
if (typeof window !== 'undefined') {
  if (localStorage.getItem('omnisym_cloud_quota_exceeded') === 'true') {
    isSyncPaused = true;
    (window as any).__OMNISYM_QUOTA_LOCKDOWN__ = true;
    try {
      setLogLevel('silent');
    } catch {}
  }
}

/**
 * Force Firestore into lockdown mode.
 * Stops all outgoing network calls and internal SDK retries.
 */
export const triggerQuotaLockdown = async () => {
  isSyncPaused = true;
  if (typeof window !== 'undefined') {
    (window as any).__OMNISYM_QUOTA_LOCKDOWN__ = true;
    try {
      localStorage.setItem('omnisym_cloud_quota_exceeded', 'true');
    } catch (e) {}
  }

  try {
    setLogLevel('silent');
  } catch {}

  try {
    // disableNetwork stops outgoing calls
    await disableNetwork(db);
  } catch (e) {}

  try {
    // terminate stops all internal SDK retries and resources
    await terminate(db);
    if (typeof window !== 'undefined') {
      (window as any).__OMNISYM_SDK_TERMINATED__ = true;
    }
  } catch (e) {}
};

// If initialized as paused, trigger the SDK silencing immediately
if (isSyncPaused) {
  triggerQuotaLockdown().catch(() => {});
}

// Global listener to immediately catch any background SDK network quota exhaustion
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event?.reason ? String(event.reason?.message || event.reason) : '';
    if (
      reasonStr.toLowerCase().includes('quota') ||
      reasonStr.toLowerCase().includes('resource-exhausted') ||
      reasonStr.toLowerCase().includes('write units') ||
      reasonStr.toLowerCase().includes('backoff delay') ||
      reasonStr.toLowerCase().includes('firestore')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      triggerQuotaLockdown().catch(() => {});
    }
  });

  window.addEventListener('error', (event) => {
    const errStr = event?.message ? String(event.message) : '';
    if (
      errStr.toLowerCase().includes('quota') ||
      errStr.toLowerCase().includes('resource-exhausted') ||
      errStr.toLowerCase().includes('write units') ||
      errStr.toLowerCase().includes('firestore')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      triggerQuotaLockdown().catch(() => {});
    }
  });
}

export const isCloudSyncPaused = () => {
  if (typeof window !== 'undefined' && (window as any).__OMNISYM_QUOTA_LOCKDOWN__) return true;
  return isSyncPaused;
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const currentAuthUser = auth.currentUser;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isQuotaExceeded = 
    errorMessage.toLowerCase().includes('quota') || 
    errorMessage.toLowerCase().includes('exhausted') || 
    errorMessage.toLowerCase().includes('resource-exhausted') ||
    errorMessage.toLowerCase().includes('write units') ||
    (error as any)?.code === 'resource-exhausted';

  if (isQuotaExceeded) {
    if (!isCloudSyncPaused()) {
      triggerQuotaLockdown();
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: currentAuthUser?.uid,
      email: currentAuthUser?.email,
      emailVerified: currentAuthUser?.emailVerified,
      isAnonymous: currentAuthUser?.isAnonymous,
      tenantId: currentAuthUser?.tenantId,
      providerInfo: currentAuthUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.warn('Firestore operation notice:', JSON.stringify(errInfo));
}

/**
 * Deeply sanitises data by removing all `undefined` values and normalising keys,
 * ensuring Firestore setDoc() never throws "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}

export const saveSessionToCloud = async (userId: string, session: ChatSession): Promise<void> => {
  if (isCloudSyncPaused()) return;
  if (!userId || !session || !session.id) return;
  // Only sync to Firestore if the user is authenticated in Firebase Auth
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return;
  }

  const path = `chatSessions/${session.id}`;
  try {
    const docRef = doc(db, 'chatSessions', session.id);
    const sanitized = sanitizeForFirestore({
      ...session,
      userId,
      updatedAt: session.updatedAt || Date.now(),
      createdAt: session.createdAt || Date.now(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteSessionFromCloud = async (sessionId: string): Promise<void> => {
  if (isCloudSyncPaused()) return;
  if (!sessionId) return;
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) return;

  const path = `chatSessions/${sessionId}`;
  try {
    const docRef = doc(db, 'chatSessions', sessionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const loadSessionsFromCloud = async (userId: string): Promise<ChatSession[]> => {
  if (isCloudSyncPaused()) return [];
  if (!userId) return [];
  // Ensure user is authenticated before issuing Firestore list query
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return [];
  }

  const path = 'chatSessions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      delete data.userId;
      sessions.push(data as ChatSession);
    });
    return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const saveImageToCloud = async (userId: string, image: SavedImage): Promise<void> => {
  if (isCloudSyncPaused()) return;
  if (!userId || !image || !image.id) return;
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return;
  }

  const path = `savedImages/${image.id}`;
  try {
    const docRef = doc(db, 'savedImages', image.id);
    const sanitized = sanitizeForFirestore({ ...image, userId });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadImagesFromCloud = async (userId: string): Promise<SavedImage[]> => {
  if (isCloudSyncPaused()) return [];
  if (!userId) return [];
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return [];
  }

  const path = 'savedImages';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const images: SavedImage[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      delete data.userId;
      images.push(data as SavedImage);
    });
    return images.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const saveSnippetToCloud = async (userId: string, snippet: SavedSnippet): Promise<void> => {
  if (isCloudSyncPaused()) return;
  if (!userId || !snippet || !snippet.id) return;
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return;
  }

  const path = `savedSnippets/${snippet.id}`;
  try {
    const docRef = doc(db, 'savedSnippets', snippet.id);
    const sanitized = sanitizeForFirestore({ ...snippet, userId });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadSnippetsFromCloud = async (userId: string): Promise<SavedSnippet[]> => {
  if (isCloudSyncPaused()) return [];
  if (!userId) return [];
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    return [];
  }

  const path = 'savedSnippets';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const snippets: SavedSnippet[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      delete data.userId;
      snippets.push(data as SavedSnippet);
    });
    return snippets.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

const STORAGE_KEY_PUBLIC_SHARES = 'omnisym_public_shares_cache';

export const savePublicShareToCloud = async (shareData: PublicShareData): Promise<string> => {
  const shareId = shareData.shareId;
  const path = `publicShares/${shareId}`;

  // Always cache locally so the link works offline or on instant reload
  const existing = safeLocalStorageGet<Record<string, PublicShareData>>(STORAGE_KEY_PUBLIC_SHARES, {});
  existing[shareId] = shareData;
  safeLocalStorageSet(STORAGE_KEY_PUBLIC_SHARES, existing);

  if (isCloudSyncPaused()) return shareId;

  try {
    const docRef = doc(db, 'publicShares', shareId);
    const sanitized = sanitizeForFirestore({
      ...shareData,
      createdAt: shareData.createdAt || Date.now(),
      viewCount: shareData.viewCount || 0,
    });
    await setDoc(docRef, sanitized, { merge: true });
    return shareId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuota = errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted') || (error as any)?.code === 'resource-exhausted';
    if (isQuota) {
      triggerQuotaLockdown();
    }
    
    console.warn('Firestore public share notice (local fallback active):', error);
    return shareId;
  }
};

export const getPublicShareFromCloud = async (shareId: string): Promise<PublicShareData | null> => {
  if (!shareId) return null;
  const path = `publicShares/${shareId}`;

  if (!isCloudSyncPaused()) {
    try {
      const docRef = doc(db, 'publicShares', shareId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as PublicShareData;
        // Increment view count asynchronously (non-blocking)
        if (!isCloudSyncPaused()) {
          try {
            updateDoc(docRef, { viewCount: increment(1) }).catch(() => {});
          } catch {
            // ignore
          }
        }
        return data;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuota = errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted') || (error as any)?.code === 'resource-exhausted';
      if (isQuota) {
        triggerQuotaLockdown();
      }
      console.warn('Firestore fetch public share notice:', error);
    }
  }

  // Fallback to local cache if Firestore is not accessible or document is local
  const existing = safeLocalStorageGet<Record<string, PublicShareData>>(STORAGE_KEY_PUBLIC_SHARES, {});
  if (existing[shareId]) {
    return existing[shareId];
  }

  return null;
};

/**
 * User Profile & Admin Utilities
 */

/**
 * A simple timeout wrapper to prevent Firestore calls from hanging indefinitely
 * especially during initial auth sync which can block the entire app UI.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export const syncUserProfile = async (profile: UserProfile): Promise<UserProfile> => {
  if (!profile.id) return profile;
  if (isCloudSyncPaused()) return profile;

  const path = `userProfiles/${profile.id}`;
  try {
    const docRef = doc(db, 'userProfiles', profile.id);
    // Wrap critical initial getDoc in a timeout to prevent app boot hang
    const docSnap = await withTimeout(getDoc(docRef), 3500);
    
    let finalProfile = { ...profile };
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      // Preserve role, status, subscription, and createdAt from server if they exist
      finalProfile = {
        ...profile,
        role: data.role || 'user',
        status: data.status || 'active',
        subscription: data.subscription || profile.subscription,
        createdAt: data.createdAt || data.updatedAt || Date.now(),
        memories: data.memories || profile.memories || [],
      };
      
      // Update last login (non-blocking update)
      updateDoc(docRef, {
        lastLogin: Date.now(),
        updatedAt: Date.now(),
        displayName: profile.displayName || profile.name,
        photoURL: profile.photoURL || profile.avatar,
      }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, path));
    } else {
      // New user
      finalProfile = {
        ...profile,
        role: profile.email === 'apar123445@gmail.com' ? 'admin' : 'user',
        status: 'active',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        updatedAt: Date.now(),
      };
      await withTimeout(setDoc(docRef, sanitizeForFirestore(finalProfile)), 4000);
    }
    return finalProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return profile;
  }
};

export const getRegistrationStats = async (): Promise<{ date: string; count: number }[]> => {
  if (isCloudSyncPaused()) return [];
  const path = 'userProfiles';
  try {
    const snapshot = await getDocs(collection(db, path));
    const statsMap: Record<string, number> = {};
    
    // Initialise last 7 days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      statsMap[d.toISOString().split('T')[0]] = 0;
    }

    snapshot.forEach(doc => {
      const data = doc.data() as UserProfile;
      const date = new Date(data.createdAt || data.updatedAt || Date.now()).toISOString().split('T')[0];
      if (statsMap[date] !== undefined) {
        statsMap[date]++;
      }
    });

    return Object.entries(statsMap).map(([date, count]) => ({
      date: date.split('-').slice(1).join('/'), // Format as MM/DD
      count
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const logActivity = async (
  userId: string,
  email: string,
  type: string,
  extra?: { isGuest?: boolean; userName?: string; details?: string }
): Promise<void> => {
  if (isCloudSyncPaused()) return;
  const path = 'activityLogs';
  try {
    const isGuestUser = extra?.isGuest !== undefined 
      ? extra.isGuest 
      : (!email || email.toLowerCase().includes('guest') || email.endsWith('.local') || !userId || userId.startsWith('guest_') || !auth.currentUser);

    const logRef = doc(collection(db, path));
    const logData: any = {
      userId: userId || 'guest_' + Date.now().toString(36),
      email: email || 'guest@omnisym.local',
      userName: extra?.userName || 'Guest User',
      isGuest: !!isGuestUser,
      type,
      timestamp: Date.now(),
    };

    if (extra?.details) {
      logData.details = extra.details;
    }

    await setDoc(logRef, sanitizeForFirestore(logData));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAdminAnalytics = async (): Promise<{ totalUsers: number; activeToday: number; totalSessions: number; totalImages: number }> => {
  if (isCloudSyncPaused()) return { totalUsers: 0, activeToday: 0, totalSessions: 0, totalImages: 0 };
  try {
    const [userSnap, sessionSnap, imageSnap] = await Promise.all([
      getDocs(collection(db, 'userProfiles')),
      getDocs(collection(db, 'chatSessions')),
      getDocs(collection(db, 'savedImages'))
    ]);

    const totalUsers = userSnap.size;
    const totalSessions = sessionSnap.size;
    const totalImages = imageSnap.size;
    
    // Simple active today: users who logged in within last 24h
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let activeToday = 0;
    userSnap.forEach(doc => {
      if ((doc.data().lastLogin || 0) > dayAgo) activeToday++;
    });
    
    return { totalUsers, activeToday, totalSessions, totalImages };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'analytics');
    return { totalUsers: 0, activeToday: 0, totalSessions: 0, totalImages: 0 };
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (isCloudSyncPaused()) return [];
  const path = 'userProfiles';
  try {
    const snapshot = await getDocs(collection(db, path));
    const users: UserProfile[] = [];
    snapshot.forEach(doc => {
      users.push({ ...doc.data(), id: doc.id } as UserProfile);
    });
    return users.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getActivityLogs = async (limitCount: number = 50): Promise<ActivityLog[]> => {
  if (isCloudSyncPaused()) return [];
  const path = 'activityLogs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    snapshot.forEach(doc => {
      logs.push({ ...doc.data(), id: doc.id } as ActivityLog);
    });
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getUserActivityLogs = async (userId: string, limitCount: number = 50): Promise<ActivityLog[]> => {
  if (isCloudSyncPaused()) return [];
  const path = 'activityLogs';
  try {
    const q = query(
      collection(db, path), 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    snapshot.forEach(doc => {
      logs.push({ ...doc.data(), id: doc.id } as ActivityLog);
    });
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateUserStatus = async (userId: string, status: 'active' | 'banned'): Promise<void> => {
  if (isCloudSyncPaused()) return;
  const path = `userProfiles/${userId}`;
  try {
    await updateDoc(doc(db, 'userProfiles', userId), { status, updatedAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'moderator' | 'user'): Promise<void> => {
  if (isCloudSyncPaused()) return;
  const path = `userProfiles/${userId}`;
  try {
    await updateDoc(doc(db, 'userProfiles', userId), { role, updatedAt: Date.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};


