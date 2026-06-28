import Groq from 'groq-sdk';

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

let client: Groq | null = null;
function getClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export function llmAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Ask the LLM for a JSON object. Returns the parsed object, or null on any
 * failure (no key, network error, bad JSON) so callers can fall back to
 * deterministic logic. Keep prompts free of PII.
 */
export async function llmJson<T>(
  system: string,
  user: string
): Promise<T | null> {
  const groq = getClient();
  if (!groq) return null;
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('llm error:', (error as Error).message);
    return null;
  }
}

/** Free-text completion with fallback. */
export async function llmText(
  system: string,
  user: string
): Promise<string | null> {
  const groq = getClient();
  if (!groq) return null;
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return res.choices[0]?.message?.content ?? null;
  } catch (error) {
    console.error('llm error:', (error as Error).message);
    return null;
  }
}
