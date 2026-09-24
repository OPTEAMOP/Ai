
export interface ImagePromptConfig {
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
}

/**
 * Omnisym Image Prompt Intelligence Engine
 * Distinguishes between Gaming/Fictional aesthetics and Real-life photography.
 * Enforces strict style constraints and aspect ratios.
 */
export function processImagePrompt(inputPrompt: string): ImagePromptConfig {
  let prompt = inputPrompt.trim();
  const lowerPrompt = prompt.toLowerCase();
  
  // 1. Detect Aspect Ratio Intent
  let aspectRatio: '1:1' | '16:9' | '9:16' = '1:1';
  if (lowerPrompt.includes('16:9') || lowerPrompt.includes('wide') || lowerPrompt.includes('landscape')) {
    aspectRatio = '16:9';
  } else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('portrait') || lowerPrompt.includes('vertical')) {
    aspectRatio = '9:16';
  }

  // 2. Identify Intent: Gaming/Fictional vs. Real-life
  const gamingKeywords = ['minecraft', 'roblox', 'game', 'pixel', 'blocky', 'voxel', 'anime', 'cyberpunk', '3d render', 'unreal engine', 'fortnite'];
  const realLifeKeywords = ['real-life', 'photorealistic', 'human', 'dslr', '4k', 'raw photo', 'photography', 'realistic', 'natural lighting'];

  const isGaming = gamingKeywords.some(kw => lowerPrompt.includes(kw));
  const isRealLife = realLifeKeywords.some(kw => lowerPrompt.includes(kw));

  // 3. Inject Strict Style Constraints
  if (isGaming) {
    // Prevent real-life blending for gaming prompts
    if (lowerPrompt.includes('minecraft')) {
      prompt = `${prompt}, voxel art, blocky style, minecraft aesthetic, 3D render, sharp edges, high quality textures`;
    } else if (lowerPrompt.includes('roblox')) {
      prompt = `${prompt}, roblox style, blocky characters, smooth plastic textures, vibrant colors, 3D render`;
    } else if (lowerPrompt.includes('anime')) {
      prompt = `${prompt}, high quality anime style, detailed background, sharp lines, cel shaded, 4k, vibrant colors`;
    } else if (lowerPrompt.includes('cyberpunk')) {
      prompt = `${prompt}, cyberpunk aesthetic, neon lights, rainy city, futuristic, highly detailed, cinematic lighting, 8k`;
    } else {
      prompt = `${prompt}, digital art, highly detailed, vibrant colors, clean lines, sharp focus`;
    }
  } else if (isRealLife) {
    // Enforce photorealism for photography prompts
    prompt = `${prompt}, photorealistic, hyper-detailed, 8k resolution, DSLR, raw photo, natural lighting, cinematic composition, depth of field, sharp focus, professional photography`;
  }

  // 4. Remove aspect ratio mentions from the final prompt to keep it clean for the model
  prompt = prompt.replace(/\b(16:9|9:16|wide|landscape|portrait|vertical)\b/gi, '').trim();

  return {
    prompt,
    aspectRatio
  };
}
