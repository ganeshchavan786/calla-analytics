"use client";
// ================================================
// FILE: src/app/docs/page.tsx  (NEW FILE)
// PASTE LOCATION: src/app/docs/page.tsx
// ================================================

import { useEffect } from "react";

export default function DocsPage() {
  useEffect(() => {
    // Dynamically load swagger-ui-react CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    // Load swagger-ui-dist bundle
    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      (window as any).SwaggerUIBundle({
        url: "/api/docs",
        dom_id: "#swagger-ui",
        presets: [
          (window as any).SwaggerUIBundle.presets.apis,
          (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: "BaseLayout",
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      });
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
            📞
          </div>
          <div>
            <h1 className="font-bold text-lg">CallLog SaaS</h1>
            <p className="text-gray-400 text-xs">API Documentation</p>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <a
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Dashboard
          </a>
          <a
            href="/api/docs"
            target="_blank"
            className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Raw JSON
          </a>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="max-w-4xl flex flex-wrap gap-6 text-sm text-blue-800">
          <div>
            <span className="font-semibold">Step 1:</span> Login करा{" "}
            <code className="bg-blue-100 px-1 rounded">POST /api/v1/auth/login</code>
          </div>
          <div>
            <span className="font-semibold">Step 2:</span> Token copy करा
          </div>
          <div>
            <span className="font-semibold">Step 3:</span> Authorize button click करा → token paste करा
          </div>
          <div>
            <span className="font-semibold">Step 4:</span> कोणतीही API try करा!
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div id="swagger-ui" />
    </div>
  );
}
