import { SlashCommandInfo, UserProfile } from '../types';

export const PRESET_USERS: UserProfile[] = [
  {
    id: 'user_prabhjot',
    name: 'Prabhjot',
    displayName: 'Prabhjot',
    email: 'prabhjot.singh@omnisym.ai',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    badge: 'System Verified',
    isGuest: false,
  },
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    displayName: 'Alex Rivera',
    email: 'alex.rivera@creative.dev',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    badge: 'System Verified',
    isGuest: false,
  },
  {
    id: 'user_guest',
    name: 'Guest Explorer',
    displayName: 'Guest Explorer',
    email: 'guest@omnisym.local',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badge: 'Guest Session',
    isGuest: true,
  },
];

export const SLASH_COMMANDS: SlashCommandInfo[] = [
  {
    command: '/code',
    type: 'code',
    title: 'Write Code & Architect',
    description: 'Senior engineer mode for optimized code, refactoring & algorithms',
    iconName: 'Code2',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    example: '/code Build a React hook for debounced window resize listener',
  },
  {
    command: '/research',
    type: 'research',
    title: 'Deep Web Research',
    description: 'Ground answers in real-time global search data with verified citations',
    iconName: 'Search',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    example: '/research Latest breakthroughs in quantum computing and room-temp superconductors',
  },
  {
    command: '/3d',
    type: '3d',
    title: '3D & Spatial Assets',
    description: 'Generate 3D prompts, Three.js scenes, shaders, and geometry definitions',
    iconName: 'Box',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    example: '/3d Generate a glowing holographic torus knot wireframe in Three.js',
  },
  {
    command: '/human',
    type: 'human',
    title: 'Empathetic Human Mode',
    description: 'Warm, conversational partner with high emotional intelligence & depth',
    iconName: 'HeartHandshake',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    example: '/human Help me reflect on balancing technical ambition with personal wellbeing',
  },
  {
    command: '/roast',
    type: 'roast',
    title: 'Savage Roast Mode 🔥',
    description: 'Sharp, witty analysis of relatable habits and everyday situations',
    iconName: 'Flame',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    example: '/roast Roast my procrastination habits and explain why I keep scrolling',
  },
  {
    command: '/temp',
    type: 'temp',
    title: 'Incognito Ephemeral Chat',
    description: 'Temporary session with zero logs and no history retention',
    iconName: 'ShieldAlert',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    example: '/temp Quick confidential brainstorm',
  },
];

export const QUICK_SUGGESTIONS = [
  {
    id: 'sug_foryou',
    label: 'Insights',
    icon: 'Sparkles',
    prompt: 'Analyse current global trends and provide a curated list of interesting insights and personalised recommendations.',
    isImageGen: false,
    color: 'hover:border-violet-300 hover:bg-violet-50/50',
    iconColor: 'text-violet-600',
  },
  {
    id: 'sug_tech',
    label: 'Tech Analysis',
    icon: 'Zap',
    prompt: 'Explain the most disruptive innovation currently emerging in the technology sector with precision and strategic depth.',
    isImageGen: false,
    color: 'hover:border-amber-300 hover:bg-amber-50/50',
    iconColor: 'text-amber-600',
  },
  {
    id: 'sug_cinema',
    label: 'Cinematic Arts',
    icon: 'Sparkles',
    prompt: 'Suggest a selection of avant-garde or innovative cinematic masterpieces for an immersive viewing experience.',
    isImageGen: false,
    color: 'hover:border-sky-300 hover:bg-sky-50/50',
    iconColor: 'text-sky-600',
  },
  {
    id: 'sug_creative',
    label: 'Creative Engine',
    icon: 'Box',
    prompt: 'Provide a fresh, visionary concept for a new high-impact creative project involving minimalist design or architecture.',
    isImageGen: false,
    color: 'hover:border-purple-300 hover:bg-purple-50/50',
    iconColor: 'text-purple-600',
  },
  {
    id: 'sug_roast',
    label: 'Roast Analysis',
    icon: 'Flame',
    prompt: 'Provide a sharp, witty roast regarding my daily productivity habits and professional procrastination.',
    isImageGen: false,
    color: 'hover:border-orange-300 hover:bg-orange-50/50',
    iconColor: 'text-orange-600',
  },
];

export const FEEDBACK_CATEGORIES = [
  'Incorrect facts or info',
  'Tone or vibe issue',
  'Image generation mismatch',
  'Slow latency or network lag',
  'Other feedback',
];

export interface TrendingPrompt {
  id: string;
  category: 'For You' | 'Technology' | 'Creative' | 'Entertainment' | 'Education';
  title: string;
  prompt: string;
  tag: string;
  popularity: string;
  icon: 'Code2' | 'Search' | 'Sparkles' | 'Box' | 'Zap' | 'Flame';
  isImageGen?: boolean;
}

export const TRENDING_PROMPTS: TrendingPrompt[] = [
  {
    id: 'trend_foryou',
    category: 'For You',
    title: '✨ Daily Intelligence Wrap',
    prompt: 'Provide a curated summary of today\'s top technological breakthroughs, creative challenges, and professional insights.',
    tag: 'Personalised · Curated',
    popularity: '🌟 Recommended for you',
    icon: 'Sparkles',
  },
  {
    id: 'trend_1',
    category: 'Technology',
    title: '🚀 Future of AI Systems',
    prompt: 'Analyse the latest advancements at the intersection of large language models, robotics, and autonomous systems.',
    tag: 'Tech · Systems',
    popularity: '🔥 4.2k active researchers',
    icon: 'Zap',
  },
  {
    id: 'trend_2',
    category: 'Creative',
    title: '🎨 Modern Aesthetic Principles',
    prompt: 'Discuss current shifts in minimalist architecture, functional UI design, and modern brand identity systems.',
    tag: 'Design · Theory',
    popularity: '⚡ Trending with designers',
    icon: 'Zap',
  },
  {
    id: 'trend_3',
    category: 'Entertainment',
    title: '🍿 Cinematic Masterpieces',
    prompt: 'Recommend a list of cult classic films recognised for their exceptional cinematography and narrative depth.',
    tag: 'Cinema · Arts',
    popularity: '🎬 2.4k cinephiles',
    icon: 'Sparkles',
  },
  {
    id: 'trend_4',
    category: 'Education',
    title: '💻 Economic Infrastructure',
    prompt: 'Explain the evolution of global internet infrastructure and the impact of the Dot Com Bubble on modern venture capital.',
    tag: 'History · Strategic',
    popularity: '🌟 Top educational query',
    icon: 'Search',
  },
];

