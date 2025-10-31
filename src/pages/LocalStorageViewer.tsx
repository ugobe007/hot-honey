import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LocalStorageViewer() {
  const navigate = useNavigate();
  const [storageData, setStorageData] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    loadStorage();
  }, []);

  const loadStorage = () => {
    const data: { [key: string]: any } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          data[key] = value ? JSON.parse(value) : value;
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    
    setStorageData(data);
  };

  const clearKey = (key: string) => {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
      localStorage.removeItem(key);
      loadStorage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <img src="/images/logo.png" alt="Hot Honey" className="h-16 w-16" />
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                  localStorage Inspector
                </h1>
                <p className="text-xl text-gray-700 mt-2 font-semibold">
                  View all data stored in your browser
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-bold text-lg"
            >
              ← Back
            </button>
          </div>

          {/* Stats */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
            <h2 className="text-3xl font-black mb-3">📊 Storage Stats</h2>
            <p className="text-2xl font-bold">Total Keys: {Object.keys(storageData).length}</p>
          </div>

          {/* Storage Keys */}
          <div className="space-y-4">
            {Object.keys(storageData).length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-2xl font-bold">No data in localStorage</p>
              </div>
            ) : (
              Object.entries(storageData).map(([key, value]) => (
                <div key={key} className="border-4 border-gray-300 rounded-2xl p-6 hover:border-orange-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black text-gray-900 break-all">{key}</h3>
                    <button
                      onClick={() => clearKey(key)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold text-sm whitespace-nowrap ml-4"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto max-h-96 font-mono text-sm">
                    <pre>{JSON.stringify(value, null, 2)}</pre>
                  </div>
                  
                  {Array.isArray(value) && (
                    <p className="mt-3 text-lg font-bold text-orange-600">
                      📦 Array with {value.length} items
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            onClick={loadStorage}
            className="mt-8 w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl font-black text-lg hover:from-orange-700 hover:to-yellow-700 transition-all"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
