import { fetchAvailableDates } from './lib/data';
import MainContentClient from './components/MainContentClient';
import { resolveBriefingImage } from '../services/articleLoader';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const dates = await fetchAvailableDates();
    const initialDate = dates.length > 0 ? dates[0] : undefined;

    let headerImageUrl = undefined;
    if (initialDate) {
        headerImageUrl = await resolveBriefingImage(initialDate);
    }

    return (
        <MainContentClient initialDate={initialDate} initialHeaderImageUrl={headerImageUrl} />
    );
}
