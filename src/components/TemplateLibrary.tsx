import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layout, Search, Sparkles, MessageSquare, Zap, BookOpen, Code2, Layers } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'productivity' | 'tech' | 'roasts' | 'creative';
  icon: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'summarise',
    name: 'Efficient Summariser',
    description: 'Transform complex documents and lengthy articles into concise, actionable insights within seconds.',
    prompt: 'Summarise this text into short, sweet points: \n\n',
    category: 'productivity',
    icon: '⚡',
  },
  {
    id: 'explain',
    name: 'Conceptual Breakdown',
    description: 'Simplify complex theories and academic topics into clear, understandable language.',
    prompt: 'Explain this concept simply: ',
    category: 'productivity',
    icon: '🧠',
  },
  {
    id: 'tech-trends',
    name: 'Technology Analysis',
    description: 'Receive strategic breakdowns of emerging innovations and disruptive technological shifts.',
    prompt: 'Explain the most disruptive innovation currently emerging in the technology sector with precision and depth.',
    category: 'tech',
    icon: '🚀',
  },
  {
    id: 'creative-spark',
    name: 'Visionary Concept',
    description: 'Generate high-impact concepts and visionary ideas for your next creative or design project.',
    prompt: 'Provide a fresh, visionary concept for a new high-impact creative project involving minimalist design or architecture.',
    category: 'creative',
    icon: '🎨',
  },
  {
    id: 'roast',
    name: 'Strategic Critique',
    description: 'Generate sophisticated and witty critiques of relatable professional habits or strategic decisions.',
    prompt: 'Provide a sharp, witty roast regarding my daily productivity habits and professional procrastination.',
    category: 'roasts',
    icon: '🔥',
  },
];

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

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'productivity', label: '📚 Productivity' },
    { id: 'tech', label: '🚀 Technology' },
    { id: 'creative', label: '🎨 Creative' },
    { id: 'roasts', label: '🔥 Critique' },
  ] as const;

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
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-50 flex items-center justify-center">
                  <Layout className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Omnisym Arsenal</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Advanced tools for coding, creative intelligence, and problem solving.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-slate-50/50 overflow-x-auto no-scrollbar border-b border-slate-50">
              {categories.map((cat, cIdx) => (
                <button
                  key={`tpl_cat_${cat.id}_${cIdx}`}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 scroll-smooth no-scrollbar bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                {filteredTemplates.map((template, tIdx) => (
                  <motion.button
                    key={template.id ? `tpl_${template.id}_${tIdx}` : `tpl_item_${tIdx}`}
                    layout
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onUseTemplate(template.prompt);
                      onClose();
                    }}
                    className="flex flex-col text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md hover:border-purple-400 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-purple-50 transition-colors text-base sm:text-lg">
                        {template.icon}
                      </div>
                      <span className="text-sm sm:text-[16px] font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] text-gray-500 leading-tight sm:leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-center">
              <p className="text-[11px] sm:text-[12px] text-gray-400 font-medium text-center">
                Tip: Press ⌘K to open the global command search... or simply start typing.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
