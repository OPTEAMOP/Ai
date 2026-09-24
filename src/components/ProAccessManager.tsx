import React, { useState, useEffect } from 'react';

const STORAGE_KEY_PRO_COUNTER = 'pro_watch_ads_counter';
const STORAGE_KEY_PRO_EXPIRY = 'pro_watch_ads_expiry';
const ADS_REQUIRED = 4;
const PRO_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export const ProAccessManager: React.FC = () => {
  const [counter, setCounter] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [expiry, setExpiry] = useState<number | null>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkStatus = () => {
    const storedCounter = parseInt(localStorage.getItem(STORAGE_KEY_PRO_COUNTER) || '0', 10);
    const storedExpiry = parseInt(localStorage.getItem(STORAGE_KEY_PRO_EXPIRY) || '0', 10);
    const now = Date.now();

    if (storedExpiry > now) {
      setIsPro(true);
      setExpiry(storedExpiry);
    } else {
      setIsPro(false);
      setExpiry(null);
      if (storedExpiry !== 0) {
          // Reset if expired
          localStorage.setItem(STORAGE_KEY_PRO_COUNTER, '0');
          localStorage.setItem(STORAGE_KEY_PRO_EXPIRY, '0');
          setCounter(0);
      } else {
          setCounter(storedCounter);
      }
    }
  };

  const triggerAd = () => {
    const script = document.createElement('script');
    script.src = 'https://n6wxm.com/vignette.min.js';
    script.dataset.zone = '11669467';
    document.body.appendChild(script);

    const newCounter = counter + 1;
    setCounter(newCounter);
    localStorage.setItem(STORAGE_KEY_PRO_COUNTER, newCounter.toString());

    if (newCounter >= ADS_REQUIRED) {
      const newExpiry = Date.now() + PRO_DURATION_MS;
      localStorage.setItem(STORAGE_KEY_PRO_EXPIRY, newExpiry.toString());
      checkStatus();
    }
  };

  if (isPro) {
    return (
      <div className="p-4 bg-green-100 text-green-800 rounded-lg">
        Pro Access Active! Expires: {new Date(expiry!).toLocaleDateString()}
      </div>
    );
  }

  return (
    <button
      onClick={triggerAd}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      Watch Ads to Unlock Pro for 5 Days ({counter}/{ADS_REQUIRED})
    </button>
  );
};
