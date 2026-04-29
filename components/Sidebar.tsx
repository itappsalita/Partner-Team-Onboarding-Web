"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useSidebar } from "./SidebarContext";

// SVG Icon Components
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  requests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  dataTeam: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  qaTraining: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  certificates: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  members: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
    </svg>
  ),
};

const menuItems = [
  { name: "Dashboard", href: "/dashboard", iconKey: "dashboard" },
  { name: "Request for Partner", href: "/requests", iconKey: "requests" },
  { name: "Data Team Partner", href: "/data-team", iconKey: "dataTeam" },
  { name: "QA Training", href: "/qa-training", iconKey: "qaTraining" },
  { name: "Publish Certificate", href: "/certificates", iconKey: "certificates" },
  { name: "Database Anggota", href: "/members", iconKey: "members" },
  { name: "User Settings", href: "/users", iconKey: "users" },
];

const roleAccess: Record<string, string[]> = {
  "Dashboard": ["SUPERADMIN", "PARTNER", "PMO_OPS", "PROCUREMENT", "QA", "PEOPLE_CULTURE"],
  "Request for Partner": ["SUPERADMIN", "PMO_OPS", "PROCUREMENT"],
  "Data Team Partner": ["SUPERADMIN", "PROCUREMENT", "PARTNER", "QA", "PEOPLE_CULTURE"],
  "QA Training": ["SUPERADMIN", "QA"],
  "Publish Certificate": ["SUPERADMIN", "PEOPLE_CULTURE"],
  "Database Anggota": ["SUPERADMIN", "PMO_OPS", "PROCUREMENT", "QA", "PEOPLE_CULTURE"],
  "User Settings": ["SUPERADMIN"],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isOpen, close } = useSidebar();
  const userRole = (session?.user as any)?.role;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={close}
        />
      )}

      <aside className={`fixed md:relative z-40 h-full w-[272px] min-w-[272px] bg-gradient-to-b from-alita-black via-alita-black-soft to-alita-charcoal text-alita-white flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        {/* Logo */}
        <div className="p-7 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 relative flex-shrink-0">
            <Image 
              src="/images/logo.png" 
              alt="Alita Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div>
            <div className="text-[1.15rem] font-bold tracking-[-0.3px] text-alita-white leading-tight">Alita Partner</div>
            <div className="text-[0.7rem] text-alita-gray-400 font-normal tracking-[0.5px] uppercase mt-0.5">Team Onboarding</div>
          </div>
        </div>

        {/* Menu Label */}
        <div className="px-6 pt-6 pb-2 text-[0.6rem] font-semibold uppercase tracking-[1.5px] text-alita-gray-500">Navigation</div>

        {/* Nav Items */}
        <nav className="flex-1 p-[0.5rem_0.75rem] flex flex-col gap-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const allowed = roleAccess[item.name];
            if (allowed && !allowed.includes(userRole)) return null;

            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-[0.85rem] py-[0.65rem] rounded-lg transition-all duration-200 border text-[0.82rem] group ${
                  isActive 
                  ? "text-alita-white bg-gradient-to-r from-alita-orange to-alita-orange-dark shadow-orange border-transparent font-semibold" 
                  : "text-alita-gray-300 font-medium border-transparent hover:text-alita-white hover:bg-white/[0.06] hover:border-white/[0.04]"
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>
                  {icons[item.iconKey]}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="mx-5 border-t border-white/5" />

        {/* User Footer */}
        {session?.user && (
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-alita-orange to-alita-orange-dark flex items-center justify-center text-white text-sm font-black shrink-0 shadow-orange/30">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-alita-white truncate leading-tight">{session.user.name}</div>
                <div className="text-[0.65rem] text-alita-gray-400 font-medium tracking-wide uppercase mt-0.5">{userRole}</div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[0.75rem] font-semibold text-alita-gray-400 border border-white/[0.06] bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
