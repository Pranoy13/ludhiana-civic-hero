import { Issue, IssueCategory } from "../types";

export interface DistrictCluster {
  area: string;
  openIssuesCount: number;
  issues: Issue[];
  summary: string;
}

export function getDepartment(category: IssueCategory): string {
  switch (category) {
    case "pothole":
    case "streetlight":
      return "Public Works Department";
    case "garbage":
      return "Sanitation & Waste Management";
    case "water leak":
      return "Water Authority & Environmental Services";
    default:
      return "Municipal Services Bureau";
  }
}

export function generateEscalationDraft(issue: Issue): string {
  const dept = getDepartment(issue.category);
  const dateStr = new Date(issue.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  return `TO: Municipal Corporation Ludhiana (MCL) — ${dept}
FROM: Ludhiana Civic Hero Registry (Automated Escalation System)
DATE: ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
SUBJECT: URGENT ESCALATION: Verified Civic Issue #${issue.id.slice(0, 8).toUpperCase()} (${issue.category.toUpperCase()})

Dear Commissioner / Joint Commissioner of MCL — ${dept},

This is an automated civic escalation dispatched on behalf of the residents of Ludhiana, Punjab. An active, community-verified issue has reached critical status in the ${issue.area} area of Ludhiana and requires immediate municipal attention.

ISSUE SPECIFICATIONS:
- Case Reference ID: #${issue.id}
- Civic Category: ${issue.category.toUpperCase()}
- Location: ${issue.area}, Ludhiana (Map coordinates: Lat ${issue.latitude}%, Lng ${issue.longitude}%)
- Original Assessment Date: ${dateStr}
- Community Verifications: ${issue.confirmationCount} active confirmation votes
- Initial AI Diagnostic: "${issue.description}"
${issue.userNote ? `- Resident Witness Note: "${issue.userNote}"` : ""}

URGENCY EVALUATION:
Due to receiving ${issue.confirmationCount} independent resident verifications, this report has been automatically elevated to HIGH-PRIORITY status under MCL jurisdiction. Issues of this nature in a major commercial city like Ludhiana pose risk to local traffic, public safety, and neighborhood infrastructure.

ACTION REQUESTED:
Please dispatch a Municipal Corporation Ludhiana service team to the specified coordinates in ${issue.area} to perform an on-site inspection, clear any safety hazards, and initiate resolution.

Sincerely,
Ludhiana Civic Escalation Bot
[Report Link: https://ludhiana.community-hero.in/reports/${issue.id}]`;
}

export function detectClusters(issues: Issue[]): DistrictCluster[] {
  const openIssues = issues.filter((i) => i.status === "open");
  const groups: Record<string, Issue[]> = {};
  
  openIssues.forEach((issue) => {
    if (!groups[issue.area]) {
      groups[issue.area] = [];
    }
    groups[issue.area].push(issue);
  });
  
  const clusters: DistrictCluster[] = [];
  Object.entries(groups).forEach(([area, areaIssues]) => {
    if (areaIssues.length >= 3) {
      // Group categories to explain why
      const catCounts: Record<string, number> = {};
      areaIssues.forEach((i) => {
        catCounts[i.category] = (catCounts[i.category] || 0) + 1;
      });
      
      const catSummary = Object.entries(catCounts)
        .map(([cat, count]) => `${count} ${cat}${count > 1 ? "s" : ""}`)
        .join(" and ");
        
      const summary = `${areaIssues.length} active reports (${catSummary}) in ${area} suggest a recurring civic issue pattern requiring urgent infrastructure review.`;
      
      clusters.push({
        area,
        openIssuesCount: areaIssues.length,
        issues: areaIssues,
        summary,
      });
    }
  });
  
  return clusters;
}
