export type IssueCategory = 'pothole' | 'streetlight' | 'garbage' | 'water leak' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'resolved';

export interface Issue {
  id: string;
  photoUrl: string;
  latitude: number; // percentage coordinate 0-100 on our custom SVG map grid
  longitude: number; // percentage coordinate 0-100 on our custom SVG map grid
  area: string; // "Civil Lines" | "Model Town" | "Sarabha Nagar" | "Dugri" | "Ferozepur Road"
  category: IssueCategory;
  severity: IssueSeverity;
  description: string; // AI generated description of the civic issue
  userNote?: string; // Optional custom user note
  status: IssueStatus;
  confirmationCount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  categoryBreakdown: Record<IssueCategory, number>;
  areaBreakdown: Record<string, { total: number; open: number; resolved: number }>;
  severityBreakdown: Record<IssueSeverity, number>;
}
