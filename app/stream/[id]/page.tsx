import React from 'react';
import { fetchFilteredArticles } from '../../services/articleLoader';
import StreamList from '../../components/StreamList';

export default async function StreamPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const decodedId = decodeURIComponent(id);

    // Fetch initial data on server
    const { articles, continuation } = await fetchFilteredArticles(decodedId);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 break-words">{decodedId}</h1>
            <StreamList
                filterValue={decodedId}
                initialArticles={articles}
                initialContinuation={continuation}
            />
        </div>
    );
}
