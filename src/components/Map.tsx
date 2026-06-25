import React, { useMemo, useState } from "react";
import { Issue, IssueCategory } from "../types";
import { AlertCircle, CheckCircle, MapPin, Eye, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { detectClusters } from "../utils/escalation";

interface MapProps {
  issues: Issue[];
  selectedIssueId: string | null;
  onSelectIssue: (issue: Issue) => void;
  isSelectingLocation?: boolean;
  tempLocation: { latitude: number; longitude: number } | null;
  onSetTempLocation: (location: { latitude: number; longitude: number }) => void;
  activeFilters: {
    category: string;
    severity: string;
    status: string;
    area: string;
  };
}

const CATEGORY_COLORS: Record<IssueCategory, { bg: string; text: string; hex: string }> = {
  pothole: { bg: "bg-amber-100", text: "text-amber-800", hex: "#F59E0B" },
  streetlight: { bg: "bg-violet-100", text: "text-violet-800", hex: "#8B5CF6" },
  garbage: { bg: "bg-red-100", text: "text-red-800", hex: "#EF4444" },
  "water leak": { bg: "bg-sky-100", text: "text-sky-800", hex: "#0EA5E9" },
  other: { bg: "bg-slate-100", text: "text-slate-800", hex: "#64748B" }
};

export default function Map({
  issues,
  selectedIssueId,
  onSelectIssue,
  isSelectingLocation = false,
  tempLocation,
  onSetTempLocation,
  activeFilters
}: MapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Auto-detect clusters and high-priority districts
  const activeClusters = useMemo(() => detectClusters(issues), [issues]);
  const highPriorityDistricts = useMemo(() => {
    return new Set(activeClusters.map((c) => c.area));
  }, [activeClusters]);

  // Filter issues locally based on parent filters to display on map
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (activeFilters.category !== "all" && issue.category !== activeFilters.category) return false;
      if (activeFilters.severity !== "all" && issue.severity !== activeFilters.severity) return false;
      if (activeFilters.status !== "all" && issue.status !== activeFilters.status) return false;
      if (activeFilters.area !== "all" && issue.area !== activeFilters.area) return false;
      return true;
    });
  }, [issues, activeFilters]);

  // Handle clicking on map canvas to set temp report location
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage coordinates (0-100)
    const longitude = Math.round((x / rect.width) * 100);
    const latitude = Math.round((y / rect.height) * 100);

    onSetTempLocation({ latitude, longitude });
  };

  // Neighborhood helper
  const getNeighborhoodName = (y: number, x: number) => {
    if (y < 35) return "Civil Lines";
    if (y > 65) return "Dugri";
    if (x < 35) return "Ferozepur Road";
    if (x > 65) return "Sarabha Nagar";
    return "Model Town";
  };

  // Render SVG Map overlay backgrounds, roads, parks
  return (
    <div className="relative w-full h-[500px] md:h-[580px] bg-[#e2e8f0] border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Map Header Instructions */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold text-slate-800 border border-slate-200 pointer-events-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {isSelectingLocation ? (
            <span className="text-emerald-700 font-bold">Click map to pin issue location</span>
          ) : (
            <span>Interactive Vector Grid — Ludhiana, Punjab</span>
          )}
        </div>

        {hoveredDistrict && !isSelectingLocation && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 text-white backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold"
          >
            District: {hoveredDistrict}
          </motion.div>
        )}
      </div>

      {/* Main Interactive Map Stage */}
      <div 
        id="map-canvas-container"
        onClick={handleMapClick}
        className={`relative flex-1 w-full h-full overflow-hidden select-none transition-all duration-300 ${
          isSelectingLocation ? "cursor-crosshair hover:bg-emerald-50/20" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        {/* High Density Radial Dot Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none z-[1]" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }} />

        {/* Decorative Map Grid SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* District Highlights */}
          {/* Civil Lines (Y: 0-35) */}
          <rect 
            x="0" y="0" width="100%" height="35%" 
            fill={highPriorityDistricts.has("Civil Lines")
              ? "rgba(239, 68, 68, 0.08)"
              : (hoveredDistrict === "Civil Lines" ? "rgba(148, 163, 184, 0.08)" : "rgba(148, 163, 184, 0.01)")} 
            stroke={highPriorityDistricts.has("Civil Lines") ? "rgba(239, 68, 68, 0.25)" : "none"}
            strokeWidth={highPriorityDistricts.has("Civil Lines") ? "2" : "0"}
            className="transition-all duration-300"
          />
          {/* Ferozepur Road (X: 0-35, Y: 35-65) */}
          <rect 
            x="0" y="35%" width="35%" height="30%" 
            fill={highPriorityDistricts.has("Ferozepur Road")
              ? "rgba(239, 68, 68, 0.08)"
              : (hoveredDistrict === "Ferozepur Road" ? "rgba(251, 146, 60, 0.06)" : "rgba(251, 146, 60, 0.01)")} 
            stroke={highPriorityDistricts.has("Ferozepur Road") ? "rgba(239, 68, 68, 0.25)" : "none"}
            strokeWidth={highPriorityDistricts.has("Ferozepur Road") ? "2" : "0"}
            className="transition-all duration-300"
          />
          {/* Model Town (X: 35-65, Y: 35-65) */}
          <rect 
            x="35%" y="35%" width="30%" height="30%" 
            fill={highPriorityDistricts.has("Model Town")
              ? "rgba(239, 68, 68, 0.08)"
              : (hoveredDistrict === "Model Town" ? "rgba(59, 130, 246, 0.06)" : "rgba(59, 130, 246, 0.01)")} 
            stroke={highPriorityDistricts.has("Model Town") ? "rgba(239, 68, 68, 0.25)" : "none"}
            strokeWidth={highPriorityDistricts.has("Model Town") ? "2" : "0"}
            className="transition-all duration-300"
          />
          {/* Sarabha Nagar (X: 65-100, Y: 35-100) */}
          <rect 
            x="65%" y="35%" width="35%" height="65%" 
            fill={highPriorityDistricts.has("Sarabha Nagar")
              ? "rgba(239, 68, 68, 0.08)"
              : (hoveredDistrict === "Sarabha Nagar" ? "rgba(14, 165, 233, 0.08)" : "rgba(14, 165, 233, 0.01)")} 
            stroke={highPriorityDistricts.has("Sarabha Nagar") ? "rgba(239, 68, 68, 0.25)" : "none"}
            strokeWidth={highPriorityDistricts.has("Sarabha Nagar") ? "2" : "0"}
            className="transition-all duration-300"
          />
          {/* Dugri (X: 0-65, Y: 65-100) */}
          <rect 
            x="0" y="65%" width="65%" height="35%" 
            fill={highPriorityDistricts.has("Dugri")
              ? "rgba(239, 68, 68, 0.08)"
              : (hoveredDistrict === "Dugri" ? "rgba(34, 197, 94, 0.07)" : "rgba(34, 197, 94, 0.01)")} 
            stroke={highPriorityDistricts.has("Dugri") ? "rgba(239, 68, 68, 0.25)" : "none"}
            strokeWidth={highPriorityDistricts.has("Dugri") ? "2" : "0"}
            className="transition-all duration-300"
          />

          {/* District Boundary Lines */}
          <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="0" y1="65%" x2="65%" y2="65%" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="35%" y1="35%" x2="35%" y2="65%" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="65%" y1="35%" x2="65%" y2="100%" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Natural Landmarks: River */}
          <path 
            d="M -20,200 Q 150,180 250,220 T 450,450 T 800,480" 
            fill="none" 
            stroke="#93C5FD" 
            strokeWidth="16" 
            strokeLinecap="round" 
            opacity="0.65" 
          />
          <path 
            d="M -20,200 Q 150,180 250,220 T 450,450 T 800,480" 
            fill="none" 
            stroke="#60A5FA" 
            strokeWidth="8" 
            strokeLinecap="round" 
            opacity="0.8" 
          />

          {/* Grand Lake on East Boundary */}
          <path 
            d="M 800,200 Q 750,250 720,350 T 850,550 L 1200,550 L 1200,200 Z" 
            fill="#DBEAFE" 
            stroke="#3B82F6" 
            strokeWidth="3" 
            opacity="0.7" 
          />

          {/* Forest Park in Dugri */}
          <circle cx="150" cy="460" r="45" fill="#DCFCE7" stroke="#86EFAC" strokeWidth="2" opacity="0.8" />
          <text x="150" y="464" textAnchor="middle" fill="#15803D" fontSize="10" fontWeight="bold" opacity="0.6">Leisure Valley</text>

          {/* Sector Text Labels */}
          <text x="50%" y="18%" textAnchor="middle" fill={highPriorityDistricts.has("Civil Lines") ? "#E11D48" : "#475569"} fontSize="11" fontWeight="bold" letterSpacing="2" opacity={highPriorityDistricts.has("Civil Lines") ? "0.9" : "0.45"} className="uppercase font-sans">
            {highPriorityDistricts.has("Civil Lines") ? "⚠️ Civil Lines (High Priority)" : "Civil Lines"}
          </text>
          <text x="50%" y="50%" textAnchor="middle" fill={highPriorityDistricts.has("Model Town") ? "#E11D48" : "#1E3A8A"} fontSize="12" fontWeight="bold" letterSpacing="2" opacity={highPriorityDistricts.has("Model Town") ? "0.9" : "0.5"} className="uppercase font-sans">
            {highPriorityDistricts.has("Model Town") ? "⚠️ Model Town (High Priority)" : "Model Town"}
          </text>
          <text x="18%" y="50%" textAnchor="middle" fill={highPriorityDistricts.has("Ferozepur Road") ? "#E11D48" : "#7C2D12"} fontSize="11" fontWeight="bold" letterSpacing="2" opacity={highPriorityDistricts.has("Ferozepur Road") ? "0.9" : "0.45"} className="uppercase font-sans">
            {highPriorityDistricts.has("Ferozepur Road") ? "⚠️ Ferozepur Rd (High Priority)" : "Ferozepur Road"}
          </text>
          <text x="32%" y="85%" textAnchor="middle" fill={highPriorityDistricts.has("Dugri") ? "#E11D48" : "#065F46"} fontSize="11" fontWeight="bold" letterSpacing="2" opacity={highPriorityDistricts.has("Dugri") ? "0.9" : "0.45"} className="uppercase font-sans">
            {highPriorityDistricts.has("Dugri") ? "⚠️ Dugri (High Priority)" : "Dugri Zone"}
          </text>
          <text x="82%" y="65%" textAnchor="middle" fill={highPriorityDistricts.has("Sarabha Nagar") ? "#E11D48" : "#0369A1"} fontSize="11" fontWeight="bold" letterSpacing="2" opacity={highPriorityDistricts.has("Sarabha Nagar") ? "0.9" : "0.45"} className="uppercase font-sans">
            {highPriorityDistricts.has("Sarabha Nagar") ? "⚠️ Sarabha Nagar (High Priority)" : "Sarabha Nagar"}
          </text>

          {/* Road Network Overlays (Stylized) */}
          <path d="M 0,100 L 1200,100 M 0,280 L 1200,280 M 0,480 L 1200,480" stroke="#F1F5F9" strokeWidth="5" opacity="0.75" />
          <path d="M 180,0 L 180,1200 M 480,0 L 480,1200 M 780,0 L 780,1200" stroke="#F1F5F9" strokeWidth="5" opacity="0.75" />
        </svg>

        {/* Hover detection grids (invisible but clickable areas to show name) */}
        <div 
          className="absolute top-0 left-0 w-full h-[35%] z-[1]"
          onMouseEnter={() => setHoveredDistrict("Civil Lines")}
          onMouseLeave={() => setHoveredDistrict(null)}
        />
        <div 
          className="absolute top-[35%] left-0 w-[35%] h-[30%] z-[1]"
          onMouseEnter={() => setHoveredDistrict("Ferozepur Road")}
          onMouseLeave={() => setHoveredDistrict(null)}
        />
        <div 
          className="absolute top-[35%] left-[35%] w-[30%] h-[30%] z-[1]"
          onMouseEnter={() => setHoveredDistrict("Model Town")}
          onMouseLeave={() => setHoveredDistrict(null)}
        />
        <div 
          className="absolute top-[35%] left-[65%] w-[35%] h-[65%] z-[1]"
          onMouseEnter={() => setHoveredDistrict("Sarabha Nagar")}
          onMouseLeave={() => setHoveredDistrict(null)}
        />
        <div 
          className="absolute top-[65%] left-0 w-[65%] h-[35%] z-[1]"
          onMouseEnter={() => setHoveredDistrict("Dugri")}
          onMouseLeave={() => setHoveredDistrict(null)}
        />

        {/* Existing Report Pins */}
        {!isSelectingLocation && filteredIssues.map((issue) => {
          const isSelected = selectedIssueId === issue.id;
          const colorMeta = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.other;
          
          return (
            <motion.button
              key={issue.id}
              id={`map-pin-${issue.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectIssue(issue);
              }}
              style={{
                top: `${issue.latitude}%`,
                left: `${issue.longitude}%`
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 p-1 rounded-full group focus:outline-none"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Outer pulsing circle for High Severity Open issues */}
              {issue.status === "open" && issue.severity === "high" && (
                <span 
                  style={{ backgroundColor: colorMeta.hex }}
                  className="absolute inset-0 rounded-full animate-ping opacity-45"
                />
              )}

              {/* Pin design */}
              <div 
                className={`relative flex items-center justify-center w-8 h-8 rounded-full shadow-md border-2 transition-all duration-200 ${
                  isSelected 
                    ? "bg-slate-900 border-white text-white scale-110 z-20" 
                    : issue.status === "resolved"
                    ? "bg-emerald-500 border-white text-white"
                    : `bg-white border-[3px] text-slate-800`
                }`}
                style={issue.status !== "resolved" && !isSelected ? { borderColor: colorMeta.hex } : undefined}
              >
                {issue.status === "resolved" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <MapPin 
                    className="w-4 h-4" 
                    style={!isSelected ? { color: colorMeta.hex } : undefined} 
                  />
                )}

                {/* Micro tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap font-medium shadow-sm z-30 pointer-events-none">
                  {issue.category.toUpperCase()} • {issue.severity.toUpperCase()}
                </span>
              </div>
            </motion.button>
          );
        })}

        {/* Temporary location pin (during reporting) */}
        <AnimatePresence>
          {isSelectingLocation && tempLocation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                top: `${tempLocation.latitude}%`,
                left: `${tempLocation.longitude}%`
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50 w-12 h-12 -left-3 -top-3" />
              <div className="bg-emerald-600 text-white w-9 h-9 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                <MapPin className="w-5 h-5 animate-bounce" />
              </div>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-emerald-900 text-white text-[10px] py-0.5 px-2 rounded-full whitespace-nowrap font-bold shadow-md">
                {getNeighborhoodName(tempLocation.latitude, tempLocation.longitude).toUpperCase()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating High Priority Areas Panel */}
        {activeClusters.length > 0 && (
          <div className="absolute top-16 right-4 max-w-[280px] bg-white/95 backdrop-blur p-3 rounded-lg border border-rose-200 shadow-md z-20 flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 fill-rose-100" />
              <span>High Priority Areas ({activeClusters.length})</span>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {activeClusters.map((cluster) => (
                <div key={cluster.area} className="text-[10px] leading-normal border-l-2 border-rose-500 pl-2">
                  <div className="font-bold text-slate-800 uppercase text-[9px] tracking-wide">{cluster.area} District</div>
                  <div className="text-slate-500 font-medium mt-0.5">{cluster.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="bg-white border-t border-slate-100 p-3 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-bold uppercase tracking-tighter text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Pothole</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span>Streetlight</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Garbage Pile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Water Leak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span>Other</span>
        </div>
        <div className="border-l border-slate-200 h-3 mx-1 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span>Resolved</span>
        </div>
      </div>
    </div>
  );
}
