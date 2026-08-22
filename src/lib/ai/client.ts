import OpenAI from 'openai';

declare global {
  var openaiGlobal: OpenAI | undefined;
}

const apiKey = process.env.OPENAI_API_KEY;
const isAIConfigured = !!apiKey;

let openaiClient: OpenAI | null = null;

if (isAIConfigured) {
  if (!globalThis.openaiGlobal) {
    globalThis.openaiGlobal = new OpenAI({
      apiKey,
    });
  }
  openaiClient = globalThis.openaiGlobal;
  console.log('OpenAI Client initialized successfully.');
} else {
  console.log('OPENAI_API_KEY is missing. Using rules-based deterministic mock generator for local development.');
}

export { openaiClient, isAIConfigured };
