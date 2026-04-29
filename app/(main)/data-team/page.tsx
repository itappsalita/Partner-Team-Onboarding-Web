"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import AssignPartnerModal from "../../../components/AssignPartnerModal";
import TeamManagement from "../../../components/TeamManagement";
import Modal from "../../../components/Modal";

const PROVINSI_INDONESIA = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bangka Belitung", "Bengkulu", "Lampung",
  "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta",
  "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur",
  "Kalimantan Utara", "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Sulawesi Barat", "Gorontalo", "Maluku", "Maluku Utara",
  "Papua", "Papua Barat", "Papua Tengah", "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya"
];

function DataTeamContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const assignmentIdParam = searchParams.get("assignmentId");
  const openModalParam = searchParams.get("openModal");

  const userRole = (session?.user as any)?.role;
  const isProcurement = userRole === "PROCUREMENT" || userRole === "SUPERADMIN";
  const isPartner = userRole === "PARTNER";

  const [dataTeams, setDataTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [requesting, setRequesting] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'canceled'>('ongoing');
  const [searchSow, setSearchSow] = useState("");
  const [searchPartner, setSearchPartner] = useState("");
  const [filterProvinsi, setFilterProvinsi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Confirmation modal state
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  
  // Edit Docs Modal
  const [isEditDocsModalOpen, setIsEditDocsModalOpen] = useState(false);
  const [editDocsTarget, setEditDocsTarget] = useState<any>(null);
  const [editFiles, setEditFiles] = useState<{ tor: File | null; bak: File | null }>({ tor: null, bak: null });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Cancel Assignment
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);

  const getWorstCaseStatus = (dt: any) => {
    // If the master status from DB is already COMPLETED or CANCELED, respect it immediately
    if (dt.status === 'CANCELED') return 'CANCELED';
    if (dt.status === 'COMPLETED') return 'COMPLETED';
    
    if (!dt.teams || dt.teams.length === 0) return dt.status || 'SOURCING';
    
    const statuses = dt.teams.map((t: any) => t.status);
    
    if (statuses.some((s: any) => s === 'SOURCING')) return 'SOURCING';
    if (statuses.some((s: any) => s === 'WAIT_SCHEDULE_TRAINING')) return 'WAIT_SCHEDULE_TRAINING';
    if (statuses.some((s: any) => s === 'TRAINING_SCHEDULED')) return 'TRAINING_SCHEDULED';
    if (statuses.some((s: any) => s === 'TRAINING_EVALUATED')) return 'TRAINING_EVALUATED';
    
    return 'COMPLETED';
  };

  const fetchDataTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data-team");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDataTeams(data);
      }
    } catch (error) {
      console.error("Failed to fetch data teams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDataTeams();
  }, []);

  // AUTO-TAB SWITCHING & SCROLLING LOGIC
  useEffect(() => {
    if (highlightId && dataTeams.length > 0) {
      const target = dataTeams.find(dt => dt.id === highlightId);
      if (target) {
        // 1. Identify and switch to correct tab
        const status = getWorstCaseStatus(target);
        if (status === 'COMPLETED') setActiveTab('completed');
        else if (status === 'CANCELED') setActiveTab('canceled');
        else setActiveTab('ongoing');

        // 2. Small delay to ensure rendering, then scroll into view
        setTimeout(() => {
          const rowElement = document.querySelector('.row-highlight');
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 800);
      }
    }
  }, [highlightId, dataTeams]);

  // AUTO-OPEN MODAL LOGIC
  useEffect(() => {
    if (openModalParam === "true" && assignmentIdParam && dataTeams.length > 0) {
      const target = dataTeams.find(dt => dt.id === assignmentIdParam);
      
      if (target) {
        setSelectedAssignment(target);
        
        // Ensure the correct tab is active so the underlying data is consistent
        const status = getWorstCaseStatus(target);
        if (status === 'COMPLETED') setActiveTab('completed');
        else if (status === 'CANCELED') setActiveTab('canceled');
        else setActiveTab('ongoing');

        // CLEANUP URL: Remove specific parameters to prevent re-opening on next render
        router.replace('/data-team', { scroll: false });
      }
    }
  }, [assignmentIdParam, openModalParam, dataTeams, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchSow, searchPartner, filterProvinsi, activeTab]);

  const handleExport = async (id?: string) => {
    try {
      const urlParams = id ? `?id=${id}` : "";
      const res = await fetch(`/api/data-team/export${urlParams}`);
      if (!res.ok) throw new Error("Gagal mengunduh file");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Expert_Data_Personnel_${id || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Terjadi kesalahan saat mengekspor data.");
    }
  };


  const handleEditDocs = (dt: any) => {
    setEditDocsTarget(dt);
    setEditFiles({ tor: null, bak: null });
    setIsEditDocsModalOpen(true);
  };

  const submitEditDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDocsTarget) return;

    setIsEditSubmitting(true);
    try {
      const formData = new FormData();
      if (editFiles.tor) formData.append("torFile", editFiles.tor);
      if (editFiles.bak) formData.append("bakFile", editFiles.bak);

      const res = await fetch(`/api/data-team/${editDocsTarget.id}`, {
        method: "PUT",
        body: formData
      });

      if (res.ok) {
        setIsEditDocsModalOpen(false);
        fetchDataTeams();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengupdate dokumen");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCancelAssignment = (dt: any) => {
    setCancelTarget(dt);
    setIsCancelConfirmOpen(true);
  };

  const executeCancelAssignment = async () => {
    if (!cancelTarget) return;
    setIsCancelSubmitting(true);
    try {
      const res = await fetch(`/api/data-team/${cancelTarget.id}/cancel`, {
        method: "POST"
      });
      if (res.ok) {
        setIsCancelConfirmOpen(false);
        fetchDataTeams();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membatalkan penugasan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  if (selectedAssignment) {
    const handleCloseOverlay = () => {
      setSelectedAssignment(null);
      fetchDataTeams();
    };

    return (
      <div 
        className="fixed inset-0 bg-alita-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 md:p-10 animate-in fade-in duration-300 cursor-pointer"
        onClick={handleCloseOverlay}
      >
         <div 
            className="bg-alita-white w-full max-w-[1250px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <TeamManagement 
              assignment={selectedAssignment} 
              onClose={handleCloseOverlay} 
            />
         </div>
      </div>
    );
  }

  const filteredDataTeams = dataTeams.filter(dt => {
    // 1. Tab Filtering
    const status = getWorstCaseStatus(dt);
    if (activeTab === 'ongoing') {
      if (status === 'COMPLETED' || status === 'CANCELED') return false;
    } else if (activeTab === 'completed') {
      if (status !== 'COMPLETED') return false;
    } else if (activeTab === 'canceled') {
      if (status !== 'CANCELED') return false;
    }

    // 2. Search SOW
    if (searchSow && !dt.request?.sowPekerjaan?.toLowerCase().includes(searchSow.toLowerCase())) return false;

    // 3. Search Partner
    if (searchPartner && !dt.partner?.name?.toLowerCase().includes(searchPartner.toLowerCase())) return false;

    // 4. Filter Provinsi
    if (filterProvinsi && dt.request?.provinsi !== filterProvinsi) return false;

    return true;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDataTeams.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDataTeams.length / itemsPerPage);

  const ongoingCount = dataTeams.filter(dt => {
    const s = getWorstCaseStatus(dt);
    return s !== 'COMPLETED' && s !== 'CANCELED';
  }).length;
  const completedCount = dataTeams.filter(dt => getWorstCaseStatus(dt) === 'COMPLETED').length;
  const canceledCount = dataTeams.filter(dt => getWorstCaseStatus(dt) === 'CANCELED').length;

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">Data Team Partner</h1>
          <p className="text-alita-gray-500 text-sm font-medium">
            {isProcurement 
              ? "Kelola penunjukan partner dan dokumen TOR/BAK." 
              : "Kelola informasi tim dan anggota untuk penugasan Anda."}
          </p>
        </div>
        <div className="flex gap-2">
          {!isPartner && (
            <button
              className="bg-green-50 border border-green-200 text-green-700 px-5 py-2.5 rounded-lg text-[11px] font-bold shadow-sm hover:bg-green-100 active:scale-95 transition-all whitespace-nowrap flex items-center gap-2"
              onClick={() => handleExport()}
              title="Download semua data anggota tanpa foto KTP/Selfie"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Excel (Semua)
            </button>
          )}
          {isProcurement && (
            <button
              className="bg-alita-black text-alita-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-alita-gray-800 active:scale-95 transition-all whitespace-nowrap"
              onClick={() => setIsAssignModalOpen(true)}
            >
              + Assign Partner
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-alita-gray-50 p-1.5 rounded-2xl w-fit border border-alita-gray-100 shadow-inner">
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'ongoing' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setActiveTab('ongoing')}
        >
          Sedang Berjalan
          <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'ongoing' ? 'bg-alita-orange text-alita-white' : 'bg-alita-gray-200 text-alita-gray-500'}`}>
            {ongoingCount}
          </span>
        </button>
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'completed' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setActiveTab('completed')}
        >
          Selesai
          <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'completed' ? 'bg-green-600 text-alita-white' : 'bg-green-50 text-green-600'}`}>
            {completedCount}
          </span>
        </button>
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'canceled' 
              ? 'bg-alita-white text-red-600 shadow-md' 
              : 'text-alita-gray-400 hover:text-red-400'
          }`}
          onClick={() => setActiveTab('canceled')}
        >
          Dibatalkan
          <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'canceled' ? 'bg-red-500 text-alita-white' : 'bg-alita-gray-200 text-alita-gray-500'}`}>
            {canceledCount}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Cari SOW Pekerjaan..." 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
              value={searchSow}
              onChange={(e) => setSearchSow(e.target.value)}
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Filter Nama Partner..." 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
              value={searchPartner}
              onChange={(e) => setSearchPartner(e.target.value)}
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="relative group">
            <select 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm appearance-none"
              value={filterProvinsi}
              onChange={(e) => setFilterProvinsi(e.target.value)}
            >
              <option value="">Semua Provinsi</option>
              {PROVINSI_INDONESIA.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>

        {(searchSow || searchPartner || filterProvinsi) && (
          <button 
            onClick={() => {
              setSearchSow("");
              setSearchPartner("");
              setFilterProvinsi("");
            }}
            className="px-5 py-3 bg-alita-white border border-alita-gray-200 text-alita-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center gap-2 shadow-sm animate-in fade-in zoom-in-95 duration-200"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Reset Filter
          </button>
        )}
      </div>

      <div className="bg-alita-white rounded-2xl shadow-sm border border-alita-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-alita-gray-50">
              <tr className="border-b border-alita-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Nomor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Assignment (SOW)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Perusahaan / PIC Partner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Dokumen</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-36" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-16" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-6 w-24" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <div className="text-sm font-bold text-alita-gray-400">Tidak ada data penunjukan</div>
                  <div className="text-xs text-alita-gray-300 mt-1">Coba ubah filter atau assign partner baru</div>
                </td></tr>
              ) : (
                currentItems.map((dt) => (
                  <tr 
                    key={dt.id} 
                    className={`hover:bg-orange-50/30 transition-all duration-200 table-row-hover ${dt.id === highlightId ? 'row-highlight' : ''}`}
                  >
                    <td className="px-6 py-5 text-sm font-bold text-alita-gray-400">#{dt.displayId}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight mb-1">{dt.request?.sowPekerjaan?.substring(0, 40)}...</div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">{dt.request?.provinsi}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight mb-1">
                        {dt.companyName || dt.partner?.companyName || "No Company"}
                      </div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">
                         PIC: {dt.partner?.name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const status = getWorstCaseStatus(dt);
                        return (
                          <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                            status === 'CANCELED'
                              ? 'bg-red-50 text-red-600 border-red-100'
                              : status === 'SOURCING' 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : status === 'COMPLETED'
                                  ? 'bg-green-50 text-green-700 border-green-100'
                                  : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {status?.replace(/_/g, ' ')}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        {dt.torFilePath ? (
                          <a href={dt.torFilePath} target="_blank" className="text-[11px] font-bold text-alita-orange flex items-center gap-1.5 hover:brightness-110">
                            <span>📄 TOR</span>
                            <span className="text-[9px]">↗️</span>
                          </a>
                        ) : <span className="text-[10px] font-black text-alita-gray-300 uppercase tracking-tighter">No TOR</span>}
                        {dt.bakFilePath ? (
                          <a href={dt.bakFilePath} target="_blank" className="text-[11px] font-bold text-alita-orange flex items-center gap-1.5 hover:brightness-110">
                            <span>📄 BAK</span>
                            <span className="text-[9px]">↗️</span>
                          </a>
                        ) : <span className="text-[10px] font-black text-alita-gray-300 uppercase tracking-tighter">No BAK</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[10px] font-bold text-alita-gray-401">
                        {mounted && dt.createdAt ? new Date(dt.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : ""}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPartner && getWorstCaseStatus(dt) === 'SOURCING' && (
                          <div className="flex items-center gap-1">
                            <button 
                              className="px-3 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm active:scale-95 whitespace-nowrap flex items-center gap-1.5" 
                              onClick={() => setSelectedAssignment(dt)}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              MANAGE TEAMS
                            </button>
                          </div>
                        )}
                        {((isPartner && getWorstCaseStatus(dt) !== 'SOURCING') || (!isPartner)) && getWorstCaseStatus(dt) !== 'CANCELED' && (
                          <div className="flex items-center gap-1">
                            <button 
                              className="px-3 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm active:scale-95 whitespace-nowrap flex items-center gap-1.5" 
                              onClick={() => setSelectedAssignment(dt)}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                              VIEW DETAILS
                            </button>
                          </div>
                        )}
                        {getWorstCaseStatus(dt) === 'CANCELED' && (
                          <button 
                            className="px-3 py-1.5 bg-alita-gray-100 border border-alita-gray-200 rounded text-[11px] font-bold text-alita-gray-400 cursor-not-allowed whitespace-nowrap" 
                            onClick={() => setSelectedAssignment(dt)}
                          >
                            VIEW (LOCKED)
                          </button>
                        )}
                        {isProcurement && getWorstCaseStatus(dt) !== 'CANCELED' && (
                          <>
                            <button 
                              className="px-3 py-1.5 bg-alita-white border border-alita-orange/30 text-alita-orange rounded-lg text-[11px] font-bold hover:bg-orange-50 transition-all shadow-sm active:scale-95 whitespace-nowrap flex items-center gap-1.5" 
                              onClick={() => handleEditDocs(dt)}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              EDIT DOCS
                            </button>
                            {dt.teams?.every((t: any) => t.status === 'SOURCING') && (
                              <button 
                                className="px-3 py-1.5 bg-alita-white border border-red-200 text-red-600 rounded text-[11px] font-bold hover:bg-red-50 transition-all shadow-sm active:scale-95 whitespace-nowrap" 
                                onClick={() => handleCancelAssignment(dt)}
                              >
                                CANCEL
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredDataTeams.length > 0 && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{indexOfFirstItem + 1}</span> to <span className="text-alita-black">{Math.min(indexOfLastItem, filteredDataTeams.length)}</span> of <span className="text-alita-black">{filteredDataTeams.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-alita-gray-200 bg-alita-white text-alita-gray-500 hover:bg-alita-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-black transition-all ${
                      currentPage === i + 1 
                        ? 'bg-alita-black text-alita-white' 
                        : 'bg-alita-white border border-alita-gray-200 text-alita-gray-400 hover:border-alita-black hover:text-alita-black'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-alita-gray-200 bg-alita-white text-alita-gray-500 hover:bg-alita-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <AssignPartnerModal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        onSuccess={fetchDataTeams}
      />

      {/* Edit Docs Modal */}
      <Modal isOpen={isEditDocsModalOpen} onClose={() => setIsEditDocsModalOpen(false)} title="Update Dokumen Penunjukan (TOR & BAK)">
        <form onSubmit={submitEditDocs} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-alita-gray-500">Update TOR (PDF)</label>
              <input 
                type="file" 
                accept="application/pdf"
                className="w-full text-xs"
                onChange={e => setEditFiles({...editFiles, tor: e.target.files ? e.target.files[0] : null})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase text-alita-gray-500">Update BAK (PDF)</label>
              <input 
                type="file" 
                accept="application/pdf"
                className="w-full text-xs"
                onChange={e => setEditFiles({...editFiles, bak: e.target.files ? e.target.files[0] : null})}
              />
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full py-4 bg-alita-orange text-alita-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            disabled={isEditSubmitting}
          >
            {isEditSubmitting ? "Uploading..." : "Simpan Perubahan Dokumen"}
          </button>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} title="Batalkan Penugasan Partner">
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
               <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-1">Apakah Anda yakin ingin membatalkan penugasan ini?</h3>
              <p className="text-xs text-red-600 leading-relaxed font-medium">
                Tindakan ini akan menghentikan seluruh proses untuk partner ini pada Request terkait. 
                Data tim dan anggota akan terkunci dan kuota Request utama akan dikembalikan.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              className="flex-1 py-4 bg-alita-gray-100 text-alita-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-alita-gray-200 transition-all"
              onClick={() => setIsCancelConfirmOpen(false)}
            >
              Tidak, Kembali
            </button>
            <button 
              className="flex-3 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-red-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 px-10"
              onClick={executeCancelAssignment}
              disabled={isCancelSubmitting}
            >
              {isCancelSubmitting ? "Processing..." : "Ya, Batalkan Penugasan"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default function DataTeamPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-alita-gray-400">Loading Page...</div>}>
      <DataTeamContent />
    </Suspense>
  );
}
