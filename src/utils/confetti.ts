import confetti from 'canvas-confetti';

/**
 * Basic Confetti Burst
 */
export const triggerConfetti = (options?: confetti.Options) => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 9999,
      ...options,
    });
  } catch (err) {
    console.warn('Confetti trigger failed:', err);
  }
};

/**
 * Massive Double-Cannon Milestone Celebration
 * Triggers dual side bursts with vibrant colors, stars, and shapes
 */
export const triggerMilestoneCelebration = () => {
  try {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Realistic multi-tier particle explosion
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
    });

    fire(0.2, {
      spread: 60,
      colors: ['#8b5cf6', '#f43f5e', '#fbbf24', '#06b6d4'],
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#a855f7', '#38bdf8', '#34d399', '#fb7185'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      shapes: ['star', 'circle'],
      colors: ['#ffd700', '#ff69b4', '#00ffff'],
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#6366f1', '#a855f7', '#ec4899'],
    });
  } catch (err) {
    console.warn('Milestone confetti failed:', err);
  }
};

/**
 * Fiery Ember Sparks for Savage Roast Mode 🔥
 */
export const triggerRoastFlames = () => {
  try {
    confetti({
      particleCount: 90,
      angle: 90,
      spread: 80,
      startVelocity: 40,
      decay: 0.88,
      gravity: 0.8,
      origin: { y: 0.8, x: 0.5 },
      colors: ['#ff1e00', '#ff5100', '#ff9900', '#ffcc00', '#8b0000'],
      zIndex: 9999,
      shapes: ['circle', 'square'],
    });
  } catch (err) {
    console.warn('Roast flame confetti failed:', err);
  }
};

/**
 * Spin-Flip Confetti for 'Do a flip' Easter Egg 🌀
 */
export const triggerFlipEffect = () => {
  try {
    // Left burst
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      zIndex: 9999,
      colors: ['#a855f7', '#6366f1', '#38bdf8'],
    });
    // Right burst
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      zIndex: 9999,
      colors: ['#ec4899', '#f59e0b', '#10b981'],
    });
  } catch (err) {
    console.warn('Flip confetti failed:', err);
  }
};

/**
 * Prabhjot Sandhu Creator Crown Gold Burst 👑
 */
export const triggerCreatorGoldBurst = () => {
  try {
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
      zIndex: 9999,
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff'],
      shapes: ['star', 'circle'],
      scalar: 1.2,
    });
  } catch (err) {
    console.warn('Creator gold burst failed:', err);
  }
};
