'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ALL_CAPABILITIES, CAPABILITY_LABELS } from '@/types/caregiver';

interface Props {
  initialZip?: string;
  initialCapabilities?: string[];
}

export function SearchFilters({ initialZip = '', initialCapabilities = [] }: Props) {
  const router = useRouter();
  const [zip, setZip] = useState(initialZip);
  const [selectedCaps, setSelectedCaps] = useState<string[]>(initialCapabilities);

  function toggleCapability(cap: string) {
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (zip.trim()) params.set('zip', zip.trim());
    if (selectedCaps.length > 0) params.set('capabilities', selectedCaps.join(','));
    router.push(`/caregivers?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      {/* Zip Code */}
      <div>
        <label htmlFor="zip" className="block text-sm font-semibold text-gray-700 mb-1">
          Zip Code
        </label>
        <div className="flex gap-3">
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="e.g., 78201"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-hg-teal-700 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-hg-teal-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-hg-teal-800 transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Skills</p>
        <div className="flex flex-wrap gap-2">
          {ALL_CAPABILITIES.map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => toggleCapability(cap)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedCaps.includes(cap)
                  ? 'bg-hg-emerald-50 text-hg-emerald-600 border-hg-emerald-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {CAPABILITY_LABELS[cap] || cap}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
