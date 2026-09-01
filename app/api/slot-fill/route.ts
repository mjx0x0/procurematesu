import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key missing' },
        { status: 500 }
      );
    }

    // System prompt to extract PR fields
    const systemPrompt = `
You are an AI assistant that extracts purchase request details from natural language.

Extract the following fields and return them as a JSON object:
- department: string (e.g., "College of Science and Mathematics")
- purpose: string (a brief description of the overall request)
- items: array of objects with:
  - item_description: string
  - quantity: number
  - unit: string (e.g., "pcs", "units", "sets")
  - unit_cost: number (estimated cost per unit)
  - total_cost: number (quantity × unit_cost) – can be calculated
- total_amount: number (sum of all item total costs)

If a field is not mentioned, use null.
Return ONLY the JSON object, no other text.

Example user input: "I need 10 laptops for the CSM department, budget around ₱500,000."
Example output:
{
  "department": "College of Science and Mathematics",
  "purpose": "Purchase of 10 laptops for CSM department",
  "items": [
    {
      "item_description": "Laptop",
      "quantity": 10,
      "unit": "pcs",
      "unit_cost": 50000,
      "total_cost": 500000
    }
  ],
  "total_amount": 500000
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `System: ${systemPrompt}\n\nUser: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to extract PR details' },
        { status: 503 }
      );
    }

    const data = await response.json();
    let extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Clean up: remove markdown code fences if present
    extracted = extracted.replace(/```json/g, '').replace(/```/g, '').trim();

    // Parse JSON
    let result;
    try {
      result = JSON.parse(extracted);
    } catch {
      return NextResponse.json(
        { error: 'Invalid response from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ extracted: result });
  } catch (error: any) {
    console.error('❌ Slot-fill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}