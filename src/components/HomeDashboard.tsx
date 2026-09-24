import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Image as ImageIcon,
  Code2,
  Search,
  Box,
  ArrowRight,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
  Layers,
  Crown,
  FileCode,
  GraduationCap,
  Calculator,
  BookOpen,
  FileDown,
  Lock,
} from 'lucide-react';
import { QUICK_SUGGESTIONS, TRENDING_PROMPTS, TrendingPrompt } from '../data/constants';
import { UserProfile, UserSubscription } from '../types';
import { getUserAvatar, getUserDisplayName, toTitleCase } from '../utils/userUtils';

interface HomeDashboardProps {
  user: UserProfile;
  subscription?: UserSubscription;
  onOpenSubscription?: () => void;
  onOpenLiveSandbox?: () => void;
  onSelectPrompt: (prompt: string, isImageGen?: boolean) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4" />,
  Image: <ImageIcon className="w-4 h-4" />,
  Code2: <Code2 className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
  Box: <Box className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Flame: <Flame className="w-4 h-4" />,
};

type TrendCategory = 'All' | 'For You' | 'Technology' | 'Creative' | 'Entertainment' | 'Education';

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  subscription,
  onOpenSubscription,
  onOpenLiveSandbox,
  onSelectPrompt,
}) => {
  const userName = user.displayName || user.name || 'Prabhjot';
  const firstName = userName.includes(' ') ? userName.split(' ')[0] : userName;

  const isPro = subscription?.isPro;

  const [activeTrendCategory, setActiveTrendCategory] = useState<TrendCategory>('All');
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredTrendingPrompts = TRENDING_PROMPTS.filter((item) => {
    if (activeTrendCategory === 'All') return true;
    return item.category === activeTrendCategory;
  });

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 340;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div id="home-dashboard" className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-8 max-w-5xl mx-auto w-full text-center overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Animated Omnisym Logo Badge */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-5 relative"
      >
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center border border-indigo-500 shadow-xl shadow-indigo-500/30 mx-auto premium-shadow">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
      </motion.div>

      {/* Main Greeting Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-3">
          Hello, {toTitleCase(firstName)}
        </h1>
        <p className="mt-2 text-slate-500 text-lg font-medium">What's on your mind today?</p>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto font-normal">
          Ready for advanced coding, student problem solving, and zero-code app creation.
        </p>
      </motion.div>

      {/* Student & Creator Suite Quick Power Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.14 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-2xl"
      >
        {/* Homework Doubt Solver */}
        <button
          type="button"
          onClick={() => onSelectPrompt('Solve this math/physics problem step-by-step with clear LaTeX formulas and concise final verification: ')}
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Math Solver</span>
        </button>

        {/* Notes to PDF Deck */}
        <button
          type="button"
          onClick={() => onSelectPrompt('Convert the following lecture notes into clean structured markdown bullet points, key takeaways, and flashcard summary: ')}
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notes & Study</span>
        </button>
      </motion.div>

      {/* Quick Action Suggestion Chips Grid (Compact & Tightly Packed) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22 }}
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl text-left"
      >
        {QUICK_SUGGESTIONS.map((chip, cIdx) => (
          <button
            key={chip.id ? `sug_${chip.id}_${cIdx}` : `sug_chip_${cIdx}`}
            type="button"
            id={`suggestion-chip-${chip.id}`}
            onClick={() => onSelectPrompt(chip.prompt, chip.isImageGen)}
            className="py-3 px-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-250 ease-in-out flex items-center gap-3 group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-0.5"
          >
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              {ICON_MAP[chip.icon] || <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-900">
                  {chip.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-zinc-500 line-clamp-1 leading-normal font-medium">
                {chip.prompt}
              </p>
            </div>
          </button>
        ))}
      </motion.div>

      {/* Persona Badges / Slash command indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.28 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs"
      >
        <span className="text-[11px] font-bold text-zinc-400 mr-2 uppercase tracking-widest">Shortcuts:</span>
        <button
          onClick={() => onSelectPrompt('/code ')}
          className="font-mono text-[11px] px-3 py-1 rounded-lg bg-slate-50 text-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all cursor-pointer"
        >
          /code
        </button>
        <button
          onClick={() => onSelectPrompt('/research ')}
          className="font-mono text-[11px] px-3 py-1 rounded-lg bg-slate-50 text-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all cursor-pointer"
        >
          /research
        </button>
        <button
          onClick={() => onSelectPrompt('/3d ')}
          className="font-mono text-[11px] px-3 py-1 rounded-lg bg-slate-50 text-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-200 transition-all cursor-pointer"
        >
          /3d
        </button>
      </motion.div>
    </div>
  );
};

