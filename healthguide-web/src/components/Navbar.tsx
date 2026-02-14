import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-hg-teal-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-display text-xl font-bold text-hg-teal-700">
              HealthGuide
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/caregivers"
              className="text-gray-600 hover:text-hg-teal-700 font-medium text-sm transition-colors"
            >
              Find Caregivers
            </Link>
            <DownloadButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

function DownloadButton() {
  return (
    <a
      href="#download"
      className="bg-hg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-hg-teal-800 transition-colors"
    >
      Get the App
    </a>
  );
}
