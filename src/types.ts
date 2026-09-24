export type MessageRole = 'user' | 'assistant' | 'system';

export type ModelName = 
  | 'gemini-3.7-flash' 
  | 'gemini-3.1-pro-preview' 
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-flash-image';

export type SlashCommandType = 'code' | 'research' | '3d' | 'human' | 'temp' | 'roast';

export interface GroundingCitation {
  title: string;
  url: string;
}

export interface GeneratedImageData {
  url: string;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
  description?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  imageAttachment?: {
    dataUrl: string;
    mimeType: string;
    name?: string;
  };
  generatedImage?: GeneratedImageData;
  model?: string;
  citations?: GroundingCitation[];
  thinkingProcess?: string[];
  mode?: SlashCommandType | 'default';
  reaction?: 'like' | 'dislike' | null;
  feedbackSubmitted?: boolean;
  isTemp?: boolean;
  status?: 'thinking' | 'typing' | 'done' | 'error';
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  isTemp?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  isReadOnly?: boolean;
  mode?: SlashCommandType | 'default';
  category?: string;
  tags?: string[];
  shareId?: string;
}

export interface UserMemoryItem {
  id: string;
  fact: string;
  timestamp: number;
  source?: string;
}

export type UserRole = 'admin' | 'moderator' | 'user';
export type UserStatus = 'active' | 'banned';

export type SubscriptionTier = 'free' | 'flash' | 'student' | 'creator';

export interface UserSubscription {
  isPro: boolean;
  tier: SubscriptionTier;
  planName: string;
  badge: string;
  price: number;
  currency: string;
  validityDays: number;
  activatedAt: number;
  expiresAt: number;
  utr?: string;
  storageLimitGB: number;
}

export interface UserProfile {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  avatar: string;
  photoURL?: string;
  badge?: string;
  isGuest?: boolean;
  memories?: string[];
  role?: UserRole;
  status?: UserStatus;
  subscription?: UserSubscription;
  lastLogin?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  email: string;
  userName?: string;
  isGuest?: boolean;
  type: string;
  details?: string;
  timestamp: number;
}

export interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  aspectRatio: string;
  imageSize: string;
  tags?: string[];
}

export interface SavedSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  timestamp: number;
  notes?: string;
}

export interface SlashCommandInfo {
  command: `/${string}`;
  type: SlashCommandType;
  title: string;
  description: string;
  iconName: string;
  badgeColor: string;
  example: string;
}

export interface FeedbackData {
  category: string;
  notes: string;
  messageId: string;
  promptSnippet: string;
  aiResponseSnippet: string;
  userEmail: string;
}

export interface ToastNotification {
  id: string;
  type?: 'success' | 'info' | 'cloud' | 'error';
  title: string;
  description?: string;
  timestamp: number;
}

export interface PublicShareData {
  shareId: string;
  authorId?: string;
  authorName?: string;
  title: string;
  category?: string;
  tags?: string[];
  messages: Message[];
  createdAt: number;
  viewCount?: number;
  shareUrl?: string;
}
