import { useMemo, useState } from "react";
import { Issue, IssueCategory } from "../types";
import { ClipboardList, ShieldAlert, CheckCircle, TrendingUp, Sparkles, MapPin, AlertCircle, RefreshCw, AlertTriangle, Copy } from "lucide-react";
import { motion } from "motion/react";
import { detectClusters, getDepartment, generateEscalationDraft } from "../utils/escalation";

interface DashboardProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  pothole: "Potholes & Roads",
  streetlight: "Streetlights & Electricity",
  garbage: "Illegal Garbage / Waste",
  "water leak": "Water Leaks / Pipes",
  other: "Other Civic Matters"
};

const CATEGORY_COLORS: Record<IssueCategory, { bar: string; text: string; bg: string }> = {
  pothole: { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  streetlight: { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  garbage: { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  "water leak": { bar: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  other: { bar: "bg-slate-500", text: "text-slate-700", bg: "bg-slate-50" }
};

export default function Dashboard({ issues, onSelectIssue }: DashboardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeClusters = useMemo(() => {
    return detectClusters(issues);
  }, [issues]);

  const escalationReadyIssues = useMemo(() => {
    return issues.filter((i) => i.status === "open" && i.confirmationCount >= 3);
  }, [issues]);

  // Compute Stats from array
  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    const open = total - resolved;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Categories breakdown
    const categoryBreakdown: Record<IssueCategory, number> = {
      pothole: 0,
      streetlight: 0,
      garbage: 0,
      "water leak": 0,
      other: 0
    };

    // Area breakdown
    const areaBreakdown: Record<string, { total: number; open: number; resolved: number }> = {
      "Civil Lines": { total: 0, open: 0, resolved: 0 },
      "Model Town": { total: 0, open: 0, resolved: 0 },
      "Sarabha Nagar": { total: 0, open: 0, resolved: 0 },
      Dugri: { total: 0, open: 0, resolved: 0 },
      "Ferozepur Road": { total: 0, open: 0, resolved: 0 }
    };

    issues.forEach((issue) => {
      // Category count
      if (categoryBreakdown[issue.category] !== undefined) {
        categoryBreakdown[issue.category]++;
      } else {
        categoryBreakdown.other++;
      }

      // Area count
      const area = issue.area || "Model Town";
      if (!areaBreakdown[area]) {
        areaBreakdown[area] = { total: 0, open: 0, resolved: 0 };
      }
      areaBreakdown[area].total++;
      if (issue.status === "resolved") {
        areaBreakdown[area].resolved++;
      } else {
        areaBreakdown[area].open++;
      }
    });

    return {
      total,
      open,
      resolved,
      rate,
      categoryBreakdown,
      areaBreakdown
    };
  }, [issues]);

  // Order districts by report frequency
  const sortedDistricts = useMemo(() => {
    return (Object.entries(stats.areaBreakdown) as [string, { total: number; open: number; resolved: number }][]).sort((a, b) => b[1].total - a[1].total);
  }, [stats.areaBreakdown]);

  // Order issues for "recent reports"
  const recentReports = useMemo(() => {
    return [...issues]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [issues]);

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Card */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center shadow-sm">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total Reported</p>
          <p className="text-3xl font-extrabold text-blue-700 mt-1">{stats.total}</p>
          <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">Submitted Cases</p>
        </div>

        {/* Open Card */}
        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 text-center shadow-sm">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Open Incidents</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">{stats.open}</p>
          <p className="text-[9px] text-rose-400 font-bold uppercase mt-1">Awaiting Crews</p>
        </div>

        {/* Resolved Card */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Resolved Cases</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1">{stats.resolved}</p>
          <p className="text-[9px] text-emerald-400 font-bold uppercase mt-1">Completed Fixes</p>
        </div>

        {/* Resolution Rate Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolution Rate</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.rate}%</p>
          <div className="w-16 bg-slate-200 h-1 rounded-full overflow-hidden mx-auto mt-2.5">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>

      </div>

      {/* 2. Visual breakdowns section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Breakdown list */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <ClipboardList className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorical Breakdown</h3>
            </div>

            <div className="space-y-4">
              {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((cat) => {
                const count = stats.categoryBreakdown[cat] || 0;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-slate-500 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-2 rounded-full ${colors.bar}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>AI vision models sync category mapping</span>
          </div>
        </div>

        {/* Area/District comparative progress chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zone/Area Civic Performance</h3>
          </div>

          <div className="space-y-3">
            {sortedDistricts.map(([district, data]) => {
              const totalPct = stats.total > 0 ? (data.total / stats.total) * 100 : 0;
              const resolvePct = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;

              return (
                <div key={district} className="p-2.5 hover:bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-slate-100 text-slate-600 rounded shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{district}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        {data.total} {data.total === 1 ? "report" : "reports"} total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:text-right">
                    <div className="space-y-0.5">
                      <div className="flex sm:justify-end text-[9px] text-slate-400 font-semibold gap-1.5">
                        <span className="text-emerald-600 font-bold">{data.resolved} Fixed</span>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">{data.open} Open</span>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${resolvePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{resolvePct}% Clear</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. AI Tactical Insights */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Tactical Insights</h3>
              <p className="text-[10px] text-slate-400 font-medium">Realtime automated escalation & cluster analysis</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Agentic Core Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Priority Areas */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
              <span>High Priority Area Clusters</span>
            </h4>
            
            {activeClusters.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-lg text-center text-xs text-slate-400 font-medium">
                No active critical density clusters detected. Zone conditions stable.
              </div>
            ) : (
              <div className="space-y-3">
                {activeClusters.map((cluster) => (
                  <div key={cluster.area} className="bg-slate-950/60 border border-rose-950/40 p-3 rounded-lg flex items-start gap-3">
                    <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 mt-0.5 font-bold text-xs shrink-0">
                      {cluster.openIssuesCount}x
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wide">{cluster.area} Zone</h5>
                      <p className="text-[11px] text-slate-300 leading-normal font-medium mt-1">
                        {cluster.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Escalations */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
              <span>Escalations Ready to Send</span>
            </h4>

            {escalationReadyIssues.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-lg text-center text-xs text-slate-400 font-medium">
                No issues with 3+ votes yet. Verify open cases to trigger automated escalation.
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {escalationReadyIssues.map((issue) => {
                  const isCopied = copiedId === issue.id;
                  const dept = getDepartment(issue.category);
                  return (
                    <div key={issue.id} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-slate-400">{issue.category} • {issue.area}</span>
                          <h5 className="text-[11px] font-bold text-slate-200 mt-0.5 line-clamp-1">{issue.description}</h5>
                        </div>
                        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                          {issue.confirmationCount} votes
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
                        Department: <strong className="text-slate-300 font-semibold">{dept}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectIssue(issue)}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded border border-slate-700"
                        >
                          View Detail
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generateEscalationDraft(issue));
                            setCopiedId(issue.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="flex-1 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase tracking-wider rounded flex items-center justify-center gap-1"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{isCopied ? "Copied Letter!" : "Copy Letter"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Activity Log */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Community Reports</h3>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
            Realtime activity feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Incident</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Urgency</th>
                <th className="pb-3">Verification</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((issue) => {
                const colors = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.other;
                const formattedDate = new Date(issue.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                });

                return (
                  <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 pl-2 flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                        <img 
                          src={issue.photoUrl} 
                          alt={issue.category} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border`}>
                          {issue.category}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 mt-1 max-w-[240px] truncate">
                          {issue.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 text-xs font-semibold text-slate-600">
                      {issue.area} District
                    </td>
                    <td className="py-4">
                      {issue.severity === "high" ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          High
                        </span>
                      ) : issue.severity === "medium" ? (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Medium
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Low
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <CheckCircle className={`w-3.5 h-3.5 ${issue.status === "resolved" ? "text-emerald-500" : "text-slate-300"}`} />
                        <span>{issue.confirmationCount} votes</span>
                      </div>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={() => onSelectIssue(issue)}
                        className="text-xs font-semibold text-slate-900 bg-slate-50 hover:bg-slate-100 py-1 px-3 rounded-lg border border-slate-200 shadow-sm transition-colors opacity-80 group-hover:opacity-100"
                      >
                        Inspect Pin
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
