import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-hg-teal-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="font-display text-lg font-bold text-hg-teal-700">
                HealthGuide
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Connecting families with trusted caregivers.
              Free for caregivers. Transparent ratings.
              Verified credentials.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-sans font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/caregivers" className="text-gray-500 hover:text-hg-teal-700 text-sm transition-colors">
                  Find Caregivers
                </Link>
              </li>
              <li>
                <a href="#download" className="text-gray-500 hover:text-hg-teal-700 text-sm transition-colors">
                  Download App
                </a>
              </li>
            </ul>
          </div>

          {/* For Caregivers */}
          <div>
            <h3 className="font-sans font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              For Caregivers
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">
              Create your free profile on the HealthGuide app and get discovered by agencies in your area.
            </p>
            <a
              href="#download"
              className="text-hg-emerald-600 font-semibold text-sm hover:text-hg-emerald-700 transition-colors"
            >
              Sign up for free &rarr;
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} HealthGuide. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-gray-600 text-xs transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-600 text-xs transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
