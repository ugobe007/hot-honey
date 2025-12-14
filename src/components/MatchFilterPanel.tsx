import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

interface MatchFilters {
  stages: string[];
  sectors: string[];
  checkSizeMin: number | null;
  checkSizeMax: number | null;
  geographies: string[];
}

interface MatchFilterPanelProps {
  onFilterChange: (filters: MatchFilters) => void;
  availableStages: string[];
  availableSectors: string[];
  availableGeographies: string[];
}

const MatchFilterPanel: React.FC<MatchFilterPanelProps> = ({
  onFilterChange,
  availableStages,
  availableSectors,
  availableGeographies,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>({
    stages: [],
    sectors: [],
    checkSizeMin: null,
    checkSizeMax: null,
    geographies: [],
  });

  const checkSizeRanges = [
    { label: 'Under $1M', min: 0, max: 1000000 },
    { label: '$1M - $5M', min: 1000000, max: 5000000 },
    { label: '$5M - $10M', min: 5000000, max: 10000000 },
    { label: '$10M - $50M', min: 10000000, max: 50000000 },
    { label: 'Over $50M', min: 50000000, max: null },
  ];

  const toggleStage = (stage: string) => {
    setFilters((prev) => {
      const newStages = prev.stages.includes(stage)
        ? prev.stages.filter((s) => s !== stage)
        : [...prev.stages, stage];
      const newFilters = { ...prev, stages: newStages };
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const toggleSector = (sector: string) => {
    setFilters((prev) => {
      const newSectors = prev.sectors.includes(sector)
        ? prev.sectors.filter((s) => s !== sector)
        : [...prev.sectors, sector];
      const newFilters = { ...prev, sectors: newSectors };
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const toggleGeography = (geography: string) => {
    setFilters((prev) => {
      const newGeographies = prev.geographies.includes(geography)
        ? prev.geographies.filter((g) => g !== geography)
        : [...prev.geographies, geography];
      const newFilters = { ...prev, geographies: newGeographies };
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const setCheckSizeRange = (min: number | null, max: number | null) => {
    setFilters((prev) => {
      const newFilters = { ...prev, checkSizeMin: min, checkSizeMax: max };
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    const emptyFilters: MatchFilters = {
      stages: [],
      sectors: [],
      checkSizeMin: null,
      checkSizeMax: null,
      geographies: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount =
    filters.stages.length +
    filters.sectors.length +
    filters.geographies.length +
    (filters.checkSizeMin !== null || filters.checkSizeMax !== null ? 1 : 0);

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
          isOpen || activeFilterCount > 0
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        <Filter className="w-5 h-5" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-bold">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[600px] bg-gradient-to-br from-gray-900 to-purple-900/60 rounded-2xl p-6 border border-purple-500/30 shadow-2xl z-50 backdrop-blur-md animate-slideDown">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Filter Matches</h3>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors font-semibold"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Stages */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3">Investment Stage</h4>
              <div className="space-y-2">
                {availableStages.map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center gap-2 text-white hover:bg-white/10 p-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.stages.includes(stage)}
                      onChange={() => toggleStage(stage)}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">{stage}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sectors */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3">Sector</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {availableSectors.map((sector) => (
                  <label
                    key={sector}
                    className="flex items-center gap-2 text-white hover:bg-white/10 p-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.sectors.includes(sector)}
                      onChange={() => toggleSector(sector)}
                      className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">{sector}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Check Size */}
          <div className="mt-6">
            <h4 className="text-sm font-bold text-white mb-3">Check Size</h4>
            <div className="grid grid-cols-3 gap-2">
              {checkSizeRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setCheckSizeRange(range.min, range.max)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.checkSizeMin === range.min && filters.checkSizeMax === range.max
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Geographies */}
          <div className="mt-6">
            <h4 className="text-sm font-bold text-white mb-3">Geography</h4>
            <div className="flex flex-wrap gap-2">
              {availableGeographies.map((geography) => (
                <button
                  key={geography}
                  onClick={() => toggleGeography(geography)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.geographies.includes(geography)
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {geography}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MatchFilterPanel;
