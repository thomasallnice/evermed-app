export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You're Offline</h1>
        <p className="text-gray-600 mb-6">
          It looks like you've lost your internet connection. Some features may be limited while offline.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Try Again
          </button>
          <a
            href="/vault"
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Vault
          </a>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          Your documents are cached and accessible offline.
        </p>
      </div>
    </div>
  );
}
