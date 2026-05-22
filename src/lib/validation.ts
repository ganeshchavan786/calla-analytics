// src/lib/validation.ts
// Zod validation schemas — single source of truth for all input shapes

import { z } from "zod";

// =============================================================
// AUTH SCHEMAS
// =============================================================

export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100)
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// =============================================================
// ORGANIZATION SCHEMAS
// =============================================================

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  timezone: z.string().optional().default("UTC"),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).default("MEMBER"),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
});

// =============================================================
// CALL LOG SCHEMAS
// =============================================================

export const CreateCallLogSchema = z.object({
  mobileNumber: z
    .string()
    .min(7, "Mobile number must be at least 7 digits")
    .max(20)
    .regex(/^[+\d\s\-()]+$/, "Invalid phone number format"),
  contactName: z.string().max(200).optional().nullable(),
  callType: z.enum(["INCOMING", "OUTGOING", "MISSED", "REJECTED"]),
  date: z.string().datetime(),
  duration: z.number().int().min(0).default(0),
  simSlot: z.enum(["SIM_1", "SIM_2", "UNKNOWN"]).default("UNKNOWN"),
  deviceName: z.string().max(200).optional().nullable(),
  recordingLink: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const UpdateCallLogSchema = CreateCallLogSchema.partial().omit({
  tagIds: true,
});

export const CallLogFiltersSchema = z.object({
  mobileNumber: z.string().optional(),
  contactName: z.string().optional(),
  callType: z.enum(["INCOMING", "OUTGOING", "MISSED", "REJECTED", "ALL"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  durationMin: z.coerce.number().optional(),
  durationMax: z.coerce.number().optional(),
  userId: z.string().optional(),
  tagIds: z.string().optional(), // comma-separated
  simSlot: z.enum(["SIM_1", "SIM_2", "UNKNOWN"]).optional(),
  isImportant: z.coerce.boolean().optional(),
  hasNotes: z.coerce.boolean().optional(),
  hasRecording: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["date", "duration", "mobileNumber", "contactName"])
    .optional()
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(5000).optional().default(50),
});

// =============================================================
// NOTE SCHEMAS
// =============================================================

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty").max(5000),
});

export const UpdateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

// =============================================================
// TAG SCHEMAS
// =============================================================

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .default("#6366f1"),
});

export const ApplyTagsSchema = z.object({
  tagIds: z.array(z.string()).min(0),
});

// =============================================================
// TASK SCHEMAS
// =============================================================

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional().nullable(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"])
    .default("PENDING"),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  linkedCallId: z.string().optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
});

// =============================================================
// REPORT SCHEMAS
// =============================================================

export const ReportConfigSchema = z.object({
  type: z.enum([
    "DAILY",
    "EMPLOYEE",
    "MISSED",
    "NUMBER_WISE",
    "DURATION",
    "PRODUCTIVITY",
    "TREND",
    "TEAM",
    "PEAK_HOUR",
    "HOURLY_ANALYSIS",
  ]),
  dateFrom: z.string(),
  dateTo: z.string(),
  userId: z.string().optional(),
  callType: z.enum(["INCOMING", "OUTGOING", "MISSED", "REJECTED"]).optional(),
  format: z.enum(["PDF", "EXCEL", "CSV"]).optional().default("CSV"),
});

// =============================================================
// IMPORT SCHEMAS
// =============================================================

export const ManualImportSchema = z.object({
  records: z.array(CreateCallLogSchema).min(1).max(1000),
});

export const ApiImportSchema = z.object({
  records: z
    .array(
      z.object({
        mobileNumber: z.string().min(7).max(20),
        contactName: z.string().max(200).optional(),
        callType: z.enum(["INCOMING", "OUTGOING", "MISSED", "REJECTED"]),
        date: z.string().datetime(),
        duration: z.number().int().min(0).default(0),
        simSlot: z.enum(["SIM_1", "SIM_2", "UNKNOWN"]).optional(),
        deviceName: z.string().max(200).optional(),
        recordingLink: z.string().url().optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .min(1)
    .max(10000),
});

// =============================================================
// ANALYTICS SCHEMAS
// =============================================================

export const AnalyticsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  period: z
    .enum(["today", "yesterday", "7d", "30d", "90d", "custom"])
    .default("7d"),
  userId: z.string().optional(),
  groupBy: z.enum(["hour", "day", "week", "month"]).optional().default("day"),
});

// =============================================================
// PAGINATION
// =============================================================

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});

// Type exports
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateCallLogInput = z.infer<typeof CreateCallLogSchema>;
export type UpdateCallLogInput = z.infer<typeof UpdateCallLogSchema>;
export type CallLogFiltersInput = z.infer<typeof CallLogFiltersSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ReportConfigInput = z.infer<typeof ReportConfigSchema>;
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
