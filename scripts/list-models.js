/* eslint-disable @typescript-eslint/no-require-imports */
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY_CHENG30 || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('No API key found');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).listModels();
    console.log('Available Models:');
    result.models.forEach((m) => {
      console.log(`- ${m.name} (Display: ${m.displayName})`);
    });
  } catch (e) {
    console.error('Error listing models:', e.message);
  }
}

listModels();
