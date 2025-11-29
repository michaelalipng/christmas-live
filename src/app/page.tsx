import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Christmas Live</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/ascension/vote"
            className="block p-6 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Vote</h2>
            <p className="text-gray-600 dark:text-gray-400">Cast your vote</p>
          </Link>
          <Link
            href="/moderator?campus=ascension"
            className="block p-6 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Moderator</h2>
            <p className="text-gray-600 dark:text-gray-400">Moderator panel</p>
          </Link>
          <Link
            href="/overlay"
            className="block p-6 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Overlay</h2>
            <p className="text-gray-600 dark:text-gray-400">Live overlay display</p>
          </Link>
          <Link
            href="/results"
            className="block p-6 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Results</h2>
            <p className="text-gray-600 dark:text-gray-400">View results</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
