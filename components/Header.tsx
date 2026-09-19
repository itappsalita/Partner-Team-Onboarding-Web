"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import NotificationBell from "./NotificationBell";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/requests": "Request for Partner",
  "/data-team": "Data Team Partner",
  "/qa-training": "QA Training",
  "/certificates": "Publish Certificate",
  "/users": "User Settings",
};

export default function Header() {
  const { data: session } = useSession();
  const { toggle } = useSidebar();
  const pathname = usePathname();

  const currentPage = breadcrumbMap[pathname] || "Dashboard";

  return (
    <header className="h-16 shrink-0 gap-2 bg-alita-white/80 backdrop-blur-md border-b border-alita-gray-100/80 flex items-center justify-between px-4 lg:px-8 z-20 sticky top-0">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger Menu - Mobile only */}
        <button 
          onClick={toggle}
          className="p-3 -ml-2 rounded-lg hover:bg-alita-gray-100 lg:hidden text-alita-black transition-colors"
          aria-label="Toggle Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-alita-gray-300 text-xs font-medium hidden sm:inline">Alita</span>
          <svg className="w-3.5 h-3.5 text-alita-gray-200 hidden sm:inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="truncate text-sm font-bold text-alita-black tracking-tight">{currentPage}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        {session?.user && (
          <>
            <NotificationBell />
            <div className="h-6 w-px bg-alita-gray-100 mx-1 hidden lg:block"></div>
            <span className="hidden lg:inline max-w-40 truncate text-[0.8rem] font-semibold text-alita-gray-500">
              {session.user.name}
            </span>
            <span className="hidden sm:inline-flex items-center bg-linear-to-r from-alita-orange-subtle to-alita-orange-glow text-alita-orange-dark px-2.5 py-1 rounded-full text-[0.65rem] font-bold tracking-[0.3px] border border-alita-orange-glow">
              {session.user.role}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
