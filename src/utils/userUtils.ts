import { UserProfile } from '../types';

export const getUserAvatar = (user: UserProfile | null | undefined): string => {
  if (!user) return 'https://api.dicebear.com/7.x/notionists/svg?seed=Guest';
  
  // Prefer real photoURL if it's a valid URL
  if (user.photoURL && (user.photoURL.startsWith('http') || user.photoURL.startsWith('blob:'))) {
    return user.photoURL;
  }
  
  // Then fallback to avatar
  if (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('blob:'))) {
    return user.avatar;
  }
  
  // If avatar is just a seed string (some systems use seeds for avatars)
  if (user.avatar && !user.avatar.includes('/')) {
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user.avatar)}`;
  }

  // Final fallback based on name or guest status
  const seed = user.name || user.displayName || (user.isGuest ? 'Guest' : 'User');
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
};

export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const getUserDisplayName = (user: UserProfile | null | undefined): string => {
  if (!user) return 'Guest User';
  const name = user.displayName || user.name || (user.isGuest ? 'Guest User' : 'Omnisym User');
  return toTitleCase(name);
};
