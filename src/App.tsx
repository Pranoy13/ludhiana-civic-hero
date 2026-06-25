import { useState, useEffect } from "react";
import { Issue, IssueCategory } from "./types";
import Map from "./components/Map";
import ReportForm from "./components/ReportForm";
import IssueDetails from "./components/IssueDetails";
import Dashboard from "./components/Dashboard";
import { 
  Sparkles, 
  Map as MapIcon, 
  BarChart3, 
  PlusCircle, 
  ShieldCheck, 
  Filter, 
  X, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation & View Tab state
  const [activeTab, setActiveTab] = useState<"map" | "dashboard">("map");

  // Issues Data state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected Issue / Details sidebar state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Reporting State
  const [isReporting, setIsReporting] = useState(false);
  const [tempLocation, setTempLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filters State
  const [filters, setFilters] = useState({
    category: "all",
    severity: "all",
    status: "all",
    area: "all"
  });

  // Fetch all reports on startup
  const fetchReports = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports from database.");
      const data = await res.json();
      setIssues(data);
      
      // Keep selected issue data sync'd if details pane is open
      if (selectedIssue) {
        const updated = data.find((i: Issue) => i.id === selectedIssue.id);
        if (updated) setSelectedIssue(updated);
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || "Could not synchronize with the city reports registry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Set report location
  const handleSetTempLocation = (location: { latitude: number; longitude: number }) => {
    setTempLocation(location);
  };

  // Submit report to server
  const handleReportSubmit = async (reportData: {
    photo: string;
    latitude: number;
    longitude: number;
    userNote: string;
  }) => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(reportData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit report.");
      }

      const newIssue: Issue = await res.json();
      
      // Update local issues state
      setIssues((prev) => [newIssue, ...prev]);
      
      // Select the new report for viewing
      setSelectedIssue(newIssue);
      
      // Reset reporting state
      setIsReporting(false);
      setTempLocation(null);
      
      // Navigate to Map Tab if needed
      setActiveTab("map");
    } catch (err: any) {
      console.error("Failed to submit civic report:", err);
      throw err;
    }
  };

  // Upvote/Confirm active issue status
  const handleConfirmIssue = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}/confirm`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Could not cast verification.");
      const updatedIssue: Issue = await res.json();
      
      // Update local array
      setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
      // Update side panel details
      setSelectedIssue(updatedIssue);
    } catch (err) {
      console.error("Failed to confirm issue status:", err);
    }
  };

  // Mark issue resolved
  const handleResolveIssue = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}/resolve`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Could not apply resolution status.");
      const updatedIssue: Issue = await res.json();
      
      // Update local array
      setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
      // Update side panel details
      setSelectedIssue(updatedIssue);
    } catch (err) {
      console.error("Failed to resolve issue status:", err);
    }
  };

  // Reset filters helper
  const handleResetFilters = () => {
    setFilters({
      category: "all",
      severity: "all",
      status: "all",
      area: "all"
    });
  };

  // Triggering reporting flow
  const handleStartReporting = () => {
    setIsReporting(true);
    setSelectedIssue(null);
    setTempLocation(null);
    setActiveTab("map"); // Switch back to map to place pin
  };

  // Selecting issue from Map
  const handleSelectIssue = (issue: Issue) => {
    setIsReporting(false);
    setSelectedIssue(issue);
    setActiveTab("map"); // Switch back to map to focus
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* 1. Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 rounded-lg shadow-sm text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
                Ludhiana Civic Hero
              </h1>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                Municipal Corporation Ludhiana (MCL) Portal
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => {
                setActiveTab("map");
                setIsReporting(false);
              }}
              className={`flex items-center gap-1.5 py-1 px-3 rounded text-[11px] font-bold transition-all ${
                activeTab === "map"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MapIcon className="w-3 h-3" />
              <span>Map</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedIssue(null);
                setIsReporting(false);
              }}
              className={`flex items-center gap-1.5 py-1 px-3 rounded text-[11px] font-bold transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* Action Trigger button */}
          <button
            onClick={handleStartReporting}
            disabled={isReporting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 sm:px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report New Issue</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Sync status overlay or API error alerts */}
        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start justify-between gap-3 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold">Database Sync Warning</p>
                <p className="text-xs text-red-600 mt-1">{fetchError}</p>
              </div>
            </div>
            <button 
              onClick={fetchReports}
              className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry Sync
            </button>
          </div>
        )}

        {/* Tab Router Switcher */}
        <AnimatePresence mode="wait">
          {activeTab === "map" ? (
            <motion.div
              key="map-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Filter Ribbons Ribbon (Only shown in Map tab) */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded border border-slate-150">
                    <Filter className="w-3 h-3" />
                    <span>Filter Pins</span>
                  </div>

                  {/* Category Filter */}
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="pothole">Potholes</option>
                    <option value="streetlight">Streetlights</option>
                    <option value="garbage">Garbage Pile</option>
                    <option value="water leak">Water Leaks</option>
                    <option value="other">Other Matters</option>
                  </select>

                  {/* Urgency/Severity Filter */}
                  <select
                    value={filters.severity}
                    onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Urgencies</option>
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="high">High Severity</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open Cases</option>
                    <option value="resolved">Resolved Cases</option>
                  </select>

                  {/* District Area Filter */}
                  <select
                    value={filters.area}
                    onChange={(e) => setFilters((prev) => ({ ...prev, area: e.target.value }))}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold py-1 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Zones/Areas</option>
                    <option value="Civil Lines">Civil Lines</option>
                    <option value="Model Town">Model Town</option>
                    <option value="Sarabha Nagar">Sarabha Nagar</option>
                    <option value="Dugri">Dugri</option>
                    <option value="Ferozepur Road">Ferozepur Road</option>
                  </select>
                </div>

                {/* Reset Filters Option if any active */}
                {(filters.category !== "all" || filters.severity !== "all" || filters.status !== "all" || filters.area !== "all") && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1 transition-colors self-end md:self-auto"
                  >
                    <X className="w-3 h-3" /> Clear Filters
                  </button>
                )}
              </div>

              {/* Map grid split pane */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                
                {/* SVG Vector Map Canvas on Left */}
                <div className="lg:col-span-2">
                  <Map
                    issues={issues}
                    selectedIssueId={selectedIssue?.id || null}
                    onSelectIssue={handleSelectIssue}
                    isSelectingLocation={isReporting}
                    tempLocation={tempLocation}
                    onSetTempLocation={handleSetTempLocation}
                    activeFilters={filters}
                  />
                </div>

                {/* Sidebar Context Panel on Right */}
                <div className="h-full">
                  <AnimatePresence mode="wait">
                    {/* CASE 1: In Reporting Flow */}
                    {isReporting && (
                      <motion.div
                        key="reporting-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ReportForm
                          tempLocation={tempLocation}
                          onSubmitReport={handleReportSubmit}
                          onCancel={() => {
                            setIsReporting(false);
                            setTempLocation(null);
                          }}
                        />
                      </motion.div>
                    )}

                    {/* CASE 2: Inspection details sidebar */}
                    {!isReporting && selectedIssue && (
                      <motion.div
                        key="issue-details"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <IssueDetails
                          issue={selectedIssue}
                          onConfirm={handleConfirmIssue}
                          onResolve={handleResolveIssue}
                          onClose={() => setSelectedIssue(null)}
                        />
                      </motion.div>
                    )}

                    {/* CASE 3: Default Instruction Callout sidebar */}
                    {!isReporting && !selectedIssue && (
                      <motion.div
                        key="default-sidebar"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]"
                      >
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 mb-3 animate-bounce">
                          <MapIcon className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800">No Pin Selected</h3>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-1.5 mb-4 leading-relaxed">
                          Click on any colored pin on the map to inspect AI assessments, verify details, and resolve reported issues.
                        </p>
                        
                        <div className="w-full h-[1px] bg-slate-100 my-3" />

                        <button
                          onClick={handleStartReporting}
                          className="w-full bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <PlusCircle className="w-4 h-4 text-emerald-400" /> Report an Incident here
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </motion.div>
          ) : (
            // City Analytics Dashboard Tab
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard 
                issues={issues} 
                onSelectIssue={handleSelectIssue}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Modern Compact Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Community Hero © 2026. Empowering neighborhood self-maintenance.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-500 font-bold uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Powered by Gemini-3.5-Flash</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
