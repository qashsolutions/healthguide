import { SearchFilters } from '@/components/SearchFilters';
import { DownloadCTA } from '@/components/DownloadCTA';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Find Trusted Caregivers
              <br />
              <span className="text-hg-teal-700">in Your Area</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Browse verified caregiver profiles by location, skills, and community ratings.
              Free for caregivers. Transparent for everyone.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <SearchFilters />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ValueCard
            icon={
              <svg className="w-8 h-8 text-hg-teal-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            title="Verified Credentials"
            description="Caregivers can verify their NPI credentials through the national registry. Look for the verified badge."
          />
          <ValueCard
            icon={
              <svg className="w-8 h-8 text-hg-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            }
            title="Transparent Ratings"
            description="See honest ratings and feedback from agencies and families who have worked with each caregiver."
          />
          <ValueCard
            icon={
              <svg className="w-8 h-8 text-hg-teal-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
            title="Free for Caregivers"
            description="Caregivers create profiles for free and get discovered by agencies. No subscriptions or hidden fees."
          />
        </div>
      </section>

      {/* Download CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <DownloadCTA />
      </section>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="mb-4">{icon}</div>
      <h3 className="font-sans font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
