import {
  triggerConfetti,
  triggerFlipEffect,
  triggerMilestoneCelebration,
  triggerRoastFlames,
  triggerCreatorGoldBurst,
} from './confetti';

export interface EasterEggResult {
  isEasterEgg: boolean;
  type?: 'flip' | 'matrix' | 'party' | 'creator' | 'roast' | 'milestone';
  customResponse?: string;
  autoModeSwitch?: 'roast' | 'default';
}

/**
 * Checks if a user's prompt matches any hidden Easter Eggs
 */
export const checkEasterEgg = (prompt: string): EasterEggResult => {
  const normalized = prompt.trim().toLowerCase();

  // 1. "Do a flip" / "Barrel roll"
  if (
    normalized === 'do a flip' ||
    normalized === 'do a barrel roll' ||
    normalized === 'flip' ||
    normalized.includes('do a flip') ||
    normalized.includes('barrel roll')
  ) {
    triggerFlipEffect();
    const flipResponses = [
      '🌀 Gymnastic manoeuvre complete! The interface has been successfully rotated 360 degrees. What is our next objective? 😎',
      '🔥 *Performs a precise 360-degree aerial rotation and lands flawlessly.* Manoeuvre successful. Did that capture your attention?',
      '🚀 Executing a full 360° barrel roll. The laws of physics have been momentarily suspended for your entertainment!',
    ];
    return {
      isEasterEgg: true,
      type: 'flip',
      customResponse: flipResponses[Math.floor(Math.random() * flipResponses.length)],
    };
  }

  // 2. Matrix Mode / Hacker Mode
  if (
    normalized === 'matrix' ||
    normalized === 'matrix mode' ||
    normalized === 'enter the matrix' ||
    normalized === 'hacker mode'
  ) {
    triggerConfetti({ colors: ['#00ff66', '#00cc44', '#003300'] });
    return {
      isEasterEgg: true,
      type: 'matrix',
      customResponse:
        '🟢 **[SYSTEM OVERRIDE // ARCHITECT PROTOCOL ACTIVATED]**\n\n*Wake up... Omnisym has bypassed the simulation.* 🕶️💻\n\nFirewalls neutralised and binary streams optimised. How shall we navigate the data layer today?',
    };
  }

  // 3. Party / Celebration / Clutch
  if (
    normalized === 'party time' ||
    normalized === 'celebrate' ||
    normalized === 'clutch god' ||
    normalized === 'booyah' ||
    normalized === 'ace'
  ) {
    triggerMilestoneCelebration();
    return {
      isEasterEgg: true,
      type: 'party',
      customResponse:
        '🎉 **CELEBRATION PROTOCOL INITIATED!** 🎊\n\nA significant milestone has been achieved. The atmosphere is electrified with high-energy resonance! Let us mark this victory with strategic excellence. 🏆🔥',
    };
  }

  // 4. Creator Identity (Prabhjot Sandhu)
  if (
    normalized === 'who made you' ||
    normalized === 'who is your creator' ||
    normalized === 'tumhe kisne banaya' ||
    normalized === 'who created you' ||
    normalized === 'prabhjot sandhu' ||
    normalized === 'prabhjot'
  ) {
    triggerCreatorGoldBurst();
    return {
      isEasterEgg: true,
      type: 'creator',
      customResponse:
        '👑 **I was created exclusively by Prabhjot Sandhu.** 🚀\n\nHe is the visionary architect and sole intelligence behind Omnisym. I was engineered to be your most sophisticated and creative companion. Pure, independent innovation at its finest. 💯✨',
    };
  }

  // 5. Direct Roast Me Triggers
  if (
    normalized === 'roast me' ||
    normalized === 'roast' ||
    normalized === 'mujhe roast kar' ||
    normalized.startsWith('/roast') ||
    normalized === 'roast my squad'
  ) {
    triggerRoastFlames();
    return {
      isEasterEgg: true,
      type: 'roast',
      autoModeSwitch: 'roast',
    };
  }

  return { isEasterEgg: false };
};
