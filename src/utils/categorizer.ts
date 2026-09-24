export type SessionCategory =
  | 'Programming'
  | 'Research'
  | 'Creative'
  | 'Writing'
  | 'Problem Solving'
  | 'General';

export interface CategorizationResult {
  category: SessionCategory;
  tags: string[];
  confidence: number;
}

export interface CategoryMeta {
  label: SessionCategory;
  description: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  activeFilterClass: string;
}

export const CATEGORIES: SessionCategory[] = [
  'Programming',
  'Research',
  'Creative',
  'Writing',
  'Problem Solving',
  'General',
];

export const CATEGORY_META: Record<SessionCategory, CategoryMeta> = {
  Programming: {
    label: 'Programming',
    description: 'Code architecture, refactoring, algorithms & debugging',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    activeFilterClass:
      'bg-emerald-600 text-white shadow-xs dark:bg-emerald-600',
  },
  Research: {
    label: 'Research',
    description: 'Deep factual search, citations & analytical synthesis',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    dotClass: 'bg-sky-500',
    borderClass: 'border-sky-300 dark:border-sky-700',
    activeFilterClass: 'bg-sky-600 text-white shadow-xs dark:bg-sky-600',
  },
  Creative: {
    label: 'Creative',
    description: 'Image synthesis, 3D modeling, storytelling & creative hype',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    dotClass: 'bg-purple-500',
    borderClass: 'border-purple-300 dark:border-purple-700',
    activeFilterClass:
      'bg-purple-600 text-white shadow-xs dark:bg-purple-600',
  },
  Writing: {
    label: 'Writing',
    description: 'Translation, summarization, copywriting & documentation',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-300 dark:border-amber-700',
    activeFilterClass:
      'bg-amber-600 text-white shadow-xs dark:bg-amber-600',
  },
  'Problem Solving': {
    label: 'Problem Solving',
    description: 'Mathematics, logic puzzles, troubleshooting & strategies',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-300 dark:border-rose-700',
    activeFilterClass: 'bg-rose-600 text-white shadow-xs dark:bg-rose-600',
  },
  General: {
    label: 'General',
    description: 'Casual chat, quick questions & multi-domain guidance',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    borderClass: 'border-slate-300 dark:border-slate-700',
    activeFilterClass:
      'bg-slate-800 text-white shadow-xs dark:bg-slate-700',
  },
};

/**
 * Automated Intent Detection & Categorization Layer
 * Evaluates user input, slash command mode, AI output, and syntax patterns
 * to accurately assign intent category and contextual sub-tags.
 */
export function detectSessionCategory(input: {
  text: string;
  mode?: string;
  assistantText?: string;
  hasImageAttachment?: boolean;
  isImageGen?: boolean;
}): CategorizationResult {
  const { text = '', mode = 'default', assistantText = '', hasImageAttachment = false, isImageGen = false } = input;
  const lowerText = text.toLowerCase();
  const lowerAssistant = assistantText.toLowerCase();
  const combined = `${lowerText} ${lowerAssistant}`;

  const tagsSet = new Set<string>();

  // 1. Direct Mode Routing
  if (mode === 'code') {
    tagsSet.add('Code Architecture');
  } else if (mode === 'research') {
    tagsSet.add('Web Research');
  } else if (mode === '3d') {
    tagsSet.add('3D Spatial');
  }

  // 2. Direct Image Generation Detection
  if (
    isImageGen ||
    lowerText.includes('generate image') ||
    lowerText.includes('create image') ||
    lowerText.includes('draw ') ||
    lowerText.includes('generate picture') ||
    lowerText.includes('image of') ||
    mode === '3d'
  ) {
    tagsSet.add('Image Gen');
    if (mode === '3d' || lowerText.includes('3d') || lowerText.includes('render') || lowerText.includes('blender')) {
      tagsSet.add('3D Modeling');
    }
    return {
      category: 'Creative',
      tags: ['Creative', ...Array.from(tagsSet).slice(0, 2)],
      confidence: 0.95,
    };
  }

  // 3. Programming Intent Detection
  const programmingPatterns = [
    /\b(react|typescript|javascript|python|java|c\+\+|golang|rust|php|swift|kotlin|ruby)\b/i,
    /\b(html|css|tailwind|vite|node|express|nextjs|django|flask|spring|fastapi)\b/i,
    /\b(sql|postgres|mysql|mongodb|firestore|database|sqlite|prisma|drizzle)\b/i,
    /\b(api|endpoint|rest|graphql|json|jwt|oauth|cors|axios|fetch|postman)\b/i,
    /\b(git|github|docker|kubernetes|aws|cloud|ci\/cd|webpack|babel|npm|yarn|bun)\b/i,
    /\b(function|const|let|var|class|interface|type|enum|return|import|export|async|await)\b/i,
    /\b(refactor|debug|bug|fix error|stack trace|nullpointer|exception|syntax error)\b/i,
    /\b(algorithm|data structure|binary tree|sorting|recursion|big o|leetcode)\b/i,
    /```[\s\S]*?```/,
  ];

  let programmingScore = 0;
  if (mode === 'code') programmingScore += 3;
  if (text.includes('```') || assistantText.includes('```')) programmingScore += 3;

  for (const pattern of programmingPatterns) {
    if (pattern.test(combined)) programmingScore++;
  }

  // Extract specific tech tags
  if (/\b(typescript|ts|type safe)\b/i.test(combined)) tagsSet.add('TypeScript');
  if (/\b(javascript|js|es6|node)\b/i.test(combined)) tagsSet.add('JavaScript');
  if (/\b(python|django|fastapi|pandas|numpy)\b/i.test(combined)) tagsSet.add('Python');
  if (/\b(react|nextjs|jsx|tsx|hook|component)\b/i.test(combined)) tagsSet.add('React');
  if (/\b(sql|database|query|firestore|postgres)\b/i.test(combined)) tagsSet.add('Database');
  if (/\b(api|endpoint|route|backend|rest)\b/i.test(combined)) tagsSet.add('API');
  if (/\b(refactor|clean code|optimize)\b/i.test(combined)) tagsSet.add('Refactor');
  if (/\b(debug|fix|error|bug|issue)\b/i.test(combined)) tagsSet.add('Debugging');

  if (programmingScore >= 2 || (mode === 'code' && text.length > 0)) {
    const finalTags = tagsSet.size > 0 ? Array.from(tagsSet).slice(0, 3) : ['Architecture'];
    return {
      category: 'Programming',
      tags: ['Programming', ...finalTags],
      confidence: Math.min(0.98, 0.6 + programmingScore * 0.1),
    };
  }

  // 4. Research Intent Detection
  const researchPatterns = [
    /\b(research|search|sources|citations|grounding|google search)\b/i,
    /\b(study|paper|statistics|data analysis|trends|market share|metrics)\b/i,
    /\b(history of|who invented|origin of|timeline|when was|historical)\b/i,
    /\b(science|physics|chemistry|biology|astronomy|quantum|neuroscience)\b/i,
    /\b(compare and contrast|pros and cons|vs|difference between|evaluation)\b/i,
    /\b(explain how|deep dive|comprehensive guide|state of the art)\b/i,
  ];

  let researchScore = 0;
  if (mode === 'research') researchScore += 3;

  for (const pattern of researchPatterns) {
    if (pattern.test(combined)) researchScore++;
  }

  if (/\b(science|physics|quantum|biology)\b/i.test(combined)) tagsSet.add('Science');
  if (/\b(market|industry|trends|finance|economy)\b/i.test(combined)) tagsSet.add('Market Analysis');
  if (/\b(history|origin|timeline|ancient)\b/i.test(combined)) tagsSet.add('History');
  if (/\b(compare|difference|evaluation|vs)\b/i.test(combined)) tagsSet.add('Comparative');
  if (mode === 'research' || /\b(research|deep dive|citations)\b/i.test(combined)) tagsSet.add('Deep Dive');

  if (researchScore >= 2 || mode === 'research') {
    const finalTags = tagsSet.size > 0 ? Array.from(tagsSet).slice(0, 3) : ['Deep Dive'];
    return {
      category: 'Research',
      tags: ['Research', ...finalTags],
      confidence: Math.min(0.95, 0.6 + researchScore * 0.1),
    };
  }

  // 5. Creative Intent Detection
  const creativePatterns = [
    /\b(story|tale|fiction|novel|plot|character|dialogue|script)\b/i,
    /\b(poem|poetry|lyrics|song|verse|rap|rhyme|music)\b/i,
    /\b(art|design|aesthetic|visual|illustration|drawing|concept art)\b/i,
    /\b(youtube title|announcement|discord hype|clickbait|hook|viral)\b/i,
    /\b(brainstorm|idea generation|creative ideas|creative writing)\b/i,
  ];

  let creativeScore = 0;
  if (hasImageAttachment) creativeScore += 2;

  for (const pattern of creativePatterns) {
    if (pattern.test(combined)) creativeScore++;
  }

  if (/\b(story|tale|character|novel)\b/i.test(combined)) tagsSet.add('Storytelling');
  if (/\b(poem|poetry|lyrics|song)\b/i.test(combined)) tagsSet.add('Music & Poetry');
  if (/\b(youtube|discord|announcement|hook|hype)\b/i.test(combined)) tagsSet.add('Content Creation');
  if (/\b(design|ui\/ux|aesthetic|visual)\b/i.test(combined)) tagsSet.add('Design');
  if (hasImageAttachment) tagsSet.add('Vision Analysis');

  if (creativeScore >= 2) {
    const finalTags = tagsSet.size > 0 ? Array.from(tagsSet).slice(0, 3) : ['Concept'];
    return {
      category: 'Creative',
      tags: ['Creative', ...finalTags],
      confidence: Math.min(0.92, 0.55 + creativeScore * 0.1),
    };
  }

  // 6. Writing & Communication Intent Detection
  const writingPatterns = [
    /\b(translate|translation|hinglish to english|english to hindi)\b/i,
    /\b(summarize|summary|tl;dr|key points|bullet points)\b/i,
    /\b(grammar|proofread|spell check|correct english|tone of voice)\b/i,
    /\b(email|letter|formal email|cover letter|resignation|memo)\b/i,
    /\b(rewrite|paraphrase|copywriting|essay|blog post|article|documentation)\b/i,
  ];

  let writingScore = 0;
  for (const pattern of writingPatterns) {
    if (pattern.test(combined)) writingScore++;
  }

  if (/\b(translate|translation|hindi|english|hinglish)\b/i.test(combined)) tagsSet.add('Translation');
  if (/\b(summarize|summary|tldr|bullet points)\b/i.test(combined)) tagsSet.add('Summarization');
  if (/\b(grammar|proofread|spell|correction)\b/i.test(combined)) tagsSet.add('Grammar & Polish');
  if (/\b(email|letter|formal)\b/i.test(combined)) tagsSet.add('Email & Letter');
  if (/\b(copywriting|marketing|blog|article)\b/i.test(combined)) tagsSet.add('Copywriting');

  if (writingScore >= 2) {
    const finalTags = tagsSet.size > 0 ? Array.from(tagsSet).slice(0, 3) : ['Copywriting'];
    return {
      category: 'Writing',
      tags: ['Writing', ...finalTags],
      confidence: Math.min(0.92, 0.55 + writingScore * 0.1),
    };
  }

  // 7. Problem Solving / Mathematics Intent Detection
  const problemSolvingPatterns = [
    /\b(calculate|equation|algebra|calculus|probability|math|formula)\b/i,
    /\b(logic puzzle|riddle|brain teaser|sudoku|chess)\b/i,
    /\b(solve this|find x|step by step solution|troubleshoot|root cause)\b/i,
    /\b(strategy|optimization|decision matrix|tradeoff)\b/i,
  ];

  let problemScore = 0;
  for (const pattern of problemSolvingPatterns) {
    if (pattern.test(combined)) problemScore++;
  }

  if (/\b(math|calculate|equation|algebra|calculus)\b/i.test(combined)) tagsSet.add('Mathematics');
  if (/\b(logic|puzzle|riddle|reasoning)\b/i.test(combined)) tagsSet.add('Logic & Puzzles');
  if (/\b(troubleshoot|root cause|diagnose)\b/i.test(combined)) tagsSet.add('Troubleshooting');

  if (problemScore >= 2) {
    const finalTags = tagsSet.size > 0 ? Array.from(tagsSet).slice(0, 3) : ['Logic'];
    return {
      category: 'Problem Solving',
      tags: ['Problem Solving', ...finalTags],
      confidence: Math.min(0.9, 0.55 + problemScore * 0.1),
    };
  }

  // 8. Default Fallback -> General
  return {
    category: 'General',
    tags: ['General', 'Conversation'],
    confidence: 0.5,
  };
}
