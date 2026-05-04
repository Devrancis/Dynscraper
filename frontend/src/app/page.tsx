"use client";

import { useState, useEffect } from "react";

export default function Dashboard() {
  const [scrapedData, setScrapedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);

  // Fetch data from your Python API
  const fetchScrapedData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/intel");
      const data = await res.json();
      setScrapedData(data);
    } catch (error) {
      console.error("Failed to fetch database records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchScrapedData();
  }, []);

  // Trigger the Python Scraper Engine
  const triggerScrape = async () => {
    setIsScraping(true);
    try {
      const res = await fetch("http://localhost:8000/api/scrape");
      const result = await res.json();
      
      if (result.status === "success") {
        await fetchScrapedData(); // Refresh the table with new data
        alert(`Scrape complete! 🕷️ Found ${result.total_scraped} items. Added ${result.new_threats_added_to_db} NEW unique records to the database.`);
      } else {
        alert("Scrape failed. Check your Python terminal logs.");
      }
    } catch (error) {
      console.error("Scrape request failed:", error);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-500 tracking-tight">Dynamic Web Scraper</h1>
            <p className="text-slate-500 mt-2 text-sm">Universal Data Extraction & Storage Engine</p>
          </div>
          
          <button 
            onClick={triggerScrape}
            disabled={isScraping}
            className={`px-6 py-3 rounded-md text-sm font-semibold transition-all ${
              isScraping 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            }`}
          >
            {isScraping ? "Executing Scrape..." : "Initiate Scrape Sequence"}
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-10 text-center text-slate-500 animate-pulse">Establishing connection to database...</div>
          ) : scrapedData.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Database is empty. Initiate a scrape to populate records.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold w-48">Timestamp</th>
                    <th className="p-4 font-semibold">Extracted Content</th>
                    <th className="p-4 font-semibold w-32 text-center">Source Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {scrapedData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {new Date(item.scraped_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium text-slate-200">
                        {item.indicator}
                      </td>
                      <td className="p-4 text-center">
                        <a 
                          href={item.reference_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 underline-offset-4"
                        >
                          View Link
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}