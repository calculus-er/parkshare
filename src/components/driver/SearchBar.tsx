'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Shield, Zap, Eye } from 'lucide-react';

interface SearchBarProps {
  onSearch: (lat: number, lng: number) => void;
  onFilterChange: (filters: {
    maxPrice?: number;
    isCovered?: boolean;
    hasEVCharging?: boolean;
    hasCCTV?: boolean;
  }) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function SearchBar({ onSearch, onFilterChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Filters
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [isCovered, setIsCovered] = useState(false);
  const [hasEVCharging, setHasEVCharging] = useState(false);
  const [hasCCTV, setHasCCTV] = useState(false);

  // Debounced Nominatim geocoding search
  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: SearchResult[] = await res.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onSearch(parseFloat(result.lat), parseFloat(result.lon));
    setQuery(result.display_name.split(',')[0]);
    setShowResults(false);
  };

  const applyFilters = () => {
    onFilterChange({
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      isCovered: isCovered || undefined,
      hasEVCharging: hasEVCharging || undefined,
      hasCCTV: hasCCTV || undefined,
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setMaxPrice('');
    setIsCovered(false);
    setHasEVCharging(false);
    setHasCCTV(false);
    onFilterChange({});
    setShowFilters(false);
  };

  return (
    <div className="absolute top-4 left-4 right-16 z-[1000]">
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search location..."
              className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a]/90 backdrop-blur-md border border-white/[0.1] text-white text-sm
                         placeholder:text-white/25 focus:outline-none focus:border-[#00d4ff]/30 transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border border-white/20 border-t-[#00d4ff] rounded-full animate-spin" />
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-3 border backdrop-blur-md transition-all ${
              showFilters
                ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                : 'bg-[#0a0a0a]/90 border-white/[0.1] text-white/40 hover:text-white/60'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/[0.08] max-h-60 overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={i}
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-3 text-sm text-white/60 hover:bg-white/[0.04] hover:text-white transition-all border-b border-white/[0.04] last:border-b-0"
              >
                <span className="line-clamp-1">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-2 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/[0.08] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/40 text-[10px] tracking-wider uppercase">Filters</span>
            <button onClick={() => setShowFilters(false)} className="text-white/20 hover:text-white/40">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Max price */}
          <div className="mb-3">
            <label className="block text-white/30 text-[10px] tracking-wider uppercase mb-1.5">
              Max Price (₹/hr)
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="e.g. 200"
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] text-white text-xs
                         placeholder:text-white/20 focus:outline-none focus:border-[#00d4ff]/30"
            />
          </div>

          {/* Feature toggles */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { key: 'covered', icon: Shield, label: 'Covered', value: isCovered, setter: setIsCovered },
              { key: 'ev', icon: Zap, label: 'EV', value: hasEVCharging, setter: setHasEVCharging },
              { key: 'cctv', icon: Eye, label: 'CCTV', value: hasCCTV, setter: setHasCCTV },
            ].map(({ key, icon: Icon, label, value, setter }) => (
              <button
                key={key}
                onClick={() => setter(!value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-wider uppercase border transition-all ${
                  value
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/20 text-[#00d4ff]'
                    : 'bg-white/[0.02] border-white/[0.08] text-white/30'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Apply / Clear */}
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="flex-1 py-2 text-[10px] tracking-wider uppercase border border-white/[0.08] text-white/30 hover:text-white/50 transition-all"
            >
              Clear
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 py-2 text-[10px] tracking-wider uppercase border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
