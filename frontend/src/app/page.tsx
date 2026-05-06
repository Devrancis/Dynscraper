"use client";

import { useState, useEffect, useMemo } from "react";

// Typescript interfaces for our data
interface ThreatIntel {
  id: number;
  scan_target: string;
  scraped_at: string; 
  indicator: string;
  reference_url: string;
}

export default function Dashboard() {
// --- Core State Management ---
  const [intel, setIntel] = useState<ThreatIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // --- NEW: Dynamic Target & Status Messaging ---
  const [targetUrl, setTargetUrl] = useState("https://thehackernews.com");
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // --- Search & Filter State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  const fetchIntel = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/intel`);
  
      if (!res.ok) {
        throw new Error(`API failed with status: ${res.status}`);
      }

      const data = await res.json();
  
      if (Array.isArray(data)) {
        setIntel(data);
      } else {
        console.warn("API returned non-array data. Defaulting to empty.");
        setIntel([]); 
      }
  
    setApiOnline(true);
  } catch (error) {
    console.error("API Error:", error);
    setIntel([]);
    setApiOnline(false);
  } finally {
    setLoading(false);
  }

  useEffect(() => {
    fetchIntel();
    const checkApi = async () => {
        try { await fetch(`${process.env.NEXT_PUBLIC_API_URL}`); setApiOnline(true); } 
        catch { setApiOnline(false); }
    };
    checkApi();
  }, []);

  const triggerScrape = async () => {
    if (!targetUrl.startsWith("http")) {
      setStatusMsg({ type: "error", text: "Invalid Target: URL must begin with http:// or https://" });
      return;
    }

    setIsScraping(true);
    setStatusMsg({ type: "info", text: `Establishing stealth connection to ${targetUrl}...` });
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/scrape?url=${encodeURIComponent(targetUrl)}`);
      const result = await res.json();
      
      if (result.status === "success") {
        await fetchIntel(); 
        if (result.total_scraped === 0) {
           setStatusMsg({ type: "warning", text: "Connection successful, but no standard threat indicators (headlines) were found on this domain structure." });
        } else {
           setStatusMsg({ type: "success", text: `Success! Extracted ${result.total_scraped} items. Added ${result.new_threats_added_to_db} NEW entries.` });
        }
      } else {
        setStatusMsg({ type: "error", text: "Scrape failed. Target may be utilizing anti-bot protection." });
      }
    } catch (error) {
      setStatusMsg({ type: "error", text: "Critical Error: Could not reach the Xpectra Backend Engine." });
    } finally {
      setIsScraping(false);
    }
  };

  // --- 3. Dynamic Intel Filtering (useMemo is fast!) ---
  const filteredIntel = useMemo(() => {
    return intel
      .filter((item) => 
        item.indicator.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((item) => 
        filterSource === "all" || item.scan_target.includes(filterSource)
      );
  }, [intel, searchTerm, filterSource]);

  // --- 4. Deriving Stats for Cards ---
  const totalThreats = intel.length;
  const latestScrape = intel.length > 0 
    ? new Date(intel[0].scraped_at).toLocaleDateString() + ' @ ' + new Date(intel[0].scraped_at).toLocaleTimeString()
    : 'Never';

  // Function to format standard datetime to tactical short time
  const formatTacticalTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <main className="min-h-screen bg-slate-950/95 text-slate-300 font-mono text-sm selection:bg-emerald-900 selection:text-emerald-300">
      
      {/* 1. Global Navigation / System Status Header */}
      <nav className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 shadow-2xl backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-black text-emerald-500 tracking-tighter">XPECTRA<span className="text-emerald-300">SCRAPE</span></div>
            <div className="w-[1px] h-5 bg-slate-700"></div>
            <div className="text-slate-500 font-medium">DynamicScraper</div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
            <div className={`w-2.5 h-2.5 rounded-full ${
                apiOnline === true ? "bg-emerald-500 animate-pulse" : apiOnline === false ? "bg-red-500" : "bg-slate-600"
            }`}></div>
            <div className="text-xs text-slate-400">
                {apiOnline === true ? "Database Connection: ACTIVE" : apiOnline === false ? "Connection Lost: ERROR" : "Initializing..."}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* 2. Tactical Operations Center (Overview + Controls) */}
        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-[0_0_60px_-15px_rgba(16,185,129,0.15)] flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-10 items-end justify-between">
            <div className="flex-1 space-y-2 w-full">
              <h1 className="text-4xl font-bold text-white tracking-tight">Threat Intelligence</h1>
              <p className="text-slate-500 mb-4">Input a target domain to extract OSINT indicators.</p>
              
              {/* NEW: Dynamic Input Field */}
              <div className="relative flex items-center w-full max-w-2xl">
                 <span className="absolute left-4 text-slate-500">󰖟</span>
                 <input 
                    type="text" 
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example-news-site.com"
                    className="w-full bg-slate-950 border border-slate-700 text-emerald-400 pl-11 pr-4 py-4 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                 />
              </div>
            </div>
            
            <button 
              onClick={triggerScrape}
              disabled={isScraping || apiOnline === false}
              className={`px-10 py-4 rounded-lg text-lg font-bold group transition-all relative overflow-hidden flex items-center gap-3 shadow-xl whitespace-nowrap h-[58px] ${
                isScraping || apiOnline === false 
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 hover:scale-105 active:scale-95"
              }`}
            >
              {!isScraping && <div className="absolute inset-0 bg-emerald-400 opacity-20 group-hover:opacity-30 blur-xl"></div>}
              <span className={isScraping ? "animate-spin" : ""}>
                  {isScraping ? "󰀕" : "󱕔"}
              </span>
              <span>{isScraping ? "Executing..." : "Ignite Stealth Scrape"}</span>
            </button>
          </div>

          {/* NEW: Status Messaging Terminal */}
          {statusMsg.text && (
            <div className={`p-4 rounded border text-sm flex items-center gap-3 font-semibold ${
              statusMsg.type === "error" ? "bg-red-950/50 border-red-900 text-red-400" :
              statusMsg.type === "warning" ? "bg-amber-950/50 border-amber-900 text-amber-400" :
              statusMsg.type === "success" ? "bg-emerald-950/50 border-emerald-900 text-emerald-400" :
              "bg-slate-800 border-slate-700 text-slate-300 animate-pulse"
            }`}>
              <span>
                {statusMsg.type === "error" ? "󰅙" : statusMsg.type === "warning" ? "󰀪" : statusMsg.type === "success" ? "󰄬" : "󰒋"}
              </span>
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* 3. System Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { title: "Database Integrity", value: `${totalThreats} Indicators`, subtitle: "Total Unique Threats", icon: "󱁊" },
                { title: "Primary Target", value: "Hacker News", subtitle: "Active Scan Target", icon: "󰆂" },
                { title: "Last Operations Cycle", value: formatTacticalTime(latestScrape), subtitle: "Previous Scrape Time", icon: "󱎬" },
                { title: "System Uptime", value: apiOnline ? "STABLE" : "OFFLINE", subtitle: "Core API Status", icon: apiOnline ? "󰒋" : "󰅙", color: apiOnline ? "text-emerald-500" : "text-red-500" },
            ].map((stat, idx) => (
                <div key={idx} className="bg-slate-900 p-6 rounded-lg border border-slate-800 space-y-2 hover:border-emerald-800/50 hover:bg-slate-800/40 transition-all cursor-default shadow-lg">
                    <div className={`text-4xl ${stat.color || "text-emerald-600"}`}>{stat.icon}</div>
                    <div className="text-sm font-semibold text-slate-300">{stat.title}</div>
                    <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{stat.subtitle}</div>
                </div>
            ))}
        </div>

        {/* 4. Live Data Feed Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
                <span className="text-emerald-600 animate-pulse">󰮔</span>
                Incoming Intel Stream 
                <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                    Showing {filteredIntel.length} of {intel.length} entries
                </span>
            </h2>
            
            {/* Dynamic Filters */}
            <div className="flex gap-3 w-full sm:w-auto">
                <input 
                    type="text" 
                    placeholder="[🔍] Search Indicators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow sm:w-64 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition outline-none"
                />
                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition outline-none cursor-pointer"
                >
                    <option value="all">Sources: ALL</option>
                    <option value="thehackernews">Target: HackerNews</option>
                </select>
            </div>
          </div>

          {/* 5. The Advanced Data Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl relative">
            
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-4 text-emerald-500 z-10 p-10 text-center rounded-xl">
                    <span className="text-6xl animate-spin">󰀕</span>
                    <span className="text-lg font-bold animate-pulse text-emerald-300">Initializing Database Ingestion Protocol...</span>
                </div>
            )}

            {!loading && filteredIntel.length === 0 ? (
                <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-4">
                    <span className="text-8xl">󱁊</span>
                    <span className="text-lg">No active intel packets found in the pipeline.</span>
                    <span className="text-sm">Try running a stealth scrape or widening your search criteria.</span>
                </div>
            ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-5 font-medium flex gap-1">󱎬 TIME <span className="text-slate-600">(SCAN)</span></th>
                      <th className="p-5 font-medium">󰀛 THREAT INDICATOR <span className="text-slate-600">(OSINT Article)</span></th>
                      <th className="p-5 font-medium">󰖟 SOURCE LINK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {filteredIntel.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="p-5 text-slate-400 group-hover:text-emerald-300 tabular-nums space-x-2">
                           <span>{new Date(item.scraped_at).toLocaleDateString()}</span>
                           <span className="text-slate-600">|</span>
                           <span>{formatTacticalTime(item.scraped_at)}</span>
                        </td>
                        <td className="p-5 font-semibold text-slate-100 max-w-xl truncate group-hover:text-white">
                          <span className="text-emerald-700 mr-3 group-hover:text-emerald-500">󰮔</span>
                          {item.indicator}
                        </td>
                        <td className="p-5">
                          <a 
                            href={item.reference_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-200 border border-slate-700 hover:border-emerald-800 transition-all text-[11px] font-medium flex items-center gap-1.5 w-fit"
                          >
                            <span>[󰖟 View Intel Packet]</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 text-center text-slate-700 text-xs pb-10">
            System monitored and controlled. Data updates in real-time. Do not disclose findings. 
        </footer>
      </div>
    </main>
  );
}