// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCallTypeColor(callType: string): string {
  switch (callType) {
    case "INCOMING": return "text-green-600 bg-green-50";
    case "OUTGOING": return "text-blue-600 bg-blue-50";
    case "MISSED": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "URGENT": return "text-red-600 bg-red-50";
    case "HIGH": return "text-orange-600 bg-orange-50";
    case "MEDIUM": return "text-yellow-600 bg-yellow-50";
    case "LOW": return "text-gray-600 bg-gray-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "PENDING": return "text-gray-600 bg-gray-100";
    case "IN_PROGRESS": return "text-blue-600 bg-blue-50";
    case "DONE": return "text-green-600 bg-green-50";
    case "CANCELLED": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-100";
  }
}
