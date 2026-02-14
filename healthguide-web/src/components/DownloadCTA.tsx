interface Props {
  caregiverName?: string;
}

export function DownloadCTA({ caregiverName }: Props) {
  const message = caregiverName
    ? `Download HealthGuide to connect with ${caregiverName}`
    : 'Download HealthGuide to connect with caregivers';

  return (
    <section id="download" className="bg-gradient-to-r from-hg-teal-700 to-hg-emerald-600 rounded-2xl p-8 md:p-12 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        {message}
      </h2>
      <p className="text-teal-100 mb-8 max-w-xl mx-auto">
        HealthGuide connects families, agencies, and caregivers in one secure platform.
        Download now to get started.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="#"
          className="inline-flex items-center justify-center gap-2 bg-white text-hg-teal-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          App Store
        </a>
        <a
          href="#"
          className="inline-flex items-center justify-center gap-2 bg-white text-hg-teal-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
          </svg>
          Google Play
        </a>
      </div>
    </section>
  );
}
