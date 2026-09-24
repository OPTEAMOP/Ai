import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Sparkles,
  Zap,
  GraduationCap,
  Crown,
  ShieldCheck,
  Copy,
  ExternalLink,
  Clock,
  ArrowRight,
  ChevronRight,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  FileCode,
  Loader2,
  MessageSquare,
  Camera,
  Mail,
  ChevronDown,
  HelpCircle,
  Image as ImageIcon,
  Cpu,
  Layers,
  Flame,
  Activity,
  Search,
  Lock,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { SubscriptionTier, UserSubscription, UserProfile } from '../types';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlanDef,
  UPI_CONFIG,
  STORAGE_KEY_PRO_TIER,
  STORAGE_KEY_SUBSCRIPTION,
  STORAGE_KEY_USER_TIER,
  STORAGE_KEY_PENDING_ORDER_ID,
  ORDER_EXPIRY_MS,
  getLocalSubscription,
  generateOrderId,
  getPersistentOrderId,
  clearPersistentOrderId,
  createNewPersistentOrderId,
  generateUpiUri,
  getQrCodeUrl,
  saveLocalSubscription,
  saveTransactionToHistory,
  getPaymentHistory,
  PaymentHistoryEntry,
} from '../data/subscriptionPlans';
import { logActivity } from '../lib/firestoreUtils';
import { QrCodeScannerModal } from './QrCodeScannerModal';
import { ProAccessManager } from './ProAccessManager';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  currentSubscription: UserSubscription;
  onSubscriptionUpdated?: (newSub: UserSubscription) => void;
  onSubscriptionSuccess?: (newSub: UserSubscription) => void;
  onOpenLiveSandbox?: () => void;
  initialSelectedTier?: SubscriptionTier;
  initialTier?: SubscriptionTier;
  storageUsageMB?: number;
  addToast?: (toast: { type: 'success' | 'error' | 'info' | 'cloud'; title: string; description: string }) => void;
}

declare global {
  interface Window {
    __OMNISYM_START_VERIFICATION__?: () => void;
  }
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentSubscription,
  onSubscriptionUpdated,
  onSubscriptionSuccess,
  onOpenLiveSandbox,
  initialSelectedTier,
  initialTier = 'student',
  storageUsageMB = 4.2,
  addToast,
}) => {
  const effectiveInitialTier = initialTier || initialSelectedTier || 'student';
  // Step state: 'select' | 'checkout' | 'success'
  const [activeStep, setActiveStep] = useState<'select' | 'checkout' | 'success'>('select');
  const [selectedTierKey, setSelectedTierKey] = useState<Exclude<SubscriptionTier, 'free'>>(
    effectiveInitialTier === 'free' ? 'student' : (effectiveInitialTier as any)
  );

  // Checkout states with Persistent Order Locking & Multi-Tab Sync
  const [currentOrderId, setCurrentOrderId] = useState<string>(() => getPersistentOrderId());
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('Verifying with Banking Network...');
  const [timerSeconds, setTimerSeconds] = useState(1200); // 20 minutes strict anti-cheat freshness window
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generatedUri, setGeneratedUri] = useState<string>('');
  const [pollCheckCount, setPollCheckCount] = useState(0);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showUtrFallback, setShowUtrFallback] = useState(false);

  // Payment auto-detection radar state
  const [radarDetected, setRadarDetected] = useState(false);
  const hasTriggeredActivationRef = useRef(false);

  // Verification Visual Progress Tracker State
  const [verificationStage, setVerificationStage] = useState<'idle' | 'handshake' | 'bank_query' | 'provisioning' | 'verified'>('idle');
  const [verificationProgress, setVerificationProgress] = useState<number>(0);
  const [verificationStatusDetail, setVerificationStatusDetail] = useState<string>('');

  const selectedPlan: SubscriptionPlanDef = SUBSCRIPTION_PLANS[selectedTierKey] || SUBSCRIPTION_PLANS.student;

  // Multi-Tab Order Synchronization: Keeps active orderId & subscription state synced across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PENDING_ORDER_ID && e.newValue) {
        setCurrentOrderId(e.newValue);
      }
      if (
        e.key === STORAGE_KEY_PRO_TIER ||
        e.key === STORAGE_KEY_SUBSCRIPTION ||
        e.key === STORAGE_KEY_USER_TIER
      ) {
        const freshSub = getLocalSubscription();
        if (freshSub.isPro && !hasTriggeredActivationRef.current) {
          const matchingPlan = SUBSCRIPTION_PLANS[freshSub.tier as keyof typeof SUBSCRIPTION_PLANS] || selectedPlan;
          triggerInstantActivation(matchingPlan, freshSub.utr);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedPlan]);

  // Load payment history on mount
  useEffect(() => {
    setPaymentHistory(getPaymentHistory());
  }, [isOpen]);

  const handleOpenPaymentApp = () => {
    if (!generatedUri) return;
    try {
      window.location.href = generatedUri;
    } catch {
      window.open(generatedUri, '_blank');
    }
  };

  // Reset or initialize on open with Persistent Order Lock preservation
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedTier && initialSelectedTier !== 'free') {
        setSelectedTierKey(initialSelectedTier as any);
      }
      const lockedOrderId = getPersistentOrderId();
      setCurrentOrderId(lockedOrderId);
      setUtrInput('');
      setUtrError(null);
      setIsVerifying(false);
      setTimerSeconds(1200);
      setActiveStep('select');
      hasTriggeredActivationRef.current = false;
      setRadarDetected(false);
      setPollCheckCount(0);
      setShowUtrFallback(false);
    }
  }, [isOpen, initialSelectedTier]);

  // Generate dynamic QR Code whenever selected plan changes or user proceeds to checkout
  useEffect(() => {
    if (!isOpen) return;
    const uri = generateUpiUri(selectedPlan, currentOrderId);
    setGeneratedUri(uri);

    QRCode.toDataURL(uri, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [selectedPlan, isOpen, activeStep, currentOrderId]);

  // 20-minute countdown clock
  useEffect(() => {
    if (activeStep !== 'checkout' || !isOpen) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 1200; // soft restart after 20 min
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStep, isOpen]);

  // Trigger Instant Pro Activation & UI Unlock
  const triggerInstantActivation = (plan: SubscriptionPlanDef, customUtr?: string) => {
    if (hasTriggeredActivationRef.current) return;
    hasTriggeredActivationRef.current = true;
    setRadarDetected(true);
    setIsVerifying(true);
    setVerificationStage('provisioning');
    setVerificationProgress(95);
    setVerificationStatusDetail(`Bank clearance confirmed! Provisioning ${plan.storageGB} GB permanent vault & priority AI compute...`);
    setVerifyMessage('⚡ Payment Verified! Pro Unlocked 🎉');

    setTimeout(() => {
      setVerificationStage('verified');
      setVerificationProgress(100);
      setVerificationStatusDetail('Omnisym Pro successfully activated!');
      setIsVerifying(false);
      const now = Date.now();
      const expiresAt = now + plan.validityDays * 24 * 60 * 60 * 1000;
      const cleanUtr = customUtr || currentOrderId || 'AUTO-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const updatedSub: UserSubscription = {
        isPro: true,
        tier: plan.id,
        planName: plan.name,
        badge: plan.badge,
        price: plan.price,
        currency: 'INR',
        validityDays: plan.validityDays,
        activatedAt: now,
        expiresAt: expiresAt,
        utr: cleanUtr,
        storageLimitGB: plan.storageGB,
      };

      // Save locally to localStorage
      saveLocalSubscription(updatedSub);
      
      // Save to payment history
      saveTransactionToHistory({
        orderId: cleanUtr,
        tier: plan.id,
        planName: plan.name,
        price: plan.price,
        activatedAt: now
      });
      setPaymentHistory(getPaymentHistory());

      try {
        localStorage.setItem(STORAGE_KEY_PRO_TIER, plan.id);
        localStorage.setItem('omnisym_user_tier', JSON.stringify({
          isPro: true,
          tier: plan.id,
          hasSeenWelcome: false,
          activatedAt: now,
        }));
      } catch {
        // Safe fallback
      }

      // Clear the locked Order ID
      clearPersistentOrderId();

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#fbbf24'],
      });

      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 } });
      }, 250);

      // Log activity to firestore
      logActivity(
        currentUser?.id || 'anon_user',
        currentUser?.email || 'user@omnisym.ai',
        'subscription_activated',
        {
          userName: currentUser?.displayName || currentUser?.name || 'Omnisym User',
          details: `Activated ${plan.name} (₹${plan.price}) - Order ID / UTR: ${cleanUtr}`,
        }
      ).catch(() => {});

      if (onSubscriptionSuccess) {
        onSubscriptionSuccess(updatedSub);
      } else if (onSubscriptionUpdated) {
        onSubscriptionUpdated(updatedSub);
      }
      setActiveStep('success');

      // 1. External Post-Payment Routing (User Request: Secure Verification Flow)
      if (window.__OMNISYM_START_VERIFICATION__) {
        setTimeout(() => {
          onClose();
          window.__OMNISYM_START_VERIFICATION__();
        }, 1500);
      } else {
        // Fallback for internal closing
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }, 1200);
  };

  // Real-Time Polling Engine: Queries Google Apps Script every 3 seconds
  useEffect(() => {
    if (!isOpen || activeStep !== 'checkout' || hasTriggeredActivationRef.current) {
      return;
    }

    const checkOrderVerification = async () => {
      if (hasTriggeredActivationRef.current) return;
      try {
        setPollCheckCount((c) => c + 1);
        const endpoint = `${UPI_CONFIG.apiEndpoint}?orderId=${encodeURIComponent(currentOrderId)}&amount=${selectedPlan.price}`;
        
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data && (data.status === 'UTR_ALREADY_USED' || data.status === 'ALREADY_CLAIMED')) {
            setUtrError('⚠️ This transaction reference has already been used.');
            setTimeout(() => {
              const nextId = createNewPersistentOrderId();
              setCurrentOrderId(nextId);
              setPollCheckCount(0);
              setUtrError(null);
            }, 4000);
            return;
          }

          if (data && (data.status === 'EXPIRED' || data.status === 'STALE')) {
            setUtrError('⚠️ This payment session has expired (20-minute window). Generating fresh order...');
            setTimeout(() => {
              const nextId = createNewPersistentOrderId();
              setCurrentOrderId(nextId);
              setPollCheckCount(0);
              setUtrError(null);
            }, 4000);
            return;
          }

          if (data && data.status === 'UNDERPAID') {
            setUtrError(`⚠️ Underpayment detected. You paid ₹${data.received || 0}, but ₹${selectedPlan.price} is required.`);
            return;
          }

          if (
            data &&
            (data.status === 'SUCCESS' || data.status === 'VERIFIED') &&
            (data.paid === true || data.verified === true)
          ) {
            triggerInstantActivation(selectedPlan, data.utr || data.refId || currentOrderId);
          }
        }
      } catch {
        // Silent catch for network hiccups
      }
    };

    const initialTimer = setTimeout(() => {
      checkOrderVerification();
    }, 2000);

    const pollInterval = setInterval(() => {
      checkOrderVerification();
    }, 3000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
    };
  }, [isOpen, activeStep, currentOrderId, selectedPlan]);

  // Manual Check Trigger Button Handler
  const handleManualCheckStatus = async () => {
    if (isManualChecking || hasTriggeredActivationRef.current) return;
    setIsManualChecking(true);
    setUtrError(null);
    setVerificationStage('handshake');
    setVerificationProgress(35);
    setVerificationStatusDetail(`Checking Order Reference #${currentOrderId} with UPI gateway...`);
    
    try {
      await new Promise((r) => setTimeout(r, 450));
      setVerificationStage('bank_query');
      setVerificationProgress(70);
      setVerificationStatusDetail('Querying live settlement ledger & NPCI banking status...');

      const endpoint = `${UPI_CONFIG.apiEndpoint}?orderId=${encodeURIComponent(currentOrderId)}&amount=${selectedPlan.price}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data && (data.status === 'UTR_ALREADY_USED' || data.status === 'ALREADY_CLAIMED')) {
          setUtrError('⚠️ This transaction reference has already been used.');
          createNewPersistentOrderId();
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        if (data && (data.status === 'EXPIRED' || data.status === 'STALE')) {
          setUtrError('⚠️ Payment window expired (20-minute limit). Please initiate a fresh order.');
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        if (data && data.status === 'UNDERPAID') {
          setUtrError(`⚠️ Underpayment detected (Received: ₹${data.received || 0}).`);
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        if (
          data &&
          (data.status === 'SUCCESS' || data.status === 'VERIFIED') &&
          (data.paid === true || data.verified === true)
        ) {
          triggerInstantActivation(selectedPlan, data.utr || data.refId || currentOrderId);
          return;
        } else {
          setVerifyMessage('⌛ Payment not detected yet. Please complete the transfer.');
          setVerificationStatusDetail('Bank clearance pending. Ready to re-check in real time.');
          setTimeout(() => {
            setVerifyMessage('Verifying with Banking Network...');
            setVerificationStage('idle');
            setVerificationProgress(0);
          }, 2500);
        }
      }
    } catch {
      setUtrError('Network error while verifying. Please try again.');
      setVerificationStage('idle');
      setVerificationProgress(0);
    } finally {
      setTimeout(() => setIsManualChecking(false), 900);
    }
  };

  // Listen for window re-focus
  useEffect(() => {
    if (activeStep !== 'checkout' || !isOpen) {
      return;
    }

    const handleWindowFocus = () => {
      if (!hasTriggeredActivationRef.current) {
        handleManualCheckStatus();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !hasTriggeredActivationRef.current) {
        handleManualCheckStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [activeStep, isOpen, selectedPlan, currentOrderId]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_CONFIG.vpa);
    setCopiedUpi(true);
    if (addToast) {
      addToast({
        type: 'success',
        title: 'Copied!',
        description: `FamPay UPI handle ${UPI_CONFIG.vpa} copied to clipboard.`,
      });
    }
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(currentOrderId);
    setCopiedOrderId(true);
    if (addToast) {
      addToast({
        type: 'success',
        title: 'Copied!',
        description: `Order ID ${currentOrderId} copied to clipboard.`,
      });
    }
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(selectedPlan.price));
    setCopiedAmount(true);
    if (addToast) {
      addToast({
        type: 'success',
        title: 'Copied!',
        description: `Amount ₹${selectedPlan.price} copied to clipboard.`,
      });
    }
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleQrScanSuccess = (scannedData: string) => {
    if (!scannedData) return;
    // Check if scanned data contains a 12-digit UTR or transaction ID
    const digitsMatch = scannedData.match(/\b\d{12}\b/);
    if (digitsMatch) {
      setUtrInput(digitsMatch[0]);
      if (addToast) {
        addToast({
          type: 'success',
          title: 'UTR Auto-Filled',
          description: `Extracted 12-digit UTR ${digitsMatch[0]} from scanned QR code.`,
        });
      }
    }
  };

  const handleSelectPlan = (tierKey: Exclude<SubscriptionTier, 'free'>) => {
    setSelectedTierKey(tierKey);
    setActiveStep('checkout');
    setUtrInput('');
    setUtrError(null);
    setTimerSeconds(1200);
    setShowUtrFallback(false);
  };

  // Smart UTR / Reference Number Verification (Strict Zero-Trust)
  const handleVerifyUtr = async () => {
    const cleanUtr = utrInput.trim();
    if (!cleanUtr) {
      setUtrError('Please enter your 12-digit UPI reference number.');
      return;
    }

    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('UTR must be exactly 12 numeric digits (e.g. 423819203912).');
      return;
    }

    setIsSubmittingUtr(true);
    setUtrError(null);
    setVerificationStage('handshake');
    setVerificationProgress(35);
    setVerificationStatusDetail(`Validating 12-digit UTR (${cleanUtr}) & anti-replay security lock...`);

    try {
      // Step transition for clear visual feedback
      await new Promise((r) => setTimeout(r, 450));
      setVerificationStage('bank_query');
      setVerificationProgress(75);
      setVerificationStatusDetail('Querying NPCI settlement network & bank clearing ledger...');

      // Query backend with ?utr=USER_UTR&amount=AMOUNT&orderId=ORDER_ID
      const endpoint = `${UPI_CONFIG.apiEndpoint}?utr=${encodeURIComponent(cleanUtr)}&amount=${selectedPlan.price}&orderId=${encodeURIComponent(currentOrderId)}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();

        // 1. Strict UTR Uniqueness & Anti-Replay Lock
        if (data && (data.status === 'UTR_ALREADY_USED' || data.status === 'ALREADY_CLAIMED')) {
          setUtrError('⚠️ This transaction reference has already been used.');
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        // 2. Strict 20-Minute Freshness Window
        if (data && (data.status === 'EXPIRED' || data.status === 'STALE')) {
          setUtrError('⚠️ This payment reference is older than 20 minutes and has expired. Please initiate a fresh transfer.');
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        // 3. Underpayment Check
        if (data && data.status === 'UNDERPAID') {
          setUtrError(`⚠️ Underpayment detected. Received ₹${data.received || 0}, but ₹${selectedPlan.price} is required.`);
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        // 4. Mismatch Check
        if (data && data.status === 'MISMATCH') {
          setUtrError('⚠️ Payment details mismatch. Please verify the amount and UTR.');
          setVerificationStage('idle');
          setVerificationProgress(0);
          return;
        }

        // 5. Explicit Backend Cryptographic Success
        if (
          data &&
          (data.status === 'SUCCESS' || data.status === 'VERIFIED') &&
          (data.paid === true || data.verified === true)
        ) {
          triggerInstantActivation(selectedPlan, cleanUtr);
          return;
        } else {
          setUtrError(`⌛ Payment with UTR ${cleanUtr} for ₹${selectedPlan.price} not detected yet. If you just transferred, please wait 30–60 seconds for bank clearance and try again.`);
          setVerificationStage('idle');
          setVerificationProgress(0);
        }
      } else {
        setUtrError('Unable to connect to verification gateway. Please try again.');
        setVerificationStage('idle');
        setVerificationProgress(0);
      }
    } catch {
      setUtrError('Network error while verifying UTR with banking server. Please try again.');
      setVerificationStage('idle');
      setVerificationProgress(0);
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  // Email Support Link Generator
  const getEmailSupportLink = () => {
    const subject = encodeURIComponent(`Omnisym Pro Payment Support - Order ${currentOrderId}`);
    const body = encodeURIComponent(
      `Hello Omnisym Support Team,\n\nI have completed my UPI payment for Omnisym Pro.\n\nOrder Details:\n- Order ID: ${currentOrderId}\n- Selected Plan: ${selectedPlan.name}\n- Amount: ₹${selectedPlan.price}\n- 12-Digit UTR: ${utrInput || '[Enter UTR here if available]'}\n\nPlease verify and activate my subscription.\n\nThank you!`
    );
    return `mailto:${UPI_CONFIG.supportEmail}?subject=${subject}&body=${body}`;
  };

  // Calculate current storage percentage
  const maxStorageGB = currentSubscription.isPro ? currentSubscription.storageLimitGB : 1;
  const maxStorageMB = maxStorageGB * 1024;
  const storagePercent = Math.min(100, Math.max(1, (storageUsageMB / maxStorageMB) * 100));

  // Calculate days remaining
  const daysRemaining = currentSubscription.isPro && currentSubscription.expiresAt > Date.now()
    ? Math.ceil((currentSubscription.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="omnisym-subscription-modal-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          id="omnisym-subscription-dashboard-container"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl my-auto rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-2xl overflow-hidden font-sans flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs shrink-0">
                  <Crown className="w-4 h-4 sm:w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                  <h2 className="text-base sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    Omnisym Pro Hub
                  </h2>
                  <span className="hidden sm:inline-flex text-[11px] sm:text-xs font-semibold tracking-wide px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0 whitespace-nowrap">
                    UPI Instant Activation
                  </span>
                </div>
              </div>

              {/* Right Action Controls: Switch Plan & Close (Pinned to top-right with shrink-0) */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto self-start sm:self-center">
                {activeStep === 'checkout' && (
                  <button
                    type="button"
                    id="sub-back-to-plans-btn"
                    onClick={() => setActiveStep('select')}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                  >
                    ← Switch Plan
                  </button>
                )}

                <button
                  type="button"
                  id="close-subscription-modal-btn"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Subtext on its own dedicated full-width line with 8px (mt-2) top margin */}
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-2 leading-relaxed w-full">
              Upgrade your intelligence speed, unlock the Student & Creator suites, and access permanent cloud vaults.
            </p>
          </header>

          {/* Active Pro Status Bar */}
          <div className="relative z-10 px-4 sm:px-8 py-3 bg-[#F9FAFB] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-medium whitespace-nowrap">Current Status:</span>
                {currentSubscription.isPro ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="whitespace-nowrap">
                      {currentSubscription.tier === 'student'
                        ? 'STUDENT PRO'
                        : currentSubscription.tier === 'creator'
                        ? 'CREATOR PRO'
                        : 'FLASH PRO'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap shrink-0">
                    Free Starter (1 GB)
                  </span>
                )}
              </div>

              {!currentSubscription.isPro && (
                <div className="pl-4 border-l border-slate-300">
                  <ProAccessManager />
                </div>
              )}

              {currentSubscription.isPro && (
                <div className="flex items-center gap-1.5 text-slate-500 sm:pl-4 sm:border-l border-slate-200 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="whitespace-nowrap">
                    {daysRemaining > 0 ? `Active for ${daysRemaining} more days` : 'Expires today'}
                  </span>
                </div>
              )}
            </div>

            {/* Live Storage Vault Meter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Vault Usage: <strong className="text-slate-900 font-semibold">{storageUsageMB.toFixed(1)} MB</strong> / {maxStorageGB} GB
                </span>
              </div>
              <div className="w-28 sm:w-36 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              {!currentSubscription.isPro && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  30-day reset
                </span>
              )}
            </div>
          </div>

          {/* Modal Main Body */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white">
            {/* ----------------- STEP 1: PLAN SELECTOR ----------------- */}
            {activeStep === 'select' && (
              <div className="space-y-6">
                <div className="text-center max-w-xl mx-auto space-y-1.5">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    Supercharge Your Intelligence
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Transparent, micro-priced subscription tiers tailored for learners, creators, and power developers.
                  </p>
                </div>

                {/* 3-Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {(Object.keys(SUBSCRIPTION_PLANS) as Array<Exclude<SubscriptionTier, 'free'>>).map((tierKey, tIdx) => {
                    const plan = SUBSCRIPTION_PLANS[tierKey];
                    const isSelected = selectedTierKey === tierKey;
                    const isCurrentTier = currentSubscription.isPro && currentSubscription.tier === tierKey;

                    return (
                      <div
                        key={`plan_tier_${plan.id}_${tierKey}_${tIdx}`}
                        className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 border ${
                          isSelected
                            ? 'bg-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-500/10'
                            : 'bg-[#F9FAFB] border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
                        }`}
                      >
                        {/* Popular Badge */}
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-600 text-white shadow-sm">
                            ⭐ Most Popular
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Card Header & Badge */}
                          <div>
                            <span
                              className={`inline-block text-[11px] font-bold tracking-wide px-2.5 py-0.5 rounded-full border ${
                                plan.id === 'creator'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : plan.id === 'student'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              }`}
                            >
                              {plan.badge}
                            </span>
                            <h4 className="text-lg font-bold text-slate-900 mt-2 tracking-tight">
                              {plan.name}
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5 leading-normal">
                              {plan.tagline}
                            </p>
                          </div>

                          {/* Price Tag */}
                          <div className="py-2.5 border-y border-slate-200 flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                              ₹{plan.price}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                              / {plan.period}
                            </span>
                            <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {plan.storageGB} GB Vault
                            </span>
                          </div>

                          {/* Features Checklist */}
                          <div className="space-y-2 text-left">
                            <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                              What's Included:
                            </p>
                            <ul className="space-y-2">
                              {plan.features.map((feat, idx) => (
                                <li key={`${plan.id}_feat_${idx}`} className="flex items-start gap-2.5 text-xs text-slate-700">
                                  <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                  <div>
                                    <strong className="text-slate-900 font-semibold">
                                      {feat.title}
                                    </strong>
                                    <p className="text-[11px] text-slate-600 leading-snug">
                                      {feat.description}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Action Select Button */}
                        <div className="pt-6 mt-4">
                          <button
                            type="button"
                            id={`select-plan-${plan.id}-btn`}
                            onClick={() => handleSelectPlan(plan.id as any)}
                            className="w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all duration-150 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-[0.98] cursor-pointer"
                          >
                            <span>{isCurrentTier ? 'Renew / Extend Tier' : 'Select Plan'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* --- WHY GO PRO? VALUE HIGHLIGHTS SECTION --- */}
                <div id="why-go-pro-section" className="pt-8 border-t border-slate-200 space-y-6">
                  <div className="text-center space-y-1.5 max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>PRO TIER ADVANTAGE</span>
                    </div>
                    <h4 className="text-2xl font-extrabold tracking-tight text-slate-900">
                      Why Go Pro?
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Unlock enterprise-grade image generation, dedicated reasoning bandwidth, and limitless cloud persistence tailored for maximum productivity.
                    </p>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pillar 1: Higher-Resolution Image Generation */}
                    <div
                      id="why-go-pro-images-card"
                      className="p-5 rounded-2xl bg-[#F9FAFB] hover:bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100/70 text-purple-800 border border-purple-200">
                            8K Ultra HD
                          </span>
                        </div>
                        <div>
                          <h5 className="text-base font-bold text-slate-900 tracking-tight">
                            Higher-Resolution Image Generation
                          </h5>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Generate pristine 4K & 8K renders with ray-traced lighting, photorealistic textures, and automated prompt engineering with zero compression loss.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>8K & RTX Ray-Traced Shaders</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Custom Aspect Ratios & Prompt Enhancer</span>
                        </div>
                      </div>
                    </div>

                    {/* Pillar 2: Priority Access to New Models */}
                    <div
                      id="why-go-pro-models-card"
                      className="p-5 rounded-2xl bg-[#F9FAFB] hover:bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800 border border-indigo-200">
                            Zero Queue
                          </span>
                        </div>
                        <div>
                          <h5 className="text-base font-bold text-slate-900 tracking-tight">
                            Priority Access to New Models
                          </h5>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Skip throttled traffic queues with dedicated bandwidth. Enjoy instant access to Gemini 3.7 Flash & 3.1 Pro Thinking reasoning models.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Gemini 3.7 Flash & 3.1 Pro Thinking</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Dedicated Compute & Faster Output</span>
                        </div>
                      </div>
                    </div>

                    {/* Pillar 3: Increased Cloud Storage Quotas */}
                    <div
                      id="why-go-pro-storage-card"
                      className="p-5 rounded-2xl bg-[#F9FAFB] hover:bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 group-hover:scale-105 transition-transform">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-100/70 text-cyan-800 border border-cyan-200">
                            Up to 50 GB Vault
                          </span>
                        </div>
                        <div>
                          <h5 className="text-base font-bold text-slate-900 tracking-tight">
                            Increased Cloud Storage Quotas
                          </h5>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Upgrade from 1 GB to up to 50 GB of persistent cloud vault storage. Save unlimited code sandboxes, full ZIP exports, and multimodal media.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>One-Click Full ZIP Downloads</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Persistent History & Sandboxes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- 2-COLUMN FEATURE COMPARISON: FREE VS PRO --- */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                      Omnisym Free vs. Omnisym Pro
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                      See why students, creators, and power developers upgrade for daily workflows.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    {/* Comparison Header Row */}
                    <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 text-xs font-bold divide-x divide-slate-200">
                      <div className="p-3.5 sm:p-4 text-slate-600 flex items-center justify-between">
                        <span>Omnisym Free</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">₹0</span>
                      </div>
                      <div className="p-3.5 sm:p-4 text-indigo-900 bg-indigo-50/70 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Omnisym Pro</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-600 text-white">Starting ₹29</span>
                      </div>
                    </div>

                    {/* Comparison Item Rows */}
                    <div className="divide-y divide-slate-100 text-xs">
                      {[
                        {
                          feature: 'Multi-Modal Reasoning & Intelligence',
                          free: 'Standard Gemini 3.1 Flash Lite',
                          pro: 'Gemini 3.7 Flash & 3.1 Pro Thinking (High Speed)',
                          freeOk: true,
                          proOk: true,
                        },
                        {
                          feature: 'Daily Prompt Rate Limit',
                          free: 'Standard throttled queue on traffic spikes',
                          pro: 'Ultra-fast priority processing & dedicated bandwidth',
                          freeOk: false,
                          proOk: true,
                        },
                        {
                          feature: 'AI Image Engine (Imagen 3 / 8K)',
                          free: 'Standard quality with basic resolution',
                          pro: 'Ultra HD 8K ray-traced rendering & instant generation',
                          freeOk: false,
                          proOk: true,
                        },
                        {
                          feature: 'Cloud Storage & Persistent Vault',
                          free: '1 GB Basic Vault',
                          pro: 'Up to 50 GB Permanent Encrypted Storage',
                          freeOk: false,
                          proOk: true,
                        },
                        {
                          feature: 'Dedicated Specialized Personas',
                          free: 'Basic conversation modes',
                          pro: 'Full access to /code architect, /research, & /3d visualizer',
                          freeOk: false,
                          proOk: true,
                        },
                        {
                          feature: 'Audio Transcription & Voice Synthesis',
                          free: 'Standard web synthesis',
                          pro: 'High-fidelity natural audio transcription & voices',
                          freeOk: true,
                          proOk: true,
                        },
                        {
                          feature: 'Community & VIP Creator Support',
                          free: 'Public forum',
                          pro: 'Direct VIP support channel on Discord',
                          freeOk: false,
                          proOk: true,
                        },
                      ].map((row, idx) => (
                        <div key={`comp_row_${idx}`} className="grid grid-cols-2 divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors">
                          {/* Free Column */}
                          <div className="p-3 sm:p-4 space-y-1">
                            <p className="font-semibold text-slate-800 text-[11px] sm:text-xs">{row.feature}</p>
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                              {row.freeOk ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              )}
                              <span>{row.free}</span>
                            </div>
                          </div>

                          {/* Pro Column */}
                          <div className="p-3 sm:p-4 space-y-1 bg-indigo-50/20">
                            <p className="font-semibold text-indigo-950 text-[11px] sm:text-xs">{row.feature}</p>
                            <div className="flex items-start gap-1.5 text-[11px] text-indigo-900 font-medium">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{row.pro}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trust Footer Snippet */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Instant activation via FamPay UPI. Zero recurring auto-debits without your explicit approval.
                    </span>
                  </div>
                  <a
                    href={UPI_CONFIG.discordSupportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Community Support</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* --- PAYMENT HISTORY (SELECT STEP) --- */}
                {paymentHistory.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Your Transaction History
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {paymentHistory.map((entry, pIdx) => (
                        <div 
                          key={`${entry.orderId || 'hist'}_s1_${pIdx}`}
                          className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-slate-200 flex items-center justify-between group transition-all hover:bg-slate-50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                entry.tier === 'creator' ? 'bg-purple-500' : entry.tier === 'student' ? 'bg-blue-500' : 'bg-cyan-500'
                              }`} />
                              <span className="text-xs font-bold text-slate-900">
                                {entry.planName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {entry.orderId}
                              </span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(entry.activatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-700">₹{entry.price}</p>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Success</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- STEP 2: CHECKOUT & REDESIGNED LIGHT PAYMENT MODAL ----------------- */}
            {activeStep === 'checkout' && (
              <div className="space-y-6">
                {/* Two-Column Desktop / Stacked Mobile Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: ORDER SUMMARY & UNLOCKED PERKS */}
                  <div className="lg:col-span-5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] p-6 sm:p-7 space-y-6">
                    <div className="space-y-2">
                      <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {selectedPlan.badge}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {selectedPlan.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                        {selectedPlan.tagline}
                      </p>
                    </div>

                    {/* Order Price Breakdown */}
                    <div className="p-5 rounded-xl bg-white border border-[#E5E7EB] space-y-3 text-xs shadow-2xs">
                      <div className="flex justify-between text-slate-500">
                        <span className="font-medium">Plan Duration</span>
                        <strong className="text-slate-900 font-semibold">{selectedPlan.period}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span className="font-medium">Cloud Vault Storage</span>
                        <strong className="text-indigo-700 font-semibold">{selectedPlan.storageGB} GB Permanent</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span className="font-medium">Platform Fee & Tax</span>
                        <strong className="text-emerald-700 font-semibold">₹0 (Waived)</strong>
                      </div>
                      <div className="pt-3 border-t border-[#E5E7EB] flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-sm">Total Amount Due</span>
                        <span className="font-extrabold text-2xl sm:text-3xl text-slate-900">
                          ₹{selectedPlan.price}
                        </span>
                      </div>
                    </div>

                    {/* Quick Unlocked Pill Tags */}
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Unlocks Immediately:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlan.pillTags.map((tag, idx) => (
                          <span
                            key={`${selectedPlan.id}_tag_${idx}`}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-[#E5E7EB] shadow-2xs"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick Live Preview Trigger for Creator Tier */}
                    {selectedPlan.id === 'creator' && onOpenLiveSandbox && (
                      <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 text-purple-900 font-medium">
                          <FileCode className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>Includes In-App Live HTML/JS Sandbox & ZIP</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenLiveSandbox();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-2xs transition-all"
                        >
                          Preview
                        </button>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: DYNAMIC QR CODE BY DEFAULT & PAYMENT DETAILS */}
                  <div className="lg:col-span-7 rounded-2xl bg-white border border-[#E5E7EB] p-6 sm:p-7 space-y-5 shadow-xs">
                    
                    {/* Header & 5-minute timer */}
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-indigo-600" />
                          <span>Scan & Pay via UPI / FamPay</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-normal mt-0.5">
                          Works with GPay, PhonePe, Paytm, FamPay, Cred, or BHIM.
                        </p>
                      </div>

                      {/* Timer */}
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-bold">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>{formatTimer(timerSeconds)}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Order Expires</span>
                      </div>
                    </div>

                    {/* HERO QR CODE BOX (SHOWN BY DEFAULT - NO TOGGLES) */}
                    <div className="flex flex-col items-center justify-center p-6 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] space-y-4">
                      <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs transition-transform hover:scale-[1.01]">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt={`UPI QR Code for ₹${selectedPlan.price}`}
                            className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                          />
                        ) : (
                          <img
                            src={getQrCodeUrl(generatedUri)}
                            alt={`UPI QR Code for ₹${selectedPlan.price}`}
                            className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Order Reference: <strong className="font-mono text-slate-900 font-bold">{currentOrderId}</strong></span>
                      </div>

                      {/* 1-Tap Payment App Button & Camera QR Scanner Button */}
                      <div className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                        <a
                          id="open-payment-app-main-btn"
                          href={generatedUri}
                          onClick={handleOpenPaymentApp}
                          className="flex-1 w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-center"
                        >
                          <Smartphone className="w-4 h-4 text-white" />
                          <span>Open Payment App (1-Tap Pay)</span>
                          <ArrowRight className="w-4 h-4 text-white/80" />
                        </a>

                        <button
                          type="button"
                          id="open-qr-scanner-btn"
                          onClick={() => setIsScannerOpen(true)}
                          className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0"
                          title="Scan payment QR code using device camera"
                        >
                          <Camera className="w-4 h-4 text-indigo-600" />
                          <span>Scan QR Code</span>
                        </button>
                      </div>

                      {/* SMART UTR / REFERENCE NUMBER FALLBACK (FOR MISSED NOTES) */}
                      <div className="w-full max-w-md pt-1">
                        <button
                          type="button"
                          id="forgot-order-note-toggle-btn"
                          onClick={() => setShowUtrFallback((prev) => !prev)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/60 border border-indigo-100 p-3 rounded-xl transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>Forgot to add the Order Note in UPI app?</span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-indigo-500 transition-transform duration-200 ${
                              showUtrFallback ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {showUtrFallback && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2.5"
                            >
                              <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                                If you forgot to enter <strong className="font-mono text-indigo-600 font-bold">{currentOrderId}</strong> in your UPI remarks, enter your 12-digit UTR from your GPay / PhonePe / Paytm / FamPay receipt to rescue your payment.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    maxLength={12}
                                    value={utrInput}
                                    onChange={(e) => {
                                      setUtrInput(e.target.value.replace(/\D/g, ''));
                                      if (utrError) setUtrError(null);
                                    }}
                                    placeholder="Enter 12-digit UTR"
                                    className="w-full h-10 px-3 pr-14 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                                    {utrInput.length}/12
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  id="rescue-order-verify-utr-btn"
                                  onClick={handleVerifyUtr}
                                  disabled={isSubmittingUtr || utrInput.length !== 12}
                                  className="h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                                >
                                  {isSubmittingUtr ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Verifying...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Verify UTR</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              {utrError && (
                                <p className="text-xs text-rose-600 flex items-start gap-1 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>{utrError}</span>
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* ORDER NOTE & UPI ID DETAILS CARD (VISUAL SEPARATION) */}
                    <div className="p-5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] space-y-4">
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Manual UPI Transfer Details
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        {/* FamPay UPI ID */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">
                            Official UPI ID (FamPay)
                          </label>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                            <span className="font-mono font-bold text-xs text-indigo-700 truncate mr-2 select-all">
                              {UPI_CONFIG.vpa}
                            </span>
                            <button
                              type="button"
                              id="copy-vpa-btn"
                              onClick={handleCopyUpi}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                copiedUpi
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                              }`}
                              title="Copy UPI ID"
                            >
                              {copiedUpi ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy UPI ID</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Order Note Remark */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">
                            Order Note / Remark
                          </label>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {currentOrderId}
                            </span>
                            <button
                              type="button"
                              id="copy-order-id-btn"
                              onClick={handleCopyOrderId}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                copiedOrderId
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Copy Order ID"
                            >
                              {copiedOrderId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MANUAL FALLBACK & SUPPORT ESCALATION (VISUAL SEPARATION) */}
                    <div className="p-5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-indigo-700" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Payment Taking Longer Than 60s?
                          </h5>
                          <p className="text-xs text-slate-500 leading-relaxed font-normal mt-0.5">
                            Verify your 12-digit UTR reference directly with the banking gateway, or get rapid help via Discord (Best Option) or Email support.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              maxLength={12}
                              value={utrInput}
                              onChange={(e) => {
                                setUtrInput(e.target.value.replace(/\D/g, ''));
                                if (utrError) setUtrError(null);
                              }}
                              placeholder="Enter 12-Digit UTR Number"
                              className="w-full h-12 px-4 pr-16 rounded-xl bg-white border border-[#E5E7EB] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs font-mono font-medium"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                              {utrInput.length}/12
                            </span>
                          </div>
                          <button
                            type="button"
                            id="manual-verify-utr-submit-btn"
                            onClick={handleVerifyUtr}
                            disabled={isSubmittingUtr || utrInput.length !== 12}
                            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 text-white font-bold text-sm transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-2"
                          >
                            {isSubmittingUtr ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>Verify UTR</span>
                              </>
                            )}
                          </button>
                        </div>

                        {utrError && (
                          <p className="text-xs text-rose-600 flex items-start gap-1 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{utrError}</span>
                          </p>
                        )}

                        {/* SUPPORT CHANNELS: DISCORD (BEST OPTION) & EMAIL */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* Discord Support (Best Option) */}
                          <a
                            id="discord-support-checkout-btn"
                            href={UPI_CONFIG.discordSupportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 flex items-center justify-between transition-all shadow-2xs group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                              </svg>
                              <span className="font-bold text-xs sm:text-sm">Discord Support</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white tracking-tight shrink-0">
                              Best Option 🚀
                            </span>
                          </a>

                          {/* Email Support (opopteamop@gmail.com) */}
                          <a
                            id="email-support-checkout-btn"
                            href={getEmailSupportLink()}
                            className="w-full h-12 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-slate-800 px-4 flex items-center justify-between transition-all shadow-2xs group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                              <div className="text-left truncate">
                                <p className="font-bold text-xs leading-none">Email Support</p>
                                <p className="text-[11px] text-slate-500 font-mono truncate">{UPI_CONFIG.supportEmail}</p>
                              </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* --- VISUAL PAYMENT VERIFICATION PROGRESS INDICATOR --- */}
                    <div
                      id="payment-radar-status"
                      className={`p-5 box-border rounded-2xl border transition-all duration-300 space-y-4 ${
                        radarDetected
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm ring-2 ring-emerald-400/20'
                          : isSubmittingUtr || isManualChecking
                          ? 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border-indigo-300 text-slate-900 shadow-sm ring-2 ring-indigo-400/20'
                          : 'bg-[#F9FAFB] border-slate-200/90 text-slate-900 shadow-2xs'
                      }`}
                    >
                      {/* Header row: Live status badge & telemetry */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          {radarDetected ? (
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                              <CheckCircle2 className="w-5 h-5 animate-bounce" />
                            </div>
                          ) : isSubmittingUtr || isManualChecking ? (
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 relative">
                              <Activity className="w-4 h-4" />
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                                {radarDetected
                                  ? 'Payment Confirmed by Bank! ⚡'
                                  : isSubmittingUtr
                                  ? 'Validating 12-Digit Reference...'
                                  : isManualChecking
                                  ? 'Querying Banking Clearing Ledger...'
                                  : 'Live Bank Settlement Radar'}
                              </h5>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                  radarDetected
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isSubmittingUtr || isManualChecking
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                              >
                                {radarDetected
                                  ? 'VERIFIED'
                                  : isSubmittingUtr || isManualChecking
                                  ? 'VALIDATING'
                                  : 'ACTIVE MONITOR'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                              {verificationStatusDetail ||
                                (radarDetected
                                  ? 'Bank transaction settled. Provisioning Pro tier now...'
                                  : 'Pinging UPI settlement gateway every 3s to auto-detect payment.')}
                            </p>
                          </div>
                        </div>

                        {/* Poll count or percentage badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSubmittingUtr || isManualChecking ? (
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                              {verificationProgress || 45}% Validating
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Cycle #{pollCheckCount || 1}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Animated Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/80">
                          <motion.div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              radarDetected
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : isSubmittingUtr || isManualChecking
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600'
                                : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-400'
                            }`}
                            initial={{ width: '25%' }}
                            animate={{
                              width: radarDetected
                                ? '100%'
                                : isSubmittingUtr || isManualChecking
                                ? `${verificationProgress || 65}%`
                                : ['35%', '65%', '45%', '70%'],
                            }}
                            transition={
                              radarDetected || isSubmittingUtr || isManualChecking
                                ? { duration: 0.4 }
                                : { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                            }
                          />
                        </div>
                      </div>

                      {/* 3-Stage Visual Milestone Stepper */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                        {/* Step 1: Handshake */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                                radarDetected ||
                                verificationStage === 'bank_query' ||
                                verificationStage === 'provisioning' ||
                                verificationStage === 'verified' ||
                                (!isSubmittingUtr && !isManualChecking)
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : verificationStage === 'handshake'
                                  ? 'bg-indigo-600 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {radarDetected ||
                              verificationStage === 'bank_query' ||
                              verificationStage === 'provisioning' ||
                              verificationStage === 'verified' ||
                              (!isSubmittingUtr && !isManualChecking)
                                ? '✓'
                                : '1'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              1. Gateway Link
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight truncate pl-0.5">
                            Order #{currentOrderId}
                          </p>
                        </div>

                        {/* Step 2: Banking Clearance */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                                radarDetected ||
                                verificationStage === 'provisioning' ||
                                verificationStage === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isSubmittingUtr || isManualChecking || (!radarDetected)
                                  ? 'bg-indigo-600 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {radarDetected ||
                              verificationStage === 'provisioning' ||
                              verificationStage === 'verified' ? (
                                '✓'
                              ) : isSubmittingUtr || isManualChecking ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                '2'
                              )}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              2. Bank Clearing
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight truncate pl-0.5">
                            NPCI & Ledger Scan
                          </p>
                        </div>

                        {/* Step 3: Vault Provisioning */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                                radarDetected || verificationStage === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : verificationStage === 'provisioning'
                                  ? 'bg-indigo-600 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {radarDetected || verificationStage === 'verified' ? '✓' : '3'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              3. Pro Vault
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight truncate pl-0.5">
                            {selectedPlan.storageGB} GB & AI Perks
                          </p>
                        </div>
                      </div>

                      {/* Manual Action Bar */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Bank confirmations usually take 10–30 seconds.</span>
                        </div>

                        <button
                          type="button"
                          id="manual-check-status-btn"
                          disabled={isManualChecking || isSubmittingUtr || radarDetected}
                          onClick={handleManualCheckStatus}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E7EB] text-indigo-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isManualChecking ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              <span>Checking Bank...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Check Status Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Zero-Loss Guarantee Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] uppercase tracking-tight">Zero-Loss Guarantee</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">100% Resolution: Every payment is tied to your Order ID.</span>
                    </div>

                  </div>
                </div>

                {/* --- PAYMENT HISTORY (CHECKOUT STEP) --- */}
                {paymentHistory.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Your Transaction History
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {paymentHistory.map((entry, pIdx) => (
                        <div 
                          key={`${entry.orderId || 'hist'}_s2_${pIdx}`}
                          className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-slate-200 flex items-center justify-between group transition-all hover:bg-slate-50"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                entry.tier === 'creator' ? 'bg-purple-500' : entry.tier === 'student' ? 'bg-blue-500' : 'bg-cyan-500'
                              }`} />
                              <span className="text-xs font-bold text-slate-900">
                                {entry.planName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {entry.orderId}
                              </span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(entry.activatedAt).toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-700">₹{entry.price}</p>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Verified</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- STEP 3: SUCCESS CELEBRATION ----------------- */}
            {activeStep === 'success' && (
              <div className="py-8 px-4 max-w-lg mx-auto text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm"
                >
                  <Check className="w-10 h-10 stroke-[3]" />
                </motion.div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✨ Membership Activated
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome to Omnisym Pro!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your <strong className="text-slate-900">{selectedPlan.name}</strong> is now live. All features, permanent cloud storage ({selectedPlan.storageGB} GB), and priority response models are instantly active.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-slate-200 text-left space-y-2 text-xs shadow-2xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Ref (UTR)</span>
                    <span className="font-mono font-semibold text-slate-900">{utrInput || 'VERIFIED-MANUAL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vault Quota</span>
                    <span className="font-bold text-indigo-700">{selectedPlan.storageGB} GB Permanent</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Validity</span>
                    <span className="font-bold text-emerald-700">{selectedPlan.period}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    id="continue-to-chat-btn"
                    onClick={onClose}
                    className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-xs transition-all cursor-pointer"
                  >
                    Start Creating with Pro
                  </button>
                  {selectedPlan.id === 'creator' && onOpenLiveSandbox && (
                    <button
                      type="button"
                      id="open-sandbox-after-sub-btn"
                      onClick={() => {
                        onClose();
                        onOpenLiveSandbox();
                      }}
                      className="py-3 px-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FileCode className="w-4 h-4 text-purple-600" />
                      <span>Open Live Sandbox</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* QR Code Camera Scanner Modal */}
      <QrCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        addToast={addToast}
      />
    </AnimatePresence>
  );
};
