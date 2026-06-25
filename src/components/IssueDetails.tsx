import { useState } from "react";
import { Issue, IssueCategory, IssueSeverity } from "../types";
import { CheckCircle, AlertTriangle, MessageSquare, ThumbsUp, Calendar, MapPin, X, Sparkles, ShieldAlert, Copy } from "lucide-react";
import { motion } from "motion/react";
import { getDepartment, generateEscalationDraft } from "../utils/escalation";

interface IssueDetailsProps {
  issue: Issue;
  onConfirm: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
  onClose: () => void;
}

const CATEGORY_META: Record<IssueCategory, { label: string; bg: string; text: string; hex: string }> = {
  pothole: { label: "Pothole Damage", bg: "bg-amber-100 text-amber-900 border-amber-200", text: "text-amber-800", hex: "#F59E0B" },
  streetlight: { label: "Streetlight Malfunction", bg: "bg-violet-100 text-violet-900 border-violet-200", text: "text-violet-800", hex: "#8B5CF6" },
  garbage: { label: "Illegal Dumping / Trash", bg: "bg-red-100 text-red-900 border-red-200", text: "text-red-800", hex: "#EF4444" },
  "water leak": { label: "Water Main Leak", bg: "bg-sky-100 text-sky-900 border-sky-200", text: "text-sky-800", hex: "#0EA5E9" },
  other: { label: "General Civic Damage", bg: "bg-slate-100 text-slate-900 border-slate-200", text: "text-slate-800", hex: "#64748B" }
};

const SEVERITY_META: Record<IssueSeverity, { label: string; bg: string; text: string }> = {
  low: { label: "Low Severity", bg: "bg-slate-100 text-slate-800 border-slate-200", text: "text-slate-600" },
  medium: { label: "Medium Severity", bg: "bg-orange-50 text-orange-800 border-orange-200", text: "text-orange-600" },
  high: { label: "High Urgency", bg: "bg-red-50 text-red-800 border-red-200", text: "text-red-600" }
};

export default function IssueDetails({ issue, onConfirm, onResolve, onClose }: IssueDetailsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const catMeta = CATEGORY_META[issue.category] || CATEGORY_META.other;
  const sevMeta = SEVERITY_META[issue.severity] || SEVERITY_META.medium;

  const handleConfirmClick = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm(issue.id);
      setConfirmSuccess(true);
      setTimeout(() => setConfirmSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to confirm issue:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResolveClick = async () => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      await onResolve(issue.id);
    } catch (err) {
      console.error("Failed to resolve issue:", err);
    } finally {
      setIsResolving(false);
    }
  };

  const formattedDate = new Date(issue.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* High Density Header Section */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Issue Detail</h2>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${issue.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {issue.status === 'resolved' ? "RESOLVED CASE" : "LIVE REPORT"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header Image Frame */}
        <div className="relative aspect-square w-full bg-slate-200 border border-slate-200 rounded-lg overflow-hidden group">
          <img 
            src={issue.photoUrl} 
            alt={issue.category} 
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          
          {/* Absolute Gradients & Header Actions */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
          
          <button 
            onClick={onClose}
            className="absolute top-2 left-2 bg-white/95 text-slate-800 hover:bg-white p-1.5 rounded-full shadow-md hover:scale-105 transition-all duration-200 z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* AI Analysis Active indicator */}
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white flex items-center gap-1">
            <span>AI Analysis Active</span>
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
          </div>

          {/* Location badge over photo */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{issue.area} Zone</span>
            </div>
            
            <div className="text-white text-[10px] font-bold bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded">
              Lat: {issue.latitude}%, Lng: {issue.longitude}%
            </div>
          </div>
        </div>

        {/* Categorical Grid Breakdown Boxes */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Category</div>
            <div className="text-sm font-bold text-blue-700 uppercase tracking-tight">{issue.category}</div>
          </div>
          <div className={`p-2 rounded border text-center ${issue.severity === 'high' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Severity</div>
            <div className={`text-sm font-bold uppercase tracking-tight ${issue.severity === 'high' ? 'text-rose-600' : 'text-slate-600'}`}>
              {issue.severity.toUpperCase()}
            </div>
          </div>
        </div>

        {/* AI Description */}
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase">AI Description</h3>
          <p className="text-xs leading-relaxed text-slate-700 font-medium">
            {issue.description}
          </p>
        </div>

        {/* User note section if available */}
        {issue.userNote && (
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase">
              Reporter Notes
            </h4>
            <blockquote className="text-xs italic text-slate-600 pl-2.5 border-l-2 border-slate-300">
              "{issue.userNote}"
            </blockquote>
          </div>
        )}

        {/* live counter visualization */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Verification Strength</p>
            <p className="text-sm font-extrabold text-slate-800">
              {issue.confirmationCount} Verified
            </p>
          </div>
          <div className="bg-white px-2 py-1 rounded border border-slate-100 flex items-center gap-1 text-[10px] font-bold text-slate-700">
            <ThumbsUp className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            Confirmed Active
          </div>
        </div>

        {/* Escalation Draft Block */}
        {issue.confirmationCount >= 3 && (
          <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>AI Agentic Escalation Draft</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal font-medium">
              This issue has reached 3+ verifications ({issue.confirmationCount} votes). The system has drafted an official escalation letter for the <strong className="text-slate-700">{getDepartment(issue.category)}</strong>:
            </p>
            <div className="bg-white border border-slate-200 p-2 rounded font-mono text-[9px] text-slate-600 max-h-[140px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {generateEscalationDraft(issue)}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateEscalationDraft(issue));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? "Copied Letter!" : "Copy Escalation Letter"}</span>
            </button>
          </div>
        )}

        {/* Interactive action buttons block */}
        <div className="pt-2 flex flex-col gap-2">
          {issue.status === "open" && (
            <>
              {/* Confirm active still button */}
              <button
                disabled={isConfirming}
                onClick={handleConfirmClick}
                className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
              >
                <span>Still an issue</span>
                <span className="bg-blue-700 text-white px-1.5 rounded text-[10px]">
                  {issue.confirmationCount}
                </span>
              </button>

              {/* Mark as resolved button */}
              <button
                disabled={isResolving}
                onClick={handleResolveClick}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-all"
              >
                {isResolving ? "Resolving..." : "Mark as Resolved"}
              </button>
            </>
          )}

          {issue.status === "resolved" && (
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-center flex flex-col items-center gap-1">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-900">This issue is resolved!</p>
                <p className="text-[10px] text-emerald-700 font-medium">Thank you for making our community safer.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reporter metadata at bottom of details view */}
      <div className="p-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
            {issue.area ? issue.area.slice(0, 2).toUpperCase() : "CH"}
          </div>
          <div>
            <div className="text-[10px] font-bold">Reported by Hero #{issue.id.slice(0, 4)}</div>
            <div className="text-[9px] text-slate-400 uppercase font-medium">
              {new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {issue.area} Zone
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
