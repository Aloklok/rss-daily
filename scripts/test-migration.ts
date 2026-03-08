
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTests() {
    console.log('🚀 Starting SDK Connectivity Tests (with dynamic import)...\n');

    // 动态导入，确保 dotenv.config() 已经运行
    const { generateEmbedding } = await import('../src/domains/intelligence/services/embeddings');
    const { generateGemini } = await import('../src/domains/intelligence/services/gemini');

    // 1. Test Embedding
    try {
        console.log('🔹 Testing Embedding (gemini-embedding-001)...');
        const embedding = await generateEmbedding('Hello World', 'RETRIEVAL_QUERY', 'ai');
        console.log(`✅ Embedding Success! Length: ${embedding.length}, Sample: ${embedding.slice(0, 5)}...`);
    } catch (e: any) {
        console.error('❌ Embedding Failed:', e.message);
    }

    console.log('\n' + '-'.repeat(40) + '\n');

    // 2. Test Gemini (Normal Mode)
    try {
        const modelId = 'gemini-2.0-flash';
        console.log(`🔹 Testing Gemini Normal Mode (${modelId})...`);
        const response = await generateGemini(
            [{ role: 'user', content: 'Say "Normal Mode OK"' }],
            modelId,
            100,
            undefined,
            false
        );
        console.log('✅ Response:', response.trim());
    } catch (e: any) {
        console.error('❌ Normal Mode Failed:', e.message);
    }

    console.log('\n' + '-'.repeat(40) + '\n');

    // 3. Test Gemini (Thinking Mode)
    try {
        // 使用支持思维的模型
        const modelId = 'gemini-2.5-flash-lite';
        console.log(`🔹 Testing Gemini Thinking Mode (${modelId})...`);
        const response = await generateGemini(
            [{ role: 'user', content: 'Explain Why 1+1=2 briefly' }],
            modelId,
            500,
            undefined,
            true
        );
        console.log('✅ Response (Thinking Enabled):', response.trim());
        console.log('ℹ️ Note: Thought process is hidden as requested.');
    } catch (e: any) {
        console.error('❌ Thinking Mode Failed:', e.message);
    }

    console.log('\n🏁 Tests Completed.');
}

runTests();
