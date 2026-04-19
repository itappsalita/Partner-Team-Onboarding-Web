"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: number;
  link: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(new Date()); 
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (n.isRead === 0) {
      await markAsRead(n.id);
    }
    
    if (n.link) {
      setIsOpen(false);
      router.push(n.link);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ readAll: true }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Network Polling: Fetch notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // UI Ticker: Update timestamps only when dropdown is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      setNow(new Date()); // Update immediately on open
      interval = setInterval(() => {
        setNow(new Date());
      }, 10000); // Ticking every 10s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.isRead === 0).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    
    // Normalize date string for browser compatibility
    // Fix: In local environments, the DB often sends local time but labels it as UTC (.000Z).
    // We strip the 'Z' and handle spaces to force the browser to read it as Local Time.
    let normalized = dateString;
    if (typeof dateString === 'string') {
      normalized = dateString.replace(' ', 'T').replace('.000Z', '').replace('Z', '');
    }
    
    const dateObj = new Date(normalized);
    const diffInSeconds = Math.round((now.getTime() - dateObj.getTime()) / 1000);

    // Logging only the final decision to keep console clean
    if (diffInSeconds < 15 && diffInSeconds > -15) return "Baru saja";
    if (diffInSeconds >= 15 && diffInSeconds < 60) return `${diffInSeconds} detik yang lalu`;
    
    // Future guard: if still negative, it's just now
    if (diffInSeconds < 0) return "Baru saja"; 
    
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j yang lalu`;
    return dateObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CERTIFICATE':
        return (
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l-4-4l-1 1l-4-4l11-13l11 13l-4 4l-1-1l-4 4l-2-5Z"></path><path d="M12 15l2 5l4-4l1 1l4-4l-11-13"></path></svg>
          </div>
        );
      case 'TRAINING':
        return (
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-alita-orange border border-orange-100 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
        );
      case 'ASSIGNMENT':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 flex-shrink-0">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-alita-gray-50 flex items-center justify-center text-alita-gray-400 border border-alita-gray-100 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-300 focus:outline-none flex items-center justify-center ${
          isOpen ? "bg-alita-orange/10 text-alita-orange shadow-inner" : "text-alita-gray-400 hover:text-alita-black hover:bg-alita-gray-50"
        }`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          ></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-lg ring-2 ring-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[380px] lg:w-[420px] rounded-3xl bg-white shadow-elevated border border-alita-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right">
          {/* Header */}
          <div className="px-6 py-5 bg-alita-white border-b border-alita-gray-100 flex justify-between items-center relative">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-alita-orange to-alita-orange-dark" />
            <div>
              <h3 className="text-sm font-black text-alita-black tracking-tight leading-none mb-1">Pusat Notifikasi</h3>
              <p className="text-[10px] font-bold text-alita-gray-400 uppercase tracking-widest leading-none">Anda memiliki {unreadCount} pesan baru</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-alita-gray-50 hover:bg-alita-orange hover:text-alita-white text-[9px] font-black text-alita-gray-500 rounded-lg transition-all uppercase tracking-widest border border-alita-gray-100"
              >
                Baca Semua
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar bg-white divide-y divide-alita-gray-50">
            {notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                <div className="w-16 h-16 bg-alita-gray-50 rounded-3xl flex items-center justify-center text-3xl shadow-inner border border-alita-gray-100 rotate-12 mb-4 animate-bounce duration-slow opacity-60">🔔</div>
                <h4 className="text-sm font-black text-alita-black tracking-tight mb-2">Hening Sekali...</h4>
                <p className="text-xs font-medium text-alita-gray-400 leading-relaxed">Belum ada aktivitas terbaru untuk akun Anda saat ini.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-6 py-5 hover:bg-alita-gray-50/80 transition-all duration-200 cursor-pointer relative group flex gap-4 ${
                    n.isRead === 0 ? "bg-orange-50/20" : ""
                  }`}
                >
                  {/* Unread Indicator Accent */}
                  {n.isRead === 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-alita-orange shadow-[0_0_10px_rgba(255,122,0,0.5)]" />
                  )}
                  
                  {getNotificationIcon(n.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                       <span className={`text-xs font-black tracking-tight leading-tight ${n.isRead === 0 ? "text-alita-black" : "text-alita-gray-500"}`}>
                        {n.title}
                       </span>
                       <span className="text-[10px] font-black text-alita-gray-400 whitespace-nowrap bg-alita-gray-50 px-2 py-0.5 rounded-md border border-alita-gray-100">
                        {formatDate(n.createdAt)}
                       </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed mb-3 line-clamp-2 ${n.isRead === 0 ? "text-alita-gray-600 font-medium" : "text-alita-gray-400"}`}>
                      {n.message}
                    </p>
                    {n.link && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-alita-orange uppercase tracking-wider group-hover:gap-3 transition-all">
                        <span>Lihat Detail</span>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
             <div className="p-4 bg-alita-gray-50/50 text-center border-t border-alita-gray-100">
                <p className="text-[9px] font-black text-alita-gray-400 uppercase tracking-[0.1em]">Menampilkan riwayat aktivitas terbaru</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
