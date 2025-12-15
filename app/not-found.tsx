import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-midnight-bg p-4 text-center">
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 mb-4">
                404
            </h1>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Sorry, the page you are looking for does not exist. It might have been moved or deleted.
            </p>
            <div className="flex gap-4">
                <Link
                    href="/"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
                >
                    Return Home
                </Link>
                <Link
                    href="/trends"
                    className="px-6 py-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-50 dark:bg-transparent dark:text-gray-200 dark:border-gray-700 dark:hover:bg-midnight-card transition-colors"
                >
                    Explore Trends
                </Link>
            </div>
        </div>
    );
}
