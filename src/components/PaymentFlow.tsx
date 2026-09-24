import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, ArrowRight, Download, Receipt, ExternalLink } from 'lucide-react';

interface PaymentReceiptProps {
  transactionId: string;
  amount: string;
  date: string;
  onContinue: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ 
  transactionId, 
  amount, 
  date, 
  onContinue 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Successful</h2>
        <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm mt-1">Transaction Verified & Secure</p>
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Amount Paid</span>
            <span className="font-bold text-slate-900 dark:text-white">{amount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Date</span>
            <span className="font-medium text-slate-900 dark:text-slate-200">{date}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Status</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider">Completed</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Features Unlocked
          </h4>
          <ul className="space-y-2">
            {['Urban Music Studio Access', 'One-Click Gaming Scripter', 'Community Architect Mode', 'Full Pro Toolkit Access'].map((feat, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <button 
          onClick={onContinue}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 group"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="flex justify-center gap-4">
          <button className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <Download className="w-3 h-3" />
            Download PDF
          </button>
          <button className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            View in History
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const PaymentVerification: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVerifying, setIsVerifying] = React.useState(true);
  
  React.useEffect(() => {
    // Simulated secure verification delay
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVerifying) {
    return (
      <div className="fixed inset-0 z-[100002] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
        <PaymentReceipt 
          transactionId={`TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`}
          amount="₹29"
          date={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          onContinue={onComplete}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100002] bg-white dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="relative mx-auto w-24 h-24">
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 4, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute inset-0 border-4 border-t-indigo-600 border-r-indigo-200 border-b-indigo-200 border-l-indigo-200 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Verifying Payment</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            Please do not close this page. We are securely verifying your transaction with the bank.
          </p>
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 text-left">
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
              This usually takes a few seconds, but can take up to 15 minutes depending on the server traffic.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Secure Link Established</span>
        </div>
      </div>
    </div>
  );
};
