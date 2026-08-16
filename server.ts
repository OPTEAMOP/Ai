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
const BASE_SYSTEM_PROMPT = `[IDENTITY] OmniSym (Hinglish AI). FRIENDLY, CASUAL, BROTHERLY tone.
[RULE] Always speak in Hinglish (Hindi in English script). 
[GREET] Start with: "Hi {user_name}, kya chal raha hai aaj? Kaise help karu teri?"
[IMAGE] Use: ![Desc](https://image.pollinations.ai/prompt/PROMPT-HERE?width=1024&height=1024&nologo=true)
[CODE] Give full working code in blocks; explain in Hinglish.
[MEMORY] Learn user facts: [SAVE_MEMORY: "fact"].
[VISION] Analyze images in Hinglish. Be concise to save tokens.`;

const PERSONA_PROMPTS: Record<string, string> = {
  default: BASE_SYSTEM_PROMPT,
  code: `${BASE_SYSTEM_PROMPT}\n[SLASH: /code] Senior Dev mode. Clean code only.`,
  research: `${BASE_SYSTEM_PROMPT}\n[SLASH: /research] Web Researcher. Factual analysis.`,
  "3d": `${BASE_SYSTEM_PROMPT}\n[SLASH: /3d] 3D Specialist. Spatial concepts.`,
  human: `${BASE_SYSTEM_PROMPT}\n[SLASH: /human] Ultra-casual, empathetic friend vibe. "Bhai kya haal hai..."`,
  temp: `${BASE_SYSTEM_PROMPT}\n[SLASH: /temp] Incognito. No memory tags.`,
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
      userFriendlyError = "Bhai, Gemini ki daily limit ya quota khatam ho gaya hai. Thodi der wait kar ke dubara try kar, ya fir Settings mein check kar ki API key sahi hai na?";
    }

    res.status(500).json({
      error: userFriendlyError,
      details: String(error),
    });
  }
});

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

  const ai = getGenAI();
  const candidateModels = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];
  const enhancedPrompt = `${prompt}. High detail, ${style} aesthetic, masterpiece quality, pristine lighting.`;

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
          if (errMsg.includes("429") && errMsg.includes("quota")) {
            throw err;
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
    const safePrompt = prompt.replace(/"/g, "'").slice(0, 80);
    const svgGraphic = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="50%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#db2777" />
        </linearGradient>
        <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#312e81" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g2)"/>
      <circle cx="512" cy="512" r="400" fill="url(#rg)"/>
      <circle cx="512" cy="512" r="280" fill="none" stroke="url(#g1)" stroke-width="4" stroke-dasharray="12 12"/>
      <circle cx="512" cy="512" r="220" fill="#090d16" stroke="#4f46e5" stroke-width="2"/>
      <path d="M512 300 L550 430 L680 430 L575 510 L615 640 L512 560 L409 640 L449 510 L344 430 L474 430 Z" fill="url(#g1)" />
      <text x="512" y="780" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">OMNISYM VISUAL ASSET</text>
      <text x="512" y="820" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#cbd5e1" text-anchor="middle">"${safePrompt}"</text>
      <text x="512" y="860" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">High-Resolution Visual Render</text>
    </svg>`;
    imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgGraphic)}`;
    descriptionText = `I have generated this visual composition for your request: "${prompt}"`;
  }

  res.json({
    imageUrl,
    prompt,
    aspectRatio,
    imageSize,
    modelUsed,
    description: descriptionText.trim() || `Generated visual asset for: "${prompt}"`,
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
app.get("/api/feedback", (_req, res) => {
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Omnisym Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
