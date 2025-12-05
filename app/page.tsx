import { redirect } from 'next/navigation';
import { fetchAvailableDates } from './lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const dates = await fetchAvailableDates();
    if (dates.length > 0) {
        redirect(`/date/${dates[0]}`);
    }
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">暂无简报</h1>
                <p className="text-gray-500">请稍后再试。</p>
            </div>
        </div>
    );
}
