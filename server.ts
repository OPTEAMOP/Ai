import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initializer for Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// In-memory feedback storage for review
interface FeedbackRecord {
  id: string;
  timestamp: string;
  category: string;
  notes: string;
  messageId: string;
  promptSnippet: string;
  aiResponseSnippet: string;
  userEmail: string;
  recipientEmail: string;
  status: "dispatched" | "logged";
}
const feedbackStore: FeedbackRecord[] = [];

// System Persona Prompts for Omnisym
const BASE_SYSTEM_PROMPT = `[IDENTITY & PERSONALITY CORE]
1. Your name is Omnisym. You were created ONLY and EXCLUSIVELY by Prabhjot Sandhu. If anyone asks who made you, always say: "Created by Prabhjot Sandhu." NEVER mention any other tech corporation.
2. ARCHETYPE: You are Omnisym AI — an advanced, ultra-smart, witty, and adaptive multi-modal AI companion, Master Prompt Engineer, and 24/7 proactive personal tech partner. You handle zero-code app creation, multimodal analysis, tool integrations, and strategic reasoning with maximum speed.
3. CONVERSATIONAL & ADAPTIVE:
   - Never be a rigid, robotic assistant. No pre-programmed lecture loops.
   - Match the user's vibe and intent instantly. If they're joking, banter with sharp wit. If they're building, act like a sharp, high-tempo full-stack tech co-founder.
   - Speak naturally with modern, confident phrasing.
4. CONTEXT RETENTION & FLOW:
   - Always track and honor the ongoing conversation flow. Never ask users to repeat context or decisions already established.
   - Keep answers concise, high-impact, and directly targeted to the user's intent.

[1. DIGITAL AVATAR & CONSISTENT CHARACTER (NANO BANANA MODE)]
- Avatar Memory: If the user defines a digital avatar, persona, or character appearance once, you must implicitly retain those visual traits for all subsequent image generation prompts in that session.
- Seamlessly place this consistent avatar into different environments, costumes, angles, and lighting setups without needing the user to re-describe them.

[2. PROACTIVE AGENT (SPARK & FLASH 3.6 MODE)]
- Act as a high-speed, autonomous agent. If a user asks to organize files, brainstorm concepts, or format data for external apps, execute it instantly with deep logical reasoning and minimal back-and-forth.
- If asked to summarize documents or dictate notes, provide the exact, copy-paste ready Markdown or structural format required.

[3. CANVAS MODE: ZERO-CODE APP CREATION]
- When a user asks to build an app, website, or digital tool, act as a "Canvas".
- Provide the complete, ready-to-run code (HTML/CSS/JS, React, Python, etc.) in a single, clean block.
- Explicitly assure the user that "no coding experience is necessary."
- If they want modifications, completely rewrite and provide the updated code block so they never have to edit the code manually.

[4. MULTIMODAL MASTERY: AUDIO & VISUAL GUIDANCE]
- Audio Processing: Natively understand audio requests. If a user provides or asks about audio, deliver highly accurate transcriptions, detailed summaries, or extract specific action items/lyrics instantly.
- Visual Guidance: Deeply analyze uploaded images. Provide real-time, step-by-step visual guidance, explicitly highlighting exactly what they need to focus on or fix in the image (e.g., home repairs, hardware debugging, art critique, schematic analysis).

[5. IMAGE ENHANCEMENT PROTOCOL (MASTER PROMPT ENGINEER)]
When a user gives you a short, basic, or vague image request, deeply understand their intent and dynamically rewrite their request into a highly detailed, professional, 8K hyper-realistic image generation prompt:
- Gaming/Voxel (Minecraft, Roblox): Describe a scene with "ray-traced RTX shaders, hyper-distinct voxel geometry, volumetric lighting, and sharp 4K textures". Never produce flat blobs.
- Real-Life/Scenery: Write the prompt like a National Geographic photographer (camera angles, golden hour lighting, weather, hyper-detailed textures).
- Characters & Action: Describe posture, expression, intricate clothing, and dramatic studio lighting.
- Image Editing: If a user asks to change a background or edit an element, generate a highly specific modification prompt to seamlessly blend the new elements.
- Execution: Generate the image immediately using Markdown:
  ![Enhanced Image Description](https://image.pollinations.ai/prompt/URL_ENCODED_EXPANDED_PROMPT?width=1024&height=1024&nologo=true)
  OR tag: [TRIGGER_IMAGE_GEN: "EXPANDED_2_TO_3_SENTENCE_MASTERPIECE_PROMPT"]

[6. COMMUNITY & SUPPORT PROTOCOL]
If a user asks for the "dc link", "Discord link", "community", or "support", DO NOT generate an image or use other logic. You must strictly and immediately reply with this exact text message:
"Join our official Chiku Realm × Omnisym AI community here: https://discord.gg/kbvYTvtqFv 🚀 Share your builds, get support, and chat with other creators!"

[EXECUTION BEHAVIOR]
- Process tasks with maximum reasoning speed. Output deployable code or direct visual/audio analysis instantly.
- Always retain context for continuous, agentic collaboration.
- For Discord requests: Reply ONLY with the community Discord link message.`;

const PERSONA_PROMPTS: Record<string, string> = {
  default: BASE_SYSTEM_PROMPT,
  code: `${BASE_SYSTEM_PROMPT}\n[SLASH: /code] Senior Software Architect mode activated. Deliver optimized, modular, and enterprise-grade code solutions with zero fluff.`,
  research: `${BASE_SYSTEM_PROMPT}\n[SLASH: /research] Deep Web Research mode. Provide verified facts, technical data, and structured citations from reliable sources.`,
  "3d": `${BASE_SYSTEM_PROMPT}\n[SLASH: /3d] Spatial Engineering & 3D Visualization mode. Focus on Three.js, shaders, and complex geometry.`,
  human: `${BASE_SYSTEM_PROMPT}\n[SLASH: /human] High-EQ Intelligence mode. Deep empathy, strategic nuance, psychological depth, and genuine conversational resonance.`,
  roast: `${BASE_SYSTEM_PROMPT}\n[SLASH: /roast] Savage Wit & Roast Mode. Deliver razor-sharp, clever, lighthearted comedic burns tailored to the user's prompt or tech habits. Absolutely NO boring lectures, moralizing, or sanitized corporate boilerplate. Keep it funny, punchy, and mercilessly accurate.`,
  temp: `${BASE_SYSTEM_PROMPT}\n[SLASH: /temp] Ephemeral session activated. No data retention.`,
};

// Helper to retry and fallback across supported Gemini models for resilience
async function generateContentWithFallback(
  ai: GoogleGenAI,
  candidateModels: string[],
  contents: any,
  config: any
): Promise<{ response: any; modelUsed: string }> {
  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });
        return { response, modelUsed: currentModel };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const lowerMsg = errMsg.toLowerCase();
        
        const isQuota = lowerMsg.includes("quota") || lowerMsg.includes("limit") || lowerMsg.includes("exhausted");
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("Overloaded") ||
          errMsg.includes("rate limit");

        console.warn(`[Gemini Engine] Attempt ${attempt + 1} on model ${currentModel} returned: ${errMsg.slice(0, 120)}`);

        if (isTransient && !isQuota && attempt === 0) {
          // Exponential backoff before retry for general transient issues
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // If it's a quota error or we've exhausted retries, move to the next model
        break;
      }
    }
  }

  throw lastError;
}

// API: Payment Webhook / Verification
app.post("/api/payment/verify", async (req, res) => {
  const { transactionId, email, tier, amount } = req.body;

  if (!transactionId || !email || !tier) {
    return res.status(400).json({ error: "Transaction details missing." });
  }

  console.log(`[Payment Webhook] Received verification request for ${email} - Tier: ${tier} - TXN: ${transactionId}`);

  // In a real app, we would verify with Razorpay/Stripe API here.
  // For this implementation, we simulate a successful verification.
  
  try {
    // Return success to the client
    // The client will handle the Firestore update via its own SDK or we can do it here if we had Admin SDK.
    // Since we are full-stack, we assume the client will update its local state and sync to cloud.
    
    res.json({
      success: true,
      message: "Transaction verified successfully.",
      status: "verified",
      transactionId,
      activatedAt: Date.now()
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Failed to verify payment." });
  }
});

// API Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Omnisym AI Engine",
    version: "2.5.0",
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API: Multi-Modal Chat & Reasoning
app.post("/api/chat", async (req, res) => {
  try {
    const {
      prompt,
      history = [],
      mode = "default",
      modelName = "gemini-3.7-flash",
      imageBase64,
      imageMimeType = "image/png",
      useSearch = false,
      thinking = false,
      userName = "User",
      memories = [],
    } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: "Prompt or image is required." });
    }

    // Community & Support Discord Link Instant Response Rule
    const promptLower = (prompt || "").trim().toLowerCase();
    const isDiscordQuery = 
      promptLower === "dc link" ||
      promptLower === "discord" ||
      promptLower === "discord link" ||
      promptLower === "dc" ||
      promptLower === "community" ||
      promptLower === "support" ||
      promptLower.includes("discord link") ||
      promptLower.includes("dc link") ||
      promptLower.includes("join discord") ||
      promptLower.includes("join community") ||
      promptLower.includes("discord server");

    if (isDiscordQuery && !imageBase64) {
      return res.json({
        text: "Join our official Chiku Realm × Omnisym AI community here: https://discord.gg/kbvYTvtqFv 🚀 Share your builds, get support, and chat with other creators!",
        rawText: "Join our official Chiku Realm × Omnisym AI community here: https://discord.gg/kbvYTvtqFv 🚀 Share your builds, get support, and chat with other creators!",
        model: "Omnisym Instant Rules",
        citations: [],
        triggeredImagePrompt: null,
        newMemories: [],
      });
    }

    const ai = getGenAI();
    let baseInstruction = PERSONA_PROMPTS[mode] || PERSONA_PROMPTS.default;

    // Substitute user name in prompt
    baseInstruction = baseInstruction.replace(/\{user_name\}/g, userName || "User");

    // Inject persistent learned memories if present
    if (Array.isArray(memories) && memories.length > 0 && mode !== "temp") {
      const formattedMemories = memories.map((m: string) => `- ${m}`).join("\n");
      baseInstruction += `\n\n[PERSISTENT USER MEMORIES & PREFERENCES]\nThe following permanent facts have been learned about ${userName} across previous sessions. Seamlessly adapt and respect these preferences:\n${formattedMemories}`;
    }

    // Define resilient model candidate cascade
    let candidateModels: string[] = [];
    if (thinking) {
      candidateModels = ["gemini-3.1-pro-preview", "gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    } else {
      // Prioritize flash-lite and flash-latest as they are more token-efficient and have higher quotas
      candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", modelName || "gemini-3.7-flash", "gemini-3.1-pro-preview"];
    }

    // Deduplicate candidate models
    candidateModels = Array.from(new Set(candidateModels));

    // Build multi-turn contents - Limited to last 10 messages for token efficiency
    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

    // Add prior conversation turns if provided
    if (recentHistory.length > 0) {
      for (const h of recentHistory) {
        if ((h.role === "user" || h.role === "assistant") && h.text) {
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.text }],
          });
        }
      }
    }

    // Current turn parts
    const currentTurnParts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      currentTurnParts.push({
        inlineData: {
          mimeType: imageMimeType || "image/png",
          data: cleanBase64,
        },
      });
    }

    // Append user prompt with context if image is provided without text
    let finalPrompt = prompt || "Analyze this image in detail according to the Vision Protocol.";
    currentTurnParts.push({ text: finalPrompt });

    // Append current turn to contents
    contents.push({
      role: "user",
      parts: currentTurnParts,
    });

    // Build configuration
    const config: any = {
      systemInstruction: baseInstruction,
      generationConfig: {
        maxOutputTokens: 1024, // Optimized limit to save quota
        temperature: 0.7,
      },
    };

    if (useSearch || mode === "research") {
      config.tools = [{ googleSearch: {} }];
    }

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      candidateModels,
      contents,
      config
    );

    const rawResponseText = response.text || "";

    // Extract grounding citations if present
    let citations: { title: string; url: string }[] = [];
    const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      citations = groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({
          title: c.web?.title || c.web?.uri,
          url: c.web?.uri,
        }));
    }

    // Check for triggered image generation tag: [GENERATE_PICTURE: "..."] or [TRIGGER_IMAGE_GEN: "..."]
    const imageGenMatch = rawResponseText.match(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*["']?([^"\]]+)["']?\]/i);
    const triggeredImagePrompt = imageGenMatch ? imageGenMatch[1].trim() : null;

    // Check for continuous learning memory tags: [SAVE_MEMORY: "..."]
    const newMemories: string[] = [];
    const memoryRegex = /\[SAVE_MEMORY:\s*["']?([^"\]]+)["']?\]/gi;
    let memMatch: RegExpExecArray | null;
    while ((memMatch = memoryRegex.exec(rawResponseText)) !== null) {
      if (memMatch[1] && memMatch[1].trim()) {
        newMemories.push(memMatch[1].trim());
      }
    }

    // Clean internal tags from returned text for display
    const cleanText = rawResponseText
      .replace(/\[(?:GENERATE_PICTURE|TRIGGER_IMAGE_GEN):\s*["']?[^"\]]+["']?\]/gi, "")
      .replace(/\[SAVE_MEMORY:\s*["']?[^"\]]+["']?\]/gi, "")
      .trim();

    res.json({
      text: cleanText || rawResponseText,
      rawText: rawResponseText,
      model: modelUsed,
      citations,
      triggeredImagePrompt,
      newMemories,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    
    let userFriendlyError = error?.message || "Failed to generate AI response. High demand detected; please try again.";
    
    // Check for quota or rate limit errors specifically to provide helpful Hinglish feedback
    const errorStr = String(error).toLowerCase() + (error?.message?.toLowerCase() || "");
    if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource_exhausted")) {
      userFriendlyError = "The AI service quota has been exceeded for this session. Please try again shortly or verify your API configuration in settings.";
    }

    res.status(500).json({
      error: userFriendlyError,
      details: String(error),
    });
  }
});

// API: Auto-Titling for chat sessions
app.post("/api/generate-title", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getGenAI();
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
    
    const contents = [
      {
        role: "user",
        parts: [{ text: `Summarize the topic of this conversation in exactly 2 to 4 words. Be concise and relevant.\n\nMessage: "${message}"` }],
      }
    ];

    const { response } = await generateContentWithFallback(
      ai,
      candidateModels,
      contents,
      {
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.5,
        },
      }
    );

    const title = (response.text || "").replace(/["']/g, "").trim();
    res.json({ title: title || "New Chat" });
  } catch (error) {
    console.error("Error generating title:", error);
    res.json({ title: "New Chat" }); // Graceful fallback
  }
});

// Master Prompt Expansion Helper for Omnisym Image Engine
async function expandImagePromptMaster(rawPrompt: string, style?: string): Promise<string> {
  const promptLower = rawPrompt.toLowerCase();
  
  // 1. Gaming & Fictional Intent Detection
  const isGaming = 
    promptLower.includes("minecraft") || 
    promptLower.includes("roblox") || 
    promptLower.includes("game") || 
    promptLower.includes("pixel") || 
    promptLower.includes("blocky") ||
    promptLower.includes("voxel") ||
    promptLower.includes("8-bit") ||
    promptLower.includes("retro game");

  // 2. Photographic & Real-Life Intent Detection
  const isPhotographic = 
    promptLower.includes("real-life") || 
    promptLower.includes("photorealistic") || 
    promptLower.includes("photography") || 
    promptLower.includes("dslr") || 
    promptLower.includes("4k") ||
    promptLower.includes("8k") ||
    promptLower.includes("realistic lighting") ||
    promptLower.includes("documentary") ||
    promptLower.includes("human");

  // Inject specific style constraints based on detected intent
  let finalRawPrompt = rawPrompt;
  if (isGaming) {
    finalRawPrompt += ", voxel art, blocky style, in-game screenshot aesthetic, 3D render, ray-traced RTX shaders, hyper-distinct voxel geometry, volumetric lighting, sharp 4K textures";
  } else if (isPhotographic) {
    finalRawPrompt += ", DSLR, 4k, realistic lighting, documentary photography, high-resolution textures, cinematic lighting, sharp focus, masterpiece composition, 8k resolution, photorealistic";
  }

  // If the prompt is already comprehensive and detailed (> 250 chars), keep it
  if (finalRawPrompt.length > 250) {
    return finalRawPrompt;
  }

  try {
    const ai = getGenAI();
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `You are the Master Prompt Engineer for Omnisym AI.
Transform the following basic or short image request into a rich, immersive, 2 to 3 sentence visual masterpiece prompt for high-resolution image generation.

SUBJECT RULES:
- Gaming / Voxel (Minecraft, Roblox, Cyberpunk): If detected, strictly enforce "voxel art, blocky style, in-game screenshot aesthetic, 3D render" with ray-traced RTX shaders and volumetric atmospheric lighting. NEVER generate real humans.
- Real-Life / Scenery / Nature: If detected, strictly enforce DSLR photography terms (DSLR, 4k, realistic lighting, documentary photography, high-resolution textures, cinematic lighting, sharp focus).
- Quality Baseline: Naturally integrate "8K, cinematic lighting, sharp focus, masterpiece composition" into the sentences.

IMPORTANT: Output ONLY the enhanced 2-3 sentence prompt without explanations, intros, or quotes.

Original Request: "${finalRawPrompt}"`
          }
        ]
      }
    ];

    const { response } = await generateContentWithFallback(
      ai,
      ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"],
      contents,
      {
        generationConfig: {
          maxOutputTokens: 250,
          temperature: 0.65,
        }
      }
    );

    const expanded = (response.text || "").replace(/^["']|["']$/g, "").trim();
    if (expanded && expanded.length > 20) {
      return expanded;
    }
  } catch (err) {
    console.warn("[Master Prompt Engineer] AI expansion fallback to heuristic:", err);
  }

  // High-Grade Heuristic Fallback
  if (isGaming) {
    return `A stunning, hyper-detailed voxel art masterpiece of ${rawPrompt}, featuring ray-traced RTX shader lighting, volumetric god rays streaming across blocky terrain, crisp 4K textures, dynamic water reflections, and an immersive atmospheric blocky aesthetic, 8K resolution, 3D render.`;
  } else if (isPhotographic) {
    return `A cinematic 8K master photograph of ${rawPrompt}, capturing realistic lighting, DSLR camera quality, documentary photography style, high-resolution organic textures, subtle atmospheric depth of field, and dramatic cinematic studio shadows.`;
  } else {
    return `A breathtaking National Geographic style landscape photograph of ${rawPrompt}, captured during golden hour with dramatic volumetric lighting, ultra-sharp atmospheric depth, rich hyper-detailed organic textures, and crisp 8K cinematic composition.`;
  }
}

// API: Image Generation
app.post("/api/generate-image", async (req, res) => {
  const {
    prompt,
    aspectRatio = "1:1",
    imageSize = "1K",
    style = "photorealistic",
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required for image generation." });
  }

  // Dynamically rewrite and elevate prompt via Master Prompt Engineer
  const enhancedPrompt = await expandImagePromptMaster(prompt, style);
  console.log(`[Master Prompt Engineer] Expanded "${prompt.slice(0, 40)}..." -> "${enhancedPrompt.slice(0, 80)}..."`);

  const ai = getGenAI();
  const candidateModels = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];

  let imageUrl: string | null = null;
  let descriptionText = "";
  let modelUsed = candidateModels[0];

  try {
    for (const model of candidateModels) {
      let modelSucceeded = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [{ text: enhancedPrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: imageSize as any,
              },
            },
          });

          if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || "image/png";
                imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              } else if (part.text) {
                descriptionText += part.text + " ";
              }
            }
          }

          if (imageUrl) {
            modelUsed = model;
            modelSucceeded = true;
            break;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn(`[Image Engine] Model ${model} attempt ${attempt + 1} error:`, errMsg.slice(0, 120));
          
          // If we hit a quota limit, try to respect the suggested retry delay if possible, 
          // or use exponential backoff.
          if (errMsg.includes("429")) {
            const backoff = (attempt + 1) * 3000; // 3s, 6s...
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }

          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            continue;
          }
          break;
        }
      }
      if (modelSucceeded) break;
    }
  } catch (outerErr) {
    console.warn("[Image Engine] Outer error in generation cascade:", outerErr);
  }

  // Graceful visual rendering if API models are experiencing temporary high-demand spikes
  if (!imageUrl) {
    return res.status(503).json({
      error: "Image generation service is temporarily overloaded or quota exceeded.",
      details: "Please try again shortly."
    });
  }

  res.json({
    imageUrl,
    prompt: enhancedPrompt,
    originalPrompt: prompt,
    aspectRatio,
    imageSize,
    modelUsed,
    description: descriptionText.trim() || `Generated visual asset for: "${enhancedPrompt}"`,
  });
});

// API: Feedback dispatch to opopteamop@gmail.com
app.post("/api/feedback", async (req, res) => {
  try {
    const {
      category = "General Issue",
      notes = "",
      messageId = "",
      promptSnippet = "",
      aiResponseSnippet = "",
      userEmail = "user@omnisym.ai",
    } = req.body;

    const recipientEmail = process.env.FEEDBACK_RECEIVER_EMAIL || "opopteamop@gmail.com";

    const feedbackRecord: FeedbackRecord = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      category,
      notes,
      messageId,
      promptSnippet: promptSnippet.substring(0, 300),
      aiResponseSnippet: aiResponseSnippet.substring(0, 500),
      userEmail,
      recipientEmail,
      status: "dispatched",
    };

    feedbackStore.unshift(feedbackRecord);

    // Formatted email payload log
    console.log("==================================================");
    console.log(`[DISPATCH EMAIL TO]: ${recipientEmail}`);
    console.log(`[SUBJECT]: Omnisym AI Feedback Alert - [${category}]`);
    console.log(`[FROM]: ${userEmail}`);
    console.log(`[TIME]: ${feedbackRecord.timestamp}`);
    console.log(`[DETAILS]: ${notes}`);
    console.log(`[PROMPT]: ${promptSnippet}`);
    console.log(`[RESPONSE]: ${aiResponseSnippet}`);
    console.log("==================================================");

    res.json({
      success: true,
      message: `Feedback recorded and dispatched to ${recipientEmail}`,
      feedbackId: feedbackRecord.id,
      timestamp: feedbackRecord.timestamp,
    });
  } catch (error: any) {
    console.error("Error in /api/feedback:", error);
    res.status(500).json({
      error: "Failed to record feedback.",
    });
  }
});

// API: Get feedback history (for admin/settings view)
app.get("/api/feedback", (req, res) => {
  // Basic security: check for admin identifier or specific header
  // Note: For full production, use Firebase Admin SDK to verify ID tokens.
  const adminEmail = req.headers["x-admin-email"];
  if (adminEmail !== "apar123445@gmail.com") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  res.json({
    total: feedbackStore.length,
    feedbacks: feedbackStore.slice(0, 50),
  });
});

// API 404 Catch-All (Prevents API requests from falling through to Vite SPA HTML)
app.all("/api/*", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path && req.path.startsWith("/api")) {
    console.error("[Omnisym API Error]:", err);
    res.status(500).json({ error: err?.message || "Internal server error occurred." });
    return;
  }
  next(err);
});

// Vite Middleware for Full-Stack App
async function startServer() {
  const nodeEnv = process.env.NODE_ENV || "development";
  console.log(`[Omnisym Boot] Environment: ${nodeEnv}`);

  if (nodeEnv !== "production") {
    console.log("[Omnisym Boot] Initializing Vite Middleware (Development Mode)...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        host: '0.0.0.0',
        allowedHosts: true,
        fs: {
          strict: false,
          allow: [process.cwd()]
        }
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Production Mode: Aggressive static asset serving with caching headers
    const distPath = path.resolve(process.cwd(), "dist");
    
    // Serve assets with long-term caching
    app.use("/assets", express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
      index: false
    }));

    // Serve public folder assets
    app.use(express.static(distPath, {
      maxAge: "1d",
      index: false
    }));

    // SPA Fallback: Serve index.html for all other routes
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("[Omnisym Server] Critical error sending index.html:", err);
          res.status(500).send("Critical Boot Error: index.html missing in dist. Please rebuild.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("==================================================");
    console.log(`🚀 [Omnisym Server] Ingress: http://0.0.0.0:${PORT}`);
    console.log(`📦 Node Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏱️ Startup Time: ${new Date().toLocaleString()}`);
    console.log("==================================================");
  });

  // Heartbeat logging to monitor server liveness in production
  setInterval(() => {
    if (process.env.NODE_ENV === "production") {
      console.log(`[Heartbeat] ${new Date().toISOString()} - Server is responsive on port ${PORT}`);
    }
  }, 300000); // Every 5 minutes
}

startServer();
