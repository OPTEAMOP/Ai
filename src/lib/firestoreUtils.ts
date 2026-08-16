import { collection, doc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatSession, SavedImage, SavedSnippet } from '../types';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuthUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Deeply sanitizes data by removing all `undefined` values and normalizing keys,
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
  if (!userId || !session || !session.id) return;
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
  if (!sessionId) return;
  const path = `chatSessions/${sessionId}`;
  try {
    const docRef = doc(db, 'chatSessions', sessionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const loadSessionsFromCloud = async (userId: string): Promise<ChatSession[]> => {
  if (!userId) return [];
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
  }
};

export const saveImageToCloud = async (userId: string, image: SavedImage): Promise<void> => {
  if (!userId || !image || !image.id) return;
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
  if (!userId) return [];
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
  }
};

export const saveSnippetToCloud = async (userId: string, snippet: SavedSnippet): Promise<void> => {
  if (!userId || !snippet || !snippet.id) return;
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
  if (!userId) return [];
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
  }
};

