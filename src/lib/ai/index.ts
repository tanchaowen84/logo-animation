import 'server-only';

import OpenAI from 'openai';

const baseURL = process.env.OPENROUTER_API_BASE_URL ?? 'https://openrouter.ai/api/v1';

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set.');
  }
  return apiKey;
}

export function getOpenRouterClient() {
  const headers: Record<string, string> = {};
  if (process.env.OPENROUTER_HTTP_REFERER) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
  }
  if (process.env.OPENROUTER_HTTP_TITLE) {
    headers['X-Title'] = process.env.OPENROUTER_HTTP_TITLE;
  }

  return new OpenAI({
    apiKey: getApiKey(),
    baseURL,
    defaultHeaders: headers,
  });
}
