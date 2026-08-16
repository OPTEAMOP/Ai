import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layout, Search, Sparkles, MessageSquare, Zap, BookOpen, Code2, Layers } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'analysis' | 'code' | 'creative' | 'general';
  icon: React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Bade text ko short aur sweet points mein convert karein.',
    prompt: '/summarize Is text ko point-wise summarize kar de: \n\n',
    category: 'analysis',
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: 'explain',
    name: 'Explain Simply',
    description: 'Mushkil concepts ko asaan Hinglish mein samjhein.',
    prompt: '/explain Is concept ko ek chote bachhe ki tarah asaan Hinglish mein samjha: ',
    category: 'general',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: 'refactor',
    name: 'Refactor Code',
    description: 'Code ki quality improve karein aur bugs fix karein.',
    prompt: '/refactor Is code ko clean aur optimize kar de: \n\n```\n\n```',
    category: 'code',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    id: 'translate',
    name: 'Translate to English',
    description: 'Hinglish ya Hindi ko perfect English mein badlein.',
    prompt: 'Is content ko professionally English mein translate kar: ',
    category: 'general',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: 'grammar',
    name: 'Fix Grammar',
    description: 'Spelling aur grammar mistakes ko sahi karein.',
    prompt: 'Is text ki grammar aur spelling check karke sahi version de: ',
    category: 'analysis',
    icon: <CheckIcon className="w-4 h-4" />,
  },
  {
    id: 'story',
    name: 'Story Generator',
    description: 'Ek creative aur interesting kahani likhwayein.',
    prompt: 'Ek mast aur short kahani sunao jisme ye elements ho: ',
    category: 'creative',
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: 'email',
    name: 'Email Writer',
    description: 'Professional ya casual emails likhwayein.',
    prompt: 'Mujhe ek email likh ke de jisme ye baat karni ho: ',
    category: 'general',
    icon: <Layers className="w-4 h-4" />,
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (prompt: string) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  const [activeCategory, setActiveCategory] = React.useState<'all' | Template['category']>('all');

  const filteredTemplates = activeCategory === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Template Library</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Common prompts to speed up your workflow</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-[#121212] overflow-x-auto no-scrollbar">
              {(['all', 'analysis', 'code', 'creative', 'general'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth no-scrollbar bg-white dark:bg-[#1a1a1a]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <motion.button
                    key={template.id}
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onUseTemplate(template.prompt);
                      onClose();
                    }}
                    className="flex flex-col text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {template.icon}
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#121212] flex items-center justify-center">
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                <Search className="w-3 h-3" /> Tip: Press <kbd className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">⌘ K</kbd> to focus input anytime.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
