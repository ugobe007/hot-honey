import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';

const StartupDetail: React.FC = () => {
  const { id } = useParams();
  const startups = useStore((state) => state.startups);
  // Ensure both are strings for comparison
  const startup = startups.find((s) => String(s.id) === String(id));

  if (!startup) {
    return <p className="text-red-500 p-6">Startup not found.</p>;
  }

  return (
  <div className="p-6 bg-orange-50 min-h-screen">
      <h2 className="text-3xl font-bold text-orange-600 mb-4">{startup.name}</h2>
      <p className="mb-2"><strong>Value:</strong> {startup.description}</p>
      <p className="mb-2"><strong>Market:</strong> {startup.marketSize}</p>
      <p className="mb-2"><strong>Unique:</strong> {startup.unique}</p>
      <p className="mb-2"><strong>Raise:</strong> {startup.raise}</p>
      {startup.video && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold">🎥 Pitch Video</h3>
          <a className="text-blue-600 underline" href={startup.video} target="_blank" rel="noopener noreferrer">
            Watch now
          </a>
        </div>
      )}
      {/* Add sections for deck, press, technical data here */}
    </div>
  );
};

export default StartupDetail;
