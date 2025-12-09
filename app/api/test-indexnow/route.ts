import { NextResponse } from 'next/server';
import { submitUrlsToIndexNow } from '@/utils/indexnow';

export async function GET() {
    const testUrl = 'https://www.alok-rss.top/test-indexnow-verification';
    const success = await submitUrlsToIndexNow([testUrl]);

    return NextResponse.json({
        success,
        message: success ? 'Submitted successfully to IndexNow' : 'Submission failed',
        submittedUrl: testUrl
    });
}
