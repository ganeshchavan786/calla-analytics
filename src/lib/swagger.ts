// ================================================
// FILE: src/lib/swagger.ts  (NEW FILE)
// PASTE LOCATION: src/lib/swagger.ts
// ================================================

import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CallLog SaaS API",
        version: "1.0.0",
        description: `
## CallLog SaaS — Complete API Documentation

### Authentication
JWT token is required for all protected routes.
The token is received upon login — send it in the Authorization header:
\`\`\`
Authorization: Bearer <your_token>
\`\`\`

### Organization Scoping
\`orgId\` is required in all API calls.
Use \`organizations[0].id\` after logging in.

### Mobile App APIs
Separate endpoints are available for the Mobile App:
- \`/api/mobile/verify\` → Login + Code verify
- \`/api/mobile/register-sim\` → SIM register
- \`/api/mobile/sync\` → Call logs push
- \`/api/mobile/status\` → Sync status check

### Demo Credentials
- Email: admin@demo.com
- Password: Admin1234
        `,
        contact: {
          name: "CallLog SaaS Support",
          email: "support@calllogsaas.com",
        },
      },

      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          description: "Development Server",
        },
      ],

      // ── Security Scheme ──
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Login to get the token. Format: Bearer <token>",
          },
        },

        // ── Reusable Schemas ──
        schemas: {

          // Error Response
          ErrorResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: { type: "string", example: "UNAUTHORIZED" },
              message: { type: "string", example: "Authentication required" },
            },
          },

          // Success Response wrapper
          SuccessResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: { type: "object" },
            },
          },

          // User
          User: {
            type: "object",
            properties: {
              id: { type: "string", example: "clx1234abcd" },
              name: { type: "string", example: "Rahul Sharma" },
              email: { type: "string", example: "rahul@company.com" },
              avatarUrl: { type: "string", nullable: true },
              uniqueCode: { type: "string", example: "OWN-4829", nullable: true },
              codeType: { type: "string", enum: ["OWNER", "EMPLOYEE"], nullable: true },
              createdAt: { type: "string", format: "date-time" },
            },
          },

          // Organization
          Organization: {
            type: "object",
            properties: {
              id: { type: "string", example: "clx5678efgh" },
              name: { type: "string", example: "Demo Corp Pvt Ltd" },
              slug: { type: "string", example: "demo-corp" },
              timezone: { type: "string", example: "Asia/Kolkata" },
              createdAt: { type: "string", format: "date-time" },
            },
          },

          // Call Log
          CallLog: {
            type: "object",
            properties: {
              id: { type: "string" },
              mobileNumber: { type: "string", example: "9876543210" },
              contactName: { type: "string", example: "Rahul Sharma", nullable: true },
              callType: { type: "string", enum: ["INCOMING", "OUTGOING", "MISSED"] },
              date: { type: "string", format: "date-time" },
              duration: { type: "integer", example: 120, description: "seconds" },
              simSlot: { type: "string", enum: ["SIM_1", "SIM_2", "UNKNOWN"] },
              deviceName: { type: "string", nullable: true },
              recordingLink: { type: "string", nullable: true },
              isImportant: { type: "boolean", example: false },
              createdAt: { type: "string", format: "date-time" },
            },
          },

          // Create Call Log Input
          CreateCallLogInput: {
            type: "object",
            required: ["mobileNumber", "callType", "date"],
            properties: {
              mobileNumber: { type: "string", example: "9876543210" },
              contactName: { type: "string", example: "Rahul Sharma" },
              callType: { type: "string", enum: ["INCOMING", "OUTGOING", "MISSED"] },
              date: { type: "string", format: "date-time", example: "2024-01-15T10:30:00Z" },
              duration: { type: "integer", example: 120 },
              simSlot: { type: "string", enum: ["SIM_1", "SIM_2", "UNKNOWN"], default: "UNKNOWN" },
              deviceName: { type: "string", example: "Samsung Galaxy S23" },
              recordingLink: { type: "string", example: "https://example.com/recording.mp3" },
              notes: { type: "string", example: "Follow up required" },
              tagIds: { type: "array", items: { type: "string" } },
            },
          },

          // Tag
          Tag: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string", example: "Office" },
              color: { type: "string", example: "#3b82f6" },
              organizationId: { type: "string" },
            },
          },

          // Task
          FollowUpTask: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string", example: "Call back Rahul Sharma" },
              description: { type: "string", nullable: true },
              status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] },
              priority: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
              dueDate: { type: "string", format: "date-time", nullable: true },
              assigneeId: { type: "string", nullable: true },
              linkedCallId: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
            },
          },

          // Notification
          Notification: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", example: "MISSED_CALL" },
              title: { type: "string", example: "Missed Call" },
              body: { type: "string", example: "Missed call from 9876543210" },
              isRead: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
            },
          },

          // Registered SIM
          RegisteredSIM: {
            type: "object",
            properties: {
              id: { type: "string" },
              simSlot: { type: "string", enum: ["SIM_1", "SIM_2"] },
              phoneNumber: { type: "string", example: "+919876543210" },
              deviceName: { type: "string", nullable: true },
              isActive: { type: "boolean" },
              lastSyncAt: { type: "string", format: "date-time", nullable: true },
              totalSynced: { type: "integer", example: 1250 },
            },
          },

          // Mobile Sync Record
          MobileSyncRecord: {
            type: "object",
            required: ["mobileNumber", "callType", "date"],
            properties: {
              mobileNumber: { type: "string", example: "9876543210" },
              contactName: { type: "string", example: "Rahul Sharma" },
              callType: { type: "string", enum: ["INCOMING", "OUTGOING", "MISSED"] },
              date: { type: "string", format: "date-time" },
              duration: { type: "integer", example: 120 },
              simSlot: { type: "string", enum: ["SIM_1", "SIM_2", "UNKNOWN"] },
              deviceName: { type: "string" },
            },
          },

          // Paginated Response
          PaginatedResponse: {
            type: "object",
            properties: {
              data: { type: "array", items: {} },
              nextCursor: { type: "string", nullable: true },
              hasMore: { type: "boolean" },
              total: { type: "integer" },
            },
          },
        },
      },

      // ── Global Security ──
      security: [{ BearerAuth: [] }],

      // ── Tags (Groups) ──
      tags: [
        { name: "Auth", description: "Authentication — Signup, Login, Logout, Password Reset" },
        { name: "Organizations", description: "Workspace management — Create, Members, Invites" },
        { name: "Call Logs", description: "Core call log CRUD — List, Create, Update, Delete, Notes" },
        { name: "Import", description: "Bulk import — CSV, Excel, Android Backup" },
        { name: "Analytics", description: "Dashboard stats, trends, heatmap, team performance" },
        { name: "Tags", description: "Organization-wide tag management" },
        { name: "Tasks", description: "Follow-up task management — Kanban, Comments" },
        { name: "SIMs", description: "Registered SIM management per employee" },
        { name: "Reports", description: "Report generation and export" },
        { name: "Notifications", description: "In-app notification center" },
        { name: "Audit Logs", description: "Immutable audit trail (Admin/Owner only)" },
        { name: "Mobile App", description: "Mobile App specific APIs — Verify, SIM Register, Sync" },
      ],

      // ── All Paths ──
      paths: {

        // ============================================================
        // AUTH
        // ============================================================

        "/api/v1/auth/signup": {
          post: {
            tags: ["Auth"],
            summary: "Register new user",
            description: "Register a new user. The organization is created automatically, and the owner gets an OWN-XXXX code.",
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                      name: { type: "string", example: "Rahul Sharma" },
                      email: { type: "string", example: "rahul@company.com" },
                      password: { type: "string", example: "Admin1234", description: "Min 8 chars, 1 uppercase, 1 number" },
                      organizationName: { type: "string", example: "My Company Pvt Ltd" },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: "User registered successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            user: { $ref: "#/components/schemas/User" },
                            organizationId: { type: "string" },
                            token: { type: "string", description: "JWT token — save this" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              409: { description: "Email already registered" },
              400: { description: "Validation error" },
            },
          },
        },

        "/api/v1/auth/login": {
          post: {
            tags: ["Auth"],
            summary: "Login",
            description: "Login using Email and Password to get the JWT token.",
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                      email: { type: "string", example: "admin@demo.com" },
                      password: { type: "string", example: "Admin1234" },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Login successful",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            user: { $ref: "#/components/schemas/User" },
                            organizations: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Organization" },
                            },
                            token: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: "Invalid credentials" },
            },
          },
        },

        "/api/v1/auth/logout": {
          post: {
            tags: ["Auth"],
            summary: "Logout",
            description: "Clear the active session.",
            responses: {
              200: { description: "Logged out successfully" },
            },
          },
        },

        "/api/v1/auth/me": {
          get: {
            tags: ["Auth"],
            summary: "Get current user",
            description: "Current logged-in user info + organizations + registered SIMs.",
            responses: {
              200: {
                description: "Current user info",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            user: { $ref: "#/components/schemas/User" },
                            organizations: { type: "array" },
                            registeredSIMs: {
                              type: "array",
                              items: { $ref: "#/components/schemas/RegisteredSIM" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: "Unauthorized" },
            },
          },
        },

        "/api/v1/auth/forgot-password": {
          post: {
            tags: ["Auth"],
            summary: "Forgot password",
            description: "Send email to receive a password reset link. In development mode, the token is included directly in the response.",
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["email"],
                    properties: {
                      email: { type: "string", example: "rahul@company.com" },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: "Reset email sent (or silently ignored if email not found)" },
            },
          },
        },

        "/api/v1/auth/reset-password": {
          post: {
            tags: ["Auth"],
            summary: "Reset password",
            description: "Set a new password using the forgot password token.",
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["token", "password"],
                    properties: {
                      token: { type: "string", example: "uuid-reset-token" },
                      password: { type: "string", example: "NewPass1234" },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: "Password reset successful" },
              400: { description: "Invalid or expired token" },
            },
          },
        },

        // ============================================================
        // ORGANIZATIONS
        // ============================================================

        "/api/v1/organizations": {
          get: {
            tags: ["Organizations"],
            summary: "List my organizations",
            description: "List all organizations for the current user.",
            responses: {
              200: { description: "Organizations list" },
              401: { description: "Unauthorized" },
            },
          },
          post: {
            tags: ["Organizations"],
            summary: "Create organization",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string", example: "My New Company" },
                      timezone: { type: "string", example: "Asia/Kolkata" },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: "Organization created" },
            },
          },
        },

        "/api/v1/organizations/{orgId}/members": {
          get: {
            tags: ["Organizations"],
            summary: "List members",
            description: "List all members of the organization. Includes the uniqueCode.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Members list with uniqueCode" },
            },
          },
          post: {
            tags: ["Organizations"],
            summary: "Invite member",
            description: "Invite a member using their email. (Admin/Owner only)",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["email"],
                    properties: {
                      email: { type: "string", example: "employee@company.com" },
                      role: { type: "string", enum: ["ADMIN", "MEMBER", "GUEST"], default: "MEMBER" },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: "Invite created. The employee will get an EMP-XXXX code after accepting the invite." },
              403: { description: "Admin/Owner role required" },
            },
          },
        },

        // ============================================================
        // CALL LOGS
        // ============================================================

        "/api/v1/organizations/{orgId}/call-logs": {
          get: {
            tags: ["Call Logs"],
            summary: "List call logs",
            description: "List call logs with filtering, searching, and pagination.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "search", in: "query", schema: { type: "string" }, description: "Number/name/notes search" },
              { name: "callType", in: "query", schema: { type: "string", enum: ["INCOMING", "OUTGOING", "MISSED", "ALL"] } },
              { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
              { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
              { name: "durationMin", in: "query", schema: { type: "integer" } },
              { name: "durationMax", in: "query", schema: { type: "integer" } },
              { name: "isImportant", in: "query", schema: { type: "boolean" } },
              { name: "hasNotes", in: "query", schema: { type: "boolean" } },
              { name: "tagIds", in: "query", schema: { type: "string" }, description: "Comma separated tag IDs" },
              { name: "sortBy", in: "query", schema: { type: "string", enum: ["date", "duration", "mobileNumber"] } },
              { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
              { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
              { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            ],
            responses: {
              200: {
                description: "Paginated call logs",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/PaginatedResponse" },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Call Logs"],
            summary: "Create call log (manual entry)",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateCallLogInput" },
                },
              },
            },
            responses: {
              201: { description: "Call log created" },
              403: { description: "Guest users cannot create call logs" },
            },
          },
        },

        "/api/v1/organizations/{orgId}/call-logs/{id}": {
          get: {
            tags: ["Call Logs"],
            summary: "Get call log by ID",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Call log detail with notes, tags, tasks" },
              404: { description: "Not found" },
            },
          },
          patch: {
            tags: ["Call Logs"],
            summary: "Update call log",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateCallLogInput" },
                },
              },
            },
            responses: {
              200: { description: "Updated" },
            },
          },
          delete: {
            tags: ["Call Logs"],
            summary: "Delete call log (soft delete)",
            description: "Admin/Owner only. Soft delete preserves the audit trail.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              200: { description: "Deleted" },
              403: { description: "Admin/Owner role required" },
            },
          },
        },

        "/api/v1/organizations/{orgId}/call-logs/{id}/notes": {
          get: {
            tags: ["Call Logs"],
            summary: "Get notes for a call log",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { 200: { description: "Notes list" } },
          },
          post: {
            tags: ["Call Logs"],
            summary: "Add note to call log",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["content"],
                    properties: {
                      content: { type: "string", example: "Follow up required by tomorrow" },
                    },
                  },
                },
              },
            },
            responses: { 201: { description: "Note added" } },
          },
        },

        // ============================================================
        // IMPORT
        // ============================================================

        "/api/v1/organizations/{orgId}/import": {
          post: {
            tags: ["Import"],
            summary: "Import call logs from file",
            description: "Upload CSV, Excel, or Android Backup file. Maximum size 20MB.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    required: ["file", "source"],
                    properties: {
                      file: { type: "string", format: "binary", description: "CSV/Excel/Android backup file" },
                      source: { type: "string", enum: ["CSV", "EXCEL", "ANDROID_BACKUP"] },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: "Import completed",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            batchId: { type: "string" },
                            totalRows: { type: "integer" },
                            successRows: { type: "integer" },
                            failedRows: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          get: {
            tags: ["Import"],
            summary: "List import batches",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { 200: { description: "Import history" } },
          },
        },

        // ============================================================
        // ANALYTICS
        // ============================================================

        "/api/v1/organizations/{orgId}/analytics": {
          get: {
            tags: ["Analytics"],
            summary: "Get analytics data",
            description: "Dashboard stats, trends, heatmap, team performance, etc.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              {
                name: "type", in: "query", required: true,
                schema: {
                  type: "string",
                  enum: ["overview", "trends", "heatmap", "top-numbers", "team", "response-times", "duplicates"],
                },
                description: "overview=KPI stats, trends=line chart, heatmap=hour grid, top-numbers=frequent numbers, team=employee stats",
              },
              { name: "period", in: "query", schema: { type: "string", enum: ["today", "yesterday", "7d", "30d", "90d", "custom"] } },
              { name: "dateFrom", in: "query", schema: { type: "string", format: "date" }, description: "required if period=custom" },
              { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
              { name: "groupBy", in: "query", schema: { type: "string", enum: ["day", "week", "month"] } },
            ],
            responses: { 200: { description: "Analytics data" } },
          },
        },

        // ============================================================
        // TAGS
        // ============================================================

        "/api/v1/organizations/{orgId}/tags": {
          get: {
            tags: ["Tags"],
            summary: "List tags",
            parameters: [{ name: "orgId", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "Tags list with usage count" } },
          },
          post: {
            tags: ["Tags"],
            summary: "Create tag",
            parameters: [{ name: "orgId", in: "path", required: true, schema: { type: "string" } }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string", example: "Office" },
                      color: { type: "string", example: "#3b82f6" },
                    },
                  },
                },
              },
            },
            responses: { 201: { description: "Tag created" } },
          },
        },

        // ============================================================
        // TASKS
        // ============================================================

        "/api/v1/organizations/{orgId}/tasks": {
          get: {
            tags: ["Tasks"],
            summary: "List tasks",
            description: "Send ?view=kanban for grouped Kanban data.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "view", in: "query", schema: { type: "string", enum: ["list", "kanban"] } },
              { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] } },
              { name: "priority", in: "query", schema: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] } },
              { name: "assigneeId", in: "query", schema: { type: "string" } },
            ],
            responses: { 200: { description: "Tasks list or Kanban board" } },
          },
          post: {
            tags: ["Tasks"],
            summary: "Create task",
            parameters: [{ name: "orgId", in: "path", required: true, schema: { type: "string" } }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["title"],
                    properties: {
                      title: { type: "string", example: "Call back Rahul Sharma" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
                      dueDate: { type: "string", format: "date-time" },
                      assigneeId: { type: "string" },
                      linkedCallId: { type: "string", description: "Link to a call log" },
                    },
                  },
                },
              },
            },
            responses: { 201: { description: "Task created" } },
          },
        },

        "/api/v1/organizations/{orgId}/tasks/{id}": {
          get: {
            tags: ["Tasks"],
            summary: "Get task by ID",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { 200: { description: "Task detail with comments and watchers" } },
          },
          patch: {
            tags: ["Tasks"],
            summary: "Update task",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] },
                      priority: { type: "string", enum: ["URGENT", "HIGH", "MEDIUM", "LOW"] },
                      assigneeId: { type: "string" },
                      dueDate: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            responses: { 200: { description: "Task updated" } },
          },
          delete: {
            tags: ["Tasks"],
            summary: "Delete task (soft delete)",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { 200: { description: "Deleted" } },
          },
        },

        "/api/v1/organizations/{orgId}/tasks/{id}/comments": {
          post: {
            tags: ["Tasks"],
            summary: "Add comment to task",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["content"],
                    properties: {
                      content: { type: "string", example: "Working on this, will update by EOD" },
                    },
                  },
                },
              },
            },
            responses: { 201: { description: "Comment added, watchers notified" } },
          },
        },

        // ============================================================
        // SIMs
        // ============================================================

        "/api/v1/organizations/{orgId}/sims": {
          get: {
            tags: ["SIMs"],
            summary: "Get SIM registrations",
            description: "Owner/Admin gets SIMs of all employees. Member gets only their own SIMs.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              200: {
                description: "SIM list",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: { type: "array", items: { $ref: "#/components/schemas/RegisteredSIM" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // ============================================================
        // REPORTS
        // ============================================================

        "/api/v1/organizations/{orgId}/reports": {
          get: {
            tags: ["Reports"],
            summary: "Generate report",
            description: "Generate report — returns a JSON preview. For file download, specify format=CSV or EXCEL.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              {
                name: "type", in: "query", required: true,
                schema: {
                  type: "string",
                  enum: ["DAILY", "EMPLOYEE", "MISSED", "NUMBER_WISE", "DURATION", "PRODUCTIVITY", "TREND", "TEAM", "PEAK_HOUR"],
                },
              },
              { name: "dateFrom", in: "query", required: true, schema: { type: "string", format: "date" } },
              { name: "dateTo", in: "query", required: true, schema: { type: "string", format: "date" } },
              { name: "format", in: "query", schema: { type: "string", enum: ["CSV", "EXCEL", "PDF"] } },
            ],
            responses: { 200: { description: "Report data (array of rows)" } },
          },
        },

        // ============================================================
        // NOTIFICATIONS
        // ============================================================

        "/api/v1/organizations/{orgId}/notifications": {
          get: {
            tags: ["Notifications"],
            summary: "Get notifications",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "cursor", in: "query", schema: { type: "string" } },
              { name: "limit", in: "query", schema: { type: "integer", default: 25 } },
            ],
            responses: { 200: { description: "Notifications with unread count" } },
          },
          patch: {
            tags: ["Notifications"],
            summary: "Mark notifications as read",
            description: "Provide an id to mark a specific notification as read. If no id is provided, all notifications will be marked as read.",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "Specific notification ID (optional)" },
                    },
                  },
                },
              },
            },
            responses: { 200: { description: "Marked as read" } },
          },
        },

        // ============================================================
        // AUDIT LOGS
        // ============================================================

        "/api/v1/organizations/{orgId}/audit-logs": {
          get: {
            tags: ["Audit Logs"],
            summary: "Get audit trail (Admin/Owner only)",
            parameters: [
              { name: "orgId", in: "path", required: true, schema: { type: "string" } },
              { name: "entityType", in: "query", schema: { type: "string", example: "call_log" } },
              { name: "entityId", in: "query", schema: { type: "string" } },
              { name: "actorId", in: "query", schema: { type: "string" } },
              { name: "cursor", in: "query", schema: { type: "string" } },
              { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
            ],
            responses: {
              200: { description: "Audit log entries" },
              403: { description: "Admin/Owner only" },
            },
          },
        },

        // ============================================================
        // MOBILE APP APIs
        // ============================================================

        "/api/mobile/verify": {
          post: {
            tags: ["Mobile App"],
            summary: "Mobile App Login",
            description: `**For Mobile App Developers**

Step 1: Verify Email + Password + uniqueCode.
- Owner code format: OWN-XXXX (visible in Dashboard)
- Employee code format: EMP-XXXX (visible in Settings)

Login will fail if the code is incorrect.`,
            security: [],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["email", "password", "uniqueCode"],
                    properties: {
                      email: { type: "string", example: "rahul@company.com" },
                      password: { type: "string", example: "Admin1234" },
                      uniqueCode: { type: "string", example: "EMP-7341", description: "Copy from the dashboard" },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Login successful — save this token",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            token: { type: "string", description: "Use this token in all subsequent API calls" },
                            user: { $ref: "#/components/schemas/User" },
                            organization: { $ref: "#/components/schemas/Organization" },
                            registeredSIMs: { type: "array" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: "Invalid credentials or wrong code" },
            },
          },
        },

        "/api/mobile/register-sim": {
          post: {
            tags: ["Mobile App"],
            summary: "Register SIM",
            description: `**For Mobile App Developers**

Register SIM after login.
- SIM_1 and SIM_2 can be registered independently.
- If already registered, the entry will be updated.`,
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["simSlot", "phoneNumber"],
                    properties: {
                      simSlot: { type: "string", enum: ["SIM_1", "SIM_2"] },
                      phoneNumber: { type: "string", example: "+919876543210" },
                      deviceName: { type: "string", example: "Samsung Galaxy S23" },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: "SIM registered/updated successfully" },
            },
          },
          get: {
            tags: ["Mobile App"],
            summary: "Get my registered SIMs",
            description: "List registered SIMs of the current user.",
            responses: { 200: { description: "SIM list" } },
          },
        },

        "/api/mobile/sync": {
          post: {
            tags: ["Mobile App"],
            summary: "Sync call logs",
            description: `**For Mobile App Developers — Main API**

Push call logs from the Android app.
- Maximum of 5000 records per request.
- Inserted in batches for optimal performance.
- Missed calls automatically trigger notifications.
- simSlot field is required to separate data by SIM.`,
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["records"],
                    properties: {
                      records: {
                        type: "array",
                        items: { $ref: "#/components/schemas/MobileSyncRecord" },
                        description: "Call log records array",
                      },
                      simSlot: {
                        type: "string",
                        enum: ["SIM_1", "SIM_2", "UNKNOWN"],
                        description: "Indicates which SIM slot the records belong to",
                      },
                    },
                  },
                  example: {
                    simSlot: "SIM_1",
                    records: [
                      {
                        mobileNumber: "9876543210",
                        contactName: "Rahul Sharma",
                        callType: "INCOMING",
                        date: "2024-01-15T10:30:00Z",
                        duration: 120,
                        simSlot: "SIM_1",
                        deviceName: "Samsung Galaxy S23",
                      },
                      {
                        mobileNumber: "9123456789",
                        callType: "MISSED",
                        date: "2024-01-15T11:45:00Z",
                        duration: 0,
                        simSlot: "SIM_1",
                      },
                    ],
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Sync successful",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            batchId: { type: "string" },
                            totalRows: { type: "integer" },
                            successRows: { type: "integer" },
                            failedRows: { type: "integer" },
                            syncedAt: { type: "string", format: "date-time" },
                          },
                        },
                        message: { type: "string", example: "1250 records successfully synced" },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        "/api/mobile/status": {
          get: {
            tags: ["Mobile App"],
            summary: "Get sync status",
            description: "Returns the sync status, registered SIMs, and last sync info of the current user.",
            responses: {
              200: {
                description: "Status info",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        data: {
                          type: "object",
                          properties: {
                            user: { $ref: "#/components/schemas/User" },
                            organization: { $ref: "#/components/schemas/Organization" },
                            sims: { type: "array", items: { $ref: "#/components/schemas/RegisteredSIM" } },
                            lastSync: { type: "object", nullable: true },
                            totalCallLogsSynced: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
