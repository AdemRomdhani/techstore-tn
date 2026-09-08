// =============================================================
// AI SERVICE - Google Gemini Flash for product extraction (FREE)
// =============================================================
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

let genaiClient = null;

function getApiKey() {
  // Support both GEMINI_API_KEY and GOOGLE_API_KEY (SDK supports both, GOOGLE_API_KEY takes precedence in SDK)
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return key.trim();
}

function isApiKeyConfigured() {
  const apiKey = getApiKey();
  return !!apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== '';
}

function getClient() {
  if (!genaiClient) {
    const apiKey = getApiKey();
    if (!isApiKeyConfigured()) {
      throw new Error('GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey');
    }
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

// Allow resetting cached client (e.g., after env changes without restart)
function resetClient() {
  genaiClient = null;
}

const SYSTEM_PROMPT = `You are a product data extractor for an e-commerce store. Analyze the image carefully and extract ALL visible product information.

You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "products": [
    {
      "name": "Product name",
      "description": "Product description (2-3 sentences, suitable for an online store)",
      "price": 0.00,
      "old_price": null,
      "brand": "Brand name if visible, otherwise null",
      "stock": 0,
      "category_suggestion": "Suggested category name"
    }
  ]
}

RULES:
- CRITICAL: You MUST extract EVERY SINGLE product visible in the image. Do NOT skip any product. Count all items and return all of them.
- If the image shows MULTIPLE different products (like a catalog, shelf, invoice, or group photo), create a SEPARATE entry for EACH product. Do NOT combine them into one entry.
- If the image is an INVOICE/FACTURE: extract ALL line items. Use unit price as "price" and quantity as "stock". If there are original/discounted prices, use old_price for the original.
- If the image is a SINGLE PRODUCT PHOTO: extract that one product.
- If you see 4 products in the image, you MUST return 4 separate product entries. If you see 10, return 10.
- For prices: numbers only, no currency symbols. Just the numeric value.
- Default stock to 0 if not visible. For invoices, use the quantity.
- Guess a relevant category (Electronics, Clothing, Home & Kitchen, Sports, Beauty, Toys, Automotive, etc.)
- If a field is unclear, use null for optional fields and sensible defaults for required fields.
- Description must be in English.
- Be thorough: look for brand logos, model numbers, packaging text, price tags.
- Double-check your output: count the products in your JSON array and make sure it matches the number of distinct products you see in the image.`;

/**
 * Extract products from a SINGLE image.
 * Returns structured product data.
 * Auto-fallback across model versions if one is deprecated (404 NOT_FOUND).
 */
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function extractProductsFromSingleImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase().replace('.', '');
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Allow override via env, but always have fallbacks without duplicates
  const preferred = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  const modelsToTry = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];

  const MAX_RETRIES = 3;
  let lastError = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Analyze this image and extract ALL product information. If there are multiple products visible, list each one as a separate entry in the products array. Do not skip any product.' },
                { inlineData: { mimeType, data: base64Image } },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 8192,
            temperature: 0.1,
          },
        });

        const content = (response.text || '').trim();
        if (!content) throw new Error('AI returned empty response');

        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed.products || !Array.isArray(parsed.products)) {
            throw new Error('Invalid response structure');
          }
          if (model !== preferred) {
            console.warn(`Fallback model succeeded: ${model} (preferred ${preferred} failed)`);
          }
          return parsed;
        } catch (parseErr) {
          console.error('Failed to parse AI response:', content);
          throw new Error('AI returned invalid data. Please try again with a clearer image.');
        }
      } catch (err) {
        lastError = err;
        const msg = err.message || JSON.stringify(err);
        const isModelNotFound =
          msg.includes('404') ||
          msg.includes('NOT_FOUND') ||
          msg.includes('is no longer available') ||
          msg.includes('not found') ||
          msg.includes('model not found');
        const isRetryable =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('rate limit');

        if (isModelNotFound) {
          console.warn(`Model ${model} not available: ${msg}. Trying fallback...`);
          break; // try next model
        }
        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
          console.warn(`Gemini 503 for ${model} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        // Non-retriable -> fail fast
        throw err;
      }
    }
  }

  // All models exhausted
  if (lastError) throw lastError;
  throw new Error('AI extraction failed - no model available');
}

module.exports = { extractProductsFromSingleImage, isApiKeyConfigured, resetClient, getClient };
