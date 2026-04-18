'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

/**
 * @description Renders the interactive Swagger UI page for API documentation.
 * This is a client-side component as it interacts with the DOM.
 */
const SwaggerPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Professional Standalone Header */}
      <header className="bg-[#1e3a8a] py-6 px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Technical API Documentation</h1>
            <p className="text-blue-100 text-sm mt-1 opacity-90">
              Partner Team Onboarding System &bull; REST API Explorer
            </p>
          </div>
          <div className="bg-blue-800/50 px-4 py-2 rounded-lg border border-blue-400/30">
            <span className="text-blue-100 text-xs font-medium uppercase tracking-wider">Internal Access Only</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto bg-white shadow-xl min-h-[calc(100vh-120px)] mt-0 md:mt-8 md:rounded-t-xl overflow-hidden border-x border-t border-gray-200">
        <div className="p-4 md:p-8">
          <div className="mb-8 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-md">
            <h2 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Getting Started</h2>
            <p className="text-emerald-700 text-sm mt-1">
              Gunakan panel interaktif di bawah ini untuk membongkar, menguji, dan memahami setiap endpoint yang tersedia di sistem Alita.
            </p>
          </div>
          
          <div className="swagger-wrapper">
            <SwaggerUI 
              url="/api/docs" 
              docExpansion="list"
              defaultModelsExpandDepth={-1}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto py-6 text-center text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} PT. Alita Praya Mitra. All technical rights reserved.
      </footer>

      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0 40px 0;
        }
        .swagger-ui .info .title {
          font-size: 28px;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: -0.025em;
        }
        .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 20px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .swagger-ui .opblock.opblock-get { background: rgba(59, 130, 246, 0.03); border-color: #3b82f6; }
        .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.03); border-color: #10b981; }
        .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.03); border-color: #f59e0b; }
        .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.03); border-color: #ef4444; }
      `}</style>
    </div>
  );
};

export default SwaggerPage;
