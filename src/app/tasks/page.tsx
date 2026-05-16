"use client";
// src/app/tasks/page.tsx

import { useEffect, useState } from "react";
import { Plus, CheckSquare, Clock, AlertCircle, XCircle } from "lucide-react";
import { formatDate, getPriorityColor, cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  linkedCall: { mobileNumber: string; contactName: string | null } | null;
  _count: { comments: number };
}

interface KanbanBoard {
  PENDING: Task[];
  IN_PROGRESS: Task[];
  DONE: Task[];
  CANCELLED: Task[];
}

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: Clock, color: "border-gray-300 bg-gray-50", headerColor: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "In Progress", icon: AlertCircle, color: "border-blue-200 bg-blue-50/30", headerColor: "bg-blue-100 text-blue-700" },
  DONE: { label: "Done", icon: CheckSquare, color: "border-green-200 bg-green-50/30", headerColor: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", icon: XCircle, color: "border-red-200 bg-red-50/30", headerColor: "bg-red-100 text-red-700" },
};

export default function TasksPage() {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "MEDIUM", description: "" });
  const [creating, setCreating] = useState(false);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("currentOrgId") || "" : "";

  useEffect(() => {
    if (orgId) fetchBoard();
  }, [orgId]);

  async function fetchBoard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/tasks?view=kanban`);
      const data = await res.json();
      if (data.success) setBoard(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTask({ title: "", priority: "MEDIUM", description: "" });
        fetchBoard();
      }
    } finally {
      setCreating(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await fetch(`/api/v1/organizations/${orgId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchBoard();
  }

  const totalTasks = board
    ? Object.values(board).reduce((sum, tasks) => sum + tasks.length, 0)
    : 0;

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-up Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalTasks} total tasks</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["kanban", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                  view === v ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            New Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-4" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-20 bg-gray-100 rounded-lg mb-3" />
              ))}
            </div>
          ))}
        </div>
      ) : board && view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 overflow-hidden">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const tasks = board[status] || [];
            const Icon = config.icon;

            return (
              <div key={status} className={`flex flex-col rounded-xl border ${config.color} overflow-hidden`}>
                {/* Column Header */}
                <div className={`flex items-center justify-between px-4 py-3 ${config.headerColor}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={15} />
                    <span className="font-semibold text-sm">{config.label}</span>
                  </div>
                  <span className="text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : board && view === "list" ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Task", "Priority", "Status", "Assignee", "Due Date", "Linked Call"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(board)
                .flat()
                .map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                      >
                        {Object.keys(STATUS_CONFIG).map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{task.assignee?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {task.dueDate ? formatDate(task.dueDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {task.linkedCall
                        ? task.linkedCall.contactName || task.linkedCall.mobileNumber
                        : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (status: string) => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      {/* Priority badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getPriorityColor(task.priority))}>
          {task.priority}
        </span>
        {task._count.comments > 0 && (
          <span className="text-xs text-gray-400">💬 {task._count.comments}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{task.title}</p>

      {/* Linked call */}
      {task.linkedCall && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            📞 {task.linkedCall.contactName || task.linkedCall.mobileNumber}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        {task.dueDate ? (
          <span className={cn("text-xs", isOverdue ? "text-red-600 font-medium" : "text-gray-400")}>
            {isOverdue ? "⚠️ " : ""}Due {formatDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}
        {task.assignee ? (
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600" title={task.assignee.name}>
            {task.assignee.name[0]}
          </div>
        ) : (
          <span className="text-xs text-gray-300">Unassigned</span>
        )}
      </div>
    </div>
  );
}
