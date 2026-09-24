import { SubscriptionTier, UserSubscription } from '../types';
import { 
  safeLocalStorageGet, 
  safeLocalStorageSet, 
  safeLocalStorageRemove,
  safeJsonParse 
} from '../utils/storageUtils';

export interface SubscriptionPlanDef {
  id: SubscriptionTier;
  code: string;
  name: string;
  badge: string;
  price: number;
  period: string;
  validityDays: number;
  storageGB: number;
  tagline: string;
  accentGradient: string;
  borderGlow: string;
  badgeStyle: string;
  buttonGradient: string;
  popular?: boolean;
  pillTags: string[];
  features: {
    title: string;
    description: string;
    isHighlight?: boolean;
  }[];
}

export const UPI_CONFIG = {
  vpa: '9389977108@fam',
  payeeName: 'Omnisym AI',
  discordSupportUrl: 'https://discord.gg/kbvYTvtqFv',
  supportEmail: 'opopteamop@gmail.com',
  appsScriptEndpoint: 'https://script.google.com/macros/s/AKfycbxTuKXq7MlPxyPE08PFreeuZmxCAjLhNuZWy5uPP__BtmS0CJeiAa2ReFR7EGfoYs4k/exec',
  apiEndpoint: 'https://script.google.com/macros/s/AKfycbxTuKXq7MlPxyPE08PFreeuZmxCAjLhNuZWy5uPP__BtmS0CJeiAa2ReFR7EGfoYs4k/exec',
};

export const STORAGE_KEY_PRO_TIER = 'omnisym_pro_tier';
export const STORAGE_KEY_SUBSCRIPTION = 'omnisym_subscription';
export const STORAGE_KEY_USER_TIER = 'omnisym_user_tier';
export const STORAGE_KEY_PENDING_ORDER_ID = 'omnisym_pending_order_id';
export const STORAGE_KEY_PENDING_ORDER_TS = 'omnisym_pending_order_ts';
export const STORAGE_KEY_PAYMENT_HISTORY = 'omnisym_payment_history';

export const ORDER_EXPIRY_MS = 20 * 60 * 1000; // Strict 20-minute Anti-Cheat Freshness Window

export function generateOrderId(): string {
  return 'OMNI-' + Math.floor(100000 + Math.random() * 900000);
}

export function getPersistentOrderId(): string {
  const now = Date.now();
  
  let currentOrderId = localStorage.getItem(STORAGE_KEY_PENDING_ORDER_ID);
  let orderTs = localStorage.getItem(STORAGE_KEY_PENDING_ORDER_TS);
  
  // Check if order exists and is not expired (20-min window)
  if (currentOrderId && orderTs) {
    const timestamp = parseInt(orderTs, 10);
    if (!isNaN(timestamp) && (now - timestamp < ORDER_EXPIRY_MS)) {
      return currentOrderId;
    }
  }
    
    // If no order or expired, generate a fresh one
    const newOrderId = generateOrderId();
    localStorage.setItem(STORAGE_KEY_PENDING_ORDER_ID, newOrderId);
    localStorage.setItem(STORAGE_KEY_PENDING_ORDER_TS, now.toString());
    return newOrderId;
}

export function clearPersistentOrderId(): void {
  safeLocalStorageRemove(STORAGE_KEY_PENDING_ORDER_ID);
  safeLocalStorageRemove(STORAGE_KEY_PENDING_ORDER_TS);
}

export function createNewPersistentOrderId(): string {
  const newOrderId = generateOrderId();
  safeLocalStorageSet(STORAGE_KEY_PENDING_ORDER_ID, newOrderId);
  safeLocalStorageSet(STORAGE_KEY_PENDING_ORDER_TS, Date.now().toString());
  return newOrderId;
}

export function generateUpiUri(plan: SubscriptionPlanDef, orderId?: string): string {
  const note = orderId || generateOrderId();
  return `upi://pay?pa=${encodeURIComponent(UPI_CONFIG.vpa)}&pn=${encodeURIComponent(UPI_CONFIG.payeeName)}&am=${plan.price}&cu=INR&tn=${encodeURIComponent(note)}`;
}

export function getQrCodeUrl(upiLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
}

export const SUBSCRIPTION_PLANS: Record<Exclude<SubscriptionTier, 'free'>, SubscriptionPlanDef> = {
  flash: {
    id: 'flash',
    code: 'FLASH_7D',
    name: '7-Day Flash Pass',
    badge: '⚡ Quick Trial',
    price: 9,
    period: '7 Days',
    validityDays: 7,
    storageGB: 10,
    tagline: 'High-speed intelligence test drive with permanent cloud vault.',
    accentGradient: 'from-cyan-500/20 via-indigo-500/10 to-transparent',
    borderGlow: 'border-cyan-500/40 hover:border-cyan-400 shadow-cyan-500/10',
    badgeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    buttonGradient: 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20',
    pillTags: ['Fast Gemini Pro', '10 GB Vault', '8K Visuals', 'Zero Watermark'],
    features: [
      {
        title: 'Fast Gemini Pro Engine',
        description: 'Priority queue with turbo response speed & zero latency.',
        isHighlight: true,
      },
      {
        title: '10 GB Cloud Vault',
        description: 'Permanent cloud storage without 30-day deletion reset.',
      },
      {
        title: '8K Hyper-Real Image Generator',
        description: 'Ray-traced photoreal imagery with zero watermarks.',
      },
      {
        title: 'Smart Cross-Chat Memory',
        description: 'Retains your coding style, persona preferences, & avatar.',
      },
    ],
  },
  student: {
    id: 'student',
    code: 'STUDENT_30D',
    name: 'Student Monthly Pass',
    badge: '🎓 Study & Code',
    popular: true,
    price: 29,
    period: '30 Days',
    validityDays: 30,
    storageGB: 15,
    tagline: 'Comprehensive study companion, homework solver & code mentor.',
    accentGradient: 'from-blue-500/20 via-indigo-500/15 to-transparent',
    borderGlow: 'border-sky-500/50 hover:border-sky-400 shadow-sky-500/20',
    badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    buttonGradient: 'bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white shadow-sky-500/25',
    pillTags: ['Math LaTeX Solver', '1-Click PDF Notes', 'Code Explainer', '15 GB Storage'],
    features: [
      {
        title: 'AI Homework & Doubt Solver',
        description: 'Step-by-step math, physics & chemistry solutions with LaTeX.',
        isHighlight: true,
      },
      {
        title: '1-Click Notes to PDF / Flashcards',
        description: 'Convert lectures and conversation summaries into styled study docs.',
      },
      {
        title: 'Assignment & Essay Architect',
        description: 'Academic formatting tailored for school and university submissions.',
      },
      {
        title: 'Multi-Language Code Explainer',
        description: 'Line-by-line syntax breakdowns for Python, Java, C++, & Web.',
        isHighlight: true,
      },
      {
        title: '15 GB Cloud Storage Vault',
        description: 'Permanent vault for code repositories, study decks, & notes.',
      },
    ],
  },
  creator: {
    id: 'creator',
    code: 'CREATOR_30D',
    name: 'Creator Pro Pass',
    badge: '👑 All-In-One Power',
    price: 49,
    period: '30 Days',
    validityDays: 30,
    storageGB: 25,
    tagline: 'Ultimate suite for developers, video creators, & power builders.',
    accentGradient: 'from-purple-500/25 via-fuchsia-500/15 to-cyan-500/15',
    borderGlow: 'border-purple-500/60 hover:border-purple-400 shadow-purple-500/25',
    badgeStyle: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    buttonGradient: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30',
    pillTags: ['Live Sandbox & ZIP', 'Viral Creator Suite', '25 GB Vault', 'VIP Discord Role'],
    features: [
      {
        title: 'All Student & Flash Pass Features',
        description: 'Full academic suite + ultra-speed engine unlocked.',
      },
      {
        title: 'In-App Live Sandbox Preview',
        description: 'Real-time HTML/CSS/JS runner + 1-Click ZIP project download.',
        isHighlight: true,
      },
      {
        title: 'Viral Content & Video Engine',
        description: '1-Prompt viral hooks, YouTube scripts, SEO tags, & visual briefs.',
        isHighlight: true,
      },
      {
        title: 'Uncensored Creative Studio Mode',
        description: 'Urban rhyme flow, rap/drill lyric engine & immersive lore crafting.',
      },
      {
        title: '25 GB Cloud Vault + VIP Discord Role',
        description: 'Highest tier storage + instant role sync on Chiku Realm community.',
      },
    ],
  },
};

export const FREE_PLAN_INFO = {
  id: 'free',
  name: 'Free Starter',
  storageGB: 1,
  tagline: 'Standard intelligence with 30-day session archive cycle.',
};

export function getLocalSubscription(): UserSubscription {
  const raw =
    localStorage.getItem(STORAGE_KEY_PRO_TIER) ||
    localStorage.getItem(STORAGE_KEY_SUBSCRIPTION) ||
    localStorage.getItem(STORAGE_KEY_USER_TIER);
  
  // Check for Ad-based Pro status
  const adProExpiry = parseInt(localStorage.getItem('pro_watch_ads_expiry') || '0', 10);
  const isAdProActive = adProExpiry > Date.now();

  const parsed = safeJsonParse<any>(raw, null);
  if ((parsed && typeof parsed === 'object' && parsed.isPro && Number(parsed.expiresAt || parsed.expiry || (Date.now() + 30 * 24 * 3600 * 1000)) > Date.now()) || isAdProActive) {
    const now = Date.now();
    
    // Determine tier
    let tier: SubscriptionTier = 'flash';
    if (isAdProActive) {
      tier = 'creator'; // Grant Creator features for Ad-based Pro
    } else if (parsed && typeof parsed === 'object') {
      const rawPlan = String(parsed.tier || parsed.plan?.id || parsed.plan?.name || parsed.plan || parsed.activePlan || '').toLowerCase();
      if (rawPlan.includes('student')) tier = 'student';
      else if (rawPlan.includes('creator')) tier = 'creator';
      else if (rawPlan.includes('flash') || rawPlan.includes('7d') || rawPlan.includes('trial')) tier = 'flash';
    }

    const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.flash;
    
    // Determine expiry
    let expiresAt = isAdProActive ? adProExpiry : Number(parsed.expiresAt || parsed.expiry || (now + 30 * 24 * 3600 * 1000));
    let activatedAt = isAdProActive ? (adProExpiry - 5 * 24 * 3600 * 1000) : Number(parsed.activatedAt || now - 3600000);

    return {
      isPro: true,
      tier,
      planName: isAdProActive ? 'Pro (Ad-Unlocked)' : plan.name,
      badge: plan.badge,
      price: plan.price,
      currency: 'INR',
      validityDays: plan.validityDays,
      activatedAt,
      expiresAt,
      utr: parsed?.orderId || parsed?.utr || 'VERIFIED-ORDER',
      storageLimitGB: plan.storageGB,
    };
  }

  // Default free tier
  return {
    isPro: false,
    tier: 'free',
    planName: 'Free Starter',
    badge: 'FREE',
    price: 0,
    currency: 'INR',
    validityDays: 0,
    activatedAt: 0,
    expiresAt: 0,
    storageLimitGB: 1,
  };
}

export function saveLocalSubscription(sub: UserSubscription, orderId?: string): void {
  const cleanOrderId = orderId || sub.utr || 'OMNI-ORDER';
  // User requested format: localStorage.setItem('omnisym_pro_tier', JSON.stringify({ isPro: true, orderId: orderId, plan: selectedPlan, activatedAt: Date.now() }))
  safeLocalStorageSet(STORAGE_KEY_PRO_TIER, {
    isPro: sub.isPro,
    orderId: cleanOrderId,
    plan: sub.tier,
    planName: sub.planName,
    activatedAt: sub.activatedAt || Date.now(),
    expiresAt: sub.expiresAt,
  });

  safeLocalStorageSet(STORAGE_KEY_SUBSCRIPTION, sub);
  // Save omnisym_user_tier key for auto-catch compatibility
  safeLocalStorageSet(STORAGE_KEY_USER_TIER, {
    isPro: sub.isPro,
    plan: sub.planName,
    tier: sub.tier,
    orderId: cleanOrderId,
    activatedAt: sub.activatedAt,
    expiresAt: sub.expiresAt,
    hasSeenWelcome: false,
  });
  // Also save backward-compatible keys
  safeLocalStorageSet('omnisym_pro_status', {
    isPro: sub.isPro,
    activePlan: sub.planName,
    tier: sub.tier,
    expiry: sub.expiresAt,
    expiresAt: sub.expiresAt,
    utr: sub.utr,
  });
}

export interface PaymentHistoryEntry {
  orderId: string;
  tier: SubscriptionTier;
  planName: string;
  price: number;
  activatedAt: number;
}

export function saveTransactionToHistory(entry: PaymentHistoryEntry): void {
  const history = safeLocalStorageGet<PaymentHistoryEntry[]>(STORAGE_KEY_PAYMENT_HISTORY, []);
  
  // Check if duplicate
  if (history.some(h => h.orderId === entry.orderId)) return;
  
  history.unshift(entry); // Add to beginning
  // Keep last 10 transactions
  const trimmedHistory = history.length > 10 ? history.slice(0, 10) : history;
  
  safeLocalStorageSet(STORAGE_KEY_PAYMENT_HISTORY, trimmedHistory);
}

export function getPaymentHistory(): PaymentHistoryEntry[] {
  return safeLocalStorageGet<PaymentHistoryEntry[]>(STORAGE_KEY_PAYMENT_HISTORY, []);
}
