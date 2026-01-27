/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// 手动解析 .env.local 避免依赖 dotenv
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY_CHENG30=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

async function listModels() {
  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey.replace(/['"]/g, ''));
  try {
    const genModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    // 在 v1beta 中可以直接 call listModels
    const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).listModels();
    console.log('Available Models:');
    result.models.forEach((m) => {
      console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
    });
  } catch (e) {
    console.error('Error listing models:', e.message);
  }
}

listModels();
