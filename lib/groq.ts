type GroqResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict?: boolean;
        schema: Record<string, unknown>;
      };
    };

interface GroqOptions {
  responseFormat?: GroqResponseFormat;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function callGroq(
  prompt: string,
  systemInstruction?: string,
  temperature = 0.2,
  options: GroqOptions = {},
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b',
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: options.maxOutputTokens ?? 1800,
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('[Groq API] Request failed:', response.status, detail.slice(0, 180));
      return '';
    }

    const data = await response.json();
    return typeof data?.choices?.[0]?.message?.content === 'string'
      ? data.choices[0].message.content.trim()
      : '';
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.warn('[Groq API] Request failed:', error?.message?.slice(0, 180) || 'Unknown error');
    }
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
