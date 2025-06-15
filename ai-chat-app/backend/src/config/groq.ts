// backend/src/config/groq.ts
import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is required');
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MODELS = {
  LLAMA3_8B: 'llama3-8b-8192',s
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
  LLAMA3_70B: 'llama3-70b-8192',
} as const;