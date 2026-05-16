// src/types/index.ts
// Shared TypeScript types for the entire application

// =============================================================
// ENUMS
// =============================================================

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export type CallType = "INCOMING" | "OUTGOING" | "MISSED";

export type SimSlot = "SIM_1" | "SIM_2" | "UNKNOWN";

export type ImportSource =
  | "CSV"
  | "EXCEL"
  | "ANDROID_BACKUP"
  | "MANUAL"
  | "API"
  | "GOOGLE_DRIVE"
  | "MOBILE_SYNC";

export type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export type NotificationType =
  | "MISSED_CALL"
  | "IMPORT_COMPLETED"
  | "IMPORT_FAILED"
  | "TASK_ASSIGNED"
  | "TASK_DUE_SOON"
  | "MENTION"
  | "COMMENT_ADDED"
  | "USER_INVITED"
  | "INACTIVE_USER";

// =============================================================
// API RESPONSE TYPES
// =============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

// =============================================================
// AUTH
// =============================================================

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface SessionUser extends AuthUser {
  currentOrganizationId: string;
  currentRole: MemberRole;
}

// =============================================================
// ORGANIZATION
// =============================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  user: AuthUser;
}

export interface Invite {
  id: string;
  email: string;
  role: MemberRole;
  token: string;
  organizationId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

// =============================================================
// CALL LOG
// =============================================================

export interface CallLog {
  id: string;
  organizationId: string;
  importedById: string;
  importBatchId: string | null;
  mobileNumber: string;
  contactName: string | null;
  callType: CallType;
  date: Date;
  duration: number;
  simSlot: SimSlot;
  deviceName: string | null;
  recordingLink: string | null;
  isImportant: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Relations
  importedBy?: AuthUser;
  notes?: CallNote[];
  tags?: Tag[];
}

export interface CallLogWithRelations extends CallLog {
  importedBy: AuthUser;
  notes: CallNote[];
  tags: Tag[];
  _count?: {
    notes: number;
    tasks: number;
  };
}

export interface CallNote {
  id: string;
  callLogId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: AuthUser;
}

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  createdAt: Date;
}

// =============================================================
// IMPORT
// =============================================================

export interface ImportBatch {
  id: string;
  organizationId: string;
  importedById: string;
  source: ImportSource;
  status: ImportStatus;
  fileName: string | null;
  fileSize: number | null;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorLog: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  importedBy?: AuthUser;
}

export interface ParsedCallRecord {
  mobileNumber: string;
  contactName?: string;
  callType: CallType;
  date: Date;
  duration: number;
  simSlot?: SimSlot;
  deviceName?: string;
  recordingLink?: string;
  notes?: string;
}

// =============================================================
// TASKS
// =============================================================

export interface FollowUpTask {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
  linkedCallId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Relations
  assignee?: AuthUser | null;
  linkedCall?: CallLog | null;
  comments?: TaskComment[];
  watchers?: AuthUser[];
  attachments?: TaskAttachment[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: AuthUser;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

// =============================================================
// NOTIFICATIONS
// =============================================================

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

// =============================================================
// AUDIT LOG
// =============================================================

export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  timestamp: Date;
  actor?: AuthUser;
}

// =============================================================
// ANALYTICS / DASHBOARD
// =============================================================

export interface DashboardStats {
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  avgDuration: number;
  missedRate: number;
}

export interface CallTrend {
  date: string;
  incoming: number;
  outgoing: number;
  missed: number;
  total: number;
}

export interface HourlyHeatmap {
  hour: number;
  count: number;
  label: string;
}

export interface TopNumber {
  mobileNumber: string;
  contactName: string | null;
  count: number;
  totalDuration: number;
  lastCallDate: Date;
}

export interface TeamMemberStats {
  userId: string;
  userName: string;
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  avgDuration: number;
  activityScore: number;
}

// =============================================================
// FILTERS / SEARCH
// =============================================================

export interface CallLogFilters {
  mobileNumber?: string;
  contactName?: string;
  callType?: CallType | "ALL";
  dateFrom?: string;
  dateTo?: string;
  durationMin?: number;
  durationMax?: number;
  userId?: string;
  tagIds?: string[];
  simSlot?: SimSlot;
  isImportant?: boolean;
  hasNotes?: boolean;
  hasRecording?: boolean;
  search?: string;
  sortBy?: "date" | "duration" | "mobileNumber" | "contactName";
  sortOrder?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

// =============================================================
// REPORTS
// =============================================================

export type ReportType =
  | "DAILY"
  | "EMPLOYEE"
  | "MISSED"
  | "NUMBER_WISE"
  | "DURATION"
  | "PRODUCTIVITY"
  | "TREND"
  | "TEAM"
  | "PEAK_HOUR";

export type ExportFormat = "PDF" | "EXCEL" | "CSV";

export interface ReportConfig {
  type: ReportType;
  dateFrom: string;
  dateTo: string;
  userId?: string;
  callType?: CallType;
  groupBy?: string;
}
