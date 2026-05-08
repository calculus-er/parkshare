import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set. AI pricing will fall back to deterministic pricing.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function callGemini(prompt: string): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini client is not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
