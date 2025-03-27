'use client';

import { useState, useEffect } from 'react';

export default function TestTopPicks() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get the current host from the window location
        const host = window.location.origin;
        const apiUrl = `${host}/api/top-picks`;
        
        console.log(`Fetching from: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Test Top Picks API</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 p-4 rounded mb-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {data && (
        <div>
          <h2 className="text-2xl font-bold mb-4">API Response</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
          
          {data.topPicks && data.topPicks.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-4">Found {data.topPicks.length} Top Picks</h2>
              <ul className="space-y-4">
                {data.topPicks.map((pick: any) => (
                  <li key={pick.id} className="border p-4 rounded">
                    <h3 className="text-xl font-bold">{pick.machine_name}</h3>
                    <p>{pick.excerpt_short || 'No description available'}</p>
                    <p className="font-bold mt-2">
                      {pick.price ? `$${Number(pick.price).toLocaleString()}` : 'Price N/A'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-6">No top picks found.</p>
          )}
        </div>
      )}
    </div>
  );
} 