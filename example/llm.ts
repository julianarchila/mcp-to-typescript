import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});


const { text } = await generateText({
  model: openrouter.chat('anthropic/claude-haiku-4.5'),
  prompt: 'What is OpenRouter?',
});

console.log(text);
