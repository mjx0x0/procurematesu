import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

let slotGenAI: GoogleGenAI | null = null;
function getSlotGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!slotGenAI) {
    slotGenAI = new GoogleGenAI({ apiKey });
  }
  return slotGenAI;
}

function fallbackExtraction(message: string) {
  const qtyMatch = message.match(/(\d+)\s*(pcs|units?|sets?|boxes?|reams?|bottles?|packs?)?\s*([a-zA-Z\s]+)/i);
  const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
  const unit = (qtyMatch && qtyMatch[2]) || 'units';
  const desc = (qtyMatch && qtyMatch[3]?.trim()) || message.slice(0, 60);
  const costMatch = message.match(/(?:cost|price|budget|around|₱|php)?\s*[:=]?\s*(\d+[\d,]*)/i);
  const unitCost = costMatch ? parseInt(costMatch[1].replace(/,/g, ''), 10) : 5000;

  return {
    department: "Mindanao State University - General Santos",
    purpose: message,
    items: [
      {
        item_description: desc,
        quantity: qty,
        unit: unit,
        unit_cost: unitCost,
        total_cost: qty * unitCost,
      },
    ],
    total_amount: qty * unitCost,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const client = getSlotGenAI();
    if (!client) {
      return NextResponse.json({ extracted: fallbackExtraction(message) });
    }

    const systemPrompt = `
You are an AI assistant that extracts purchase request details from natural language for Mindanao State University - General Santos.

Extract the following fields and return them as a JSON object:
- department: string (e.g., "College of Science and Mathematics")
- purpose: string (a brief description of the overall request)
- items: array of objects with:
  - item_description: string
  - quantity: number
  - unit: string (e.g., "pcs", "units", "sets")
  - unit_cost: number (estimated cost per unit)
  - total_cost: number (quantity × unit_cost)
- total_amount: number (sum of all item total costs)

Return ONLY valid JSON matching this schema.
`;

    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let extractedText = '';

    for (const model of modelsToTry) {
      try {
        const generatePromise = client.models.generateContent({
          model,
          contents: `Extract purchase request details from this message:\n\n${message}`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('TIMEOUT'));
          }, 10000);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text?.trim();
        if (text) {
          extractedText = text;
          break;
        }
      } catch (err: any) {
        if (err?.message !== 'TIMEOUT') {
          console.warn(`[slot-fill] Model ${model} call error:`, err?.message?.slice(0, 100) || err);
        }
      }
    }

    if (extractedText) {
      const clean = extractedText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        const result = JSON.parse(clean);
        return NextResponse.json({ extracted: result });
      } catch (parseErr) {
        console.warn('[slot-fill] JSON parse failed, falling back:', parseErr);
      }
    }

    return NextResponse.json({ extracted: fallbackExtraction(message) });
  } catch (error: any) {
    console.error('❌ Slot-fill error:', error);
    return NextResponse.json({ extracted: fallbackExtraction('General Purchase Request') });
  }
}
