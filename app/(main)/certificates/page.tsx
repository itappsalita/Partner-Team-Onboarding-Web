"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import TeamManagement from "@/components/TeamManagement";

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

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black text-alita-orange animate-pulse">MEMUAT DATA SERTIFIKAT...</div>}>
      <CertificatesContent />
    </Suspense>
  );
}

function CertificatesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get("highlight");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [searchSow, setSearchSow] = useState("");
  const [searchPartner, setSearchPartner] = useState("");
  const [filterProvinsi, setFilterProvinsi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [form, setForm] = useState({
    alitaExtEmail: "",
    alitaEmailPassword: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/certificates/pending");
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      }
    } catch (err) {
      console.error("Fetch pending error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchSow, searchPartner, filterProvinsi, activeTab]);

  // AUTO-TAB SWITCHING & HIGHLIGHT LOGIC
  useEffect(() => {
    if (highlightId && data.length > 0 && mounted) {
      const target = data.find(item => item.id === highlightId);
      if (target) {
        // 1. Switch to correct tab
        const isCompleted = target.status === 'COMPLETED';
        if (isCompleted) setActiveTab('published');
        else setActiveTab('pending');

        // 2. Scroll into view with a small delay for tab switching/rendering
        setTimeout(() => {
          const rowElement = document.querySelector('.row-highlight');
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Clean URL after focus
            router.replace('/certificates', { scroll: false });
          }
        }, 800);
      }
    }
  }, [highlightId, data, mounted, router]);

  const handleOpenIssuance = (assignment: any, member: any) => {
    setSelectedAssignment(assignment);
    setSelectedMember(member);
    setForm({
      alitaExtEmail: member.alitaExtEmail || "",
      alitaEmailPassword: member.alitaEmailPassword || "",
    });
    setIsIssuanceModalOpen(true);
  };
  
  const handleOpenTeamDetail = (item: any) => {
    setSelectedTask(item);
    setIsTeamManagementOpen(true);
  };

  const handleSubmitIssuance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/certificates/issue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          alitaExtEmail: form.alitaExtEmail,
          alitaEmailPassword: form.alitaEmailPassword
        })
      });

      if (res.ok) {
        setIsIssuanceModalOpen(false);
        fetchData();
        alert("✅ Certificate & Credentials issued successfully!");
      } else {
        const err = await res.json();
        alert("❌ " + (err.error || "Gagal menyimpan data"));
      }
    } catch (err) {
      alert("❌ Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter(assignment => {
    // 1. Tab Filtering
    const isCompleted = assignment.status === 'COMPLETED';
    if (activeTab === 'pending' && isCompleted) return false;
    if (activeTab === 'published' && !isCompleted) return false;

    // 2. Search SOW
    if (searchSow && !assignment.dataTeamPartner?.request?.sowPekerjaan?.toLowerCase().includes(searchSow.toLowerCase())) return false;

    // 3. Search Partner
    if (searchPartner && !assignment.dataTeamPartner?.partner?.name?.toLowerCase().includes(searchPartner.toLowerCase())) return false;

    // 4. Filter Provinsi
    if (filterProvinsi && assignment.dataTeamPartner?.request?.provinsi !== filterProvinsi) return false;

    return true;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const pendingCount = data.filter(a => a.status !== 'COMPLETED').length;
  const publishedCount = data.filter(a => a.status === 'COMPLETED').length;

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">Publish Certificate & Email Ext</h1>
        <p className="text-alita-gray-500 text-sm font-medium">Kelola penerbitan sertifikat dan akses email Alita untuk tim yang sudah lulus training.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-alita-gray-50 p-1.5 rounded-2xl w-fit border border-alita-gray-100 shadow-inner">
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'pending' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Antrean Penerbitan
          <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'pending' ? 'bg-alita-orange text-alita-white' : 'bg-alita-gray-200 text-alita-gray-500'}`}>
            {pendingCount}
          </span>
        </button>
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'published' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setActiveTab('published')}
        >
          Sudah Diterbitkan
          <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'published' ? 'bg-green-600 text-alita-white' : 'bg-green-50 text-green-600'}`}>
            {publishedCount}
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Perusahaan / PIC Partner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Assignment</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Personnel Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Last Training</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-36" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-16" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-6 w-24" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                  <div className="text-sm font-bold text-alita-gray-400">Tidak ada data sertifikat</div>
                  <div className="text-xs text-alita-gray-300 mt-1">Coba ubah filter untuk melihat data lain</div>
                </td></tr>
              ) : (
                currentItems.map((assignment) => {
                  const trainedMembers = assignment.members || [];
                  const certifiedCount = trainedMembers.filter((m: any) => m.certificateFilePath && m.alitaExtEmail).length;
                  
                  return (
                    <tr 
                      key={assignment.id} 
                      className={`hover:bg-orange-50/30 transition-all duration-200 table-row-hover ${
                        highlightId === assignment.id ? 'row-highlight' : ''
                      }`}
                    >
                      <td className={`px-6 py-5 text-sm font-bold text-alita-gray-400 ${highlightId === assignment.id ? 'animate-active-row' : ''}`}>
                        <div className="mb-2">#{assignment.displayId}</div>
                        <button 
                          className="px-2 py-1 bg-alita-gray-50 border border-alita-gray-200 rounded-lg text-alita-orange hover:bg-alita-orange hover:text-alita-white transition-all shadow-sm active:scale-95 group flex items-center gap-1.5" 
                          onClick={() => handleOpenTeamDetail(assignment)}
                          title="Lihat Detail Tim & Sertifikat Secara Menyeluruh"
                        >
                          <svg className="w-3 h-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                          <span className="text-[9px] font-black uppercase tracking-widest">TEAM</span>
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-alita-black tracking-tight mb-1">
                          {assignment.dataTeamPartner?.companyName || "No Company"}
                        </div>
                        <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">
                          PIC: {assignment.dataTeamPartner?.partner?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-alita-black tracking-tight mb-1">{assignment.dataTeamPartner?.request?.sowPekerjaan.substring(0, 40)}...</div>
                        <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">{assignment.dataTeamPartner?.request?.provinsi}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-alita-orange leading-none">{certifiedCount}</span>
                          <span className="text-xs font-bold text-alita-gray-300">/</span>
                          <span className="text-lg font-black text-alita-black/20 leading-none">{trainedMembers.length}</span>
                          <span className="px-2 py-0.5 bg-alita-gray-50 border border-alita-gray-200 rounded-full text-[8px] font-black text-alita-gray-400 uppercase tracking-widest ml-2 shadow-sm">CERTIFIED</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-alita-black">
                          {mounted && assignment.trainingProcess?.trainingDate 
                            ? new Date(assignment.trainingProcess.trainingDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-5 min-w-[280px]">
                        <div className="flex flex-col gap-2">
                          {trainedMembers.map((m: any) => (
                             <div key={m.id} className="bg-alita-gray-50/50 flex items-center justify-between px-3 py-2 rounded-xl border border-alita-gray-100 group transition-all">
                               <div className="flex flex-col">
                                 <span className="text-[11px] font-bold text-alita-black leading-none">{m.name}</span>
                                 <span className="text-[8px] font-black text-alita-gray-400 tracking-widest uppercase mt-0.5">{m.position}</span>
                               </div>
                               {m.certificateFilePath || m.alitaExtEmail ? (
                                 <button 
                                   className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[8px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1.5 hover:bg-green-100 transition-all active:scale-95"
                                   onClick={() => handleOpenIssuance(assignment, m)}
                                   title="Klik untuk ubah email / password"
                                 >
                                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                   ACTIVE / EDIT ACCESS
                                 </button>
                               ) : (
                                 <button 
                                   className="px-3 py-1.5 text-[9px] font-black tracking-widest uppercase rounded-lg shadow-sm active:scale-95 transition-all border bg-alita-black text-alita-white border-alita-black hover:bg-alita-gray-800 flex items-center gap-2"
                                   onClick={() => handleOpenIssuance(assignment, m)}
                                 >
                                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"></path></svg>
                                   ISSUE ACCESS
                                 </button>
                               )}
                             </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredData.length > 0 && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{indexOfFirstItem + 1}</span> to <span className="text-alita-black">{Math.min(indexOfLastItem, filteredData.length)}</span> of <span className="text-alita-black">{filteredData.length}</span> results
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

      {/* Issuance Modal */}
      <Modal 
        isOpen={isIssuanceModalOpen} 
        onClose={() => setIsIssuanceModalOpen(false)} 
        title={`Penerbitan Akses: ${selectedMember?.name}`}
      >
        <form onSubmit={handleSubmitIssuance} className="space-y-6">
          <div className="bg-alita-gray-50/80 p-4 rounded-2xl border border-alita-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-alita-gray-400 mb-1">Project Assignment ({selectedAssignment?.displayId})</h3>
            <p className="text-sm font-bold text-alita-black leading-tight">{selectedAssignment?.dataTeamPartner?.request?.sowPekerjaan}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Alita External Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
              value={form.alitaExtEmail}
              onChange={e => setForm({...form, alitaExtEmail: e.target.value})}
              required
              placeholder="example.ext@alita.id"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Initial Password</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
              value={form.alitaEmailPassword}
              onChange={e => setForm({...form, alitaEmailPassword: e.target.value})}
              required
              placeholder="Initial password for external email..."
            />
          </div>

          <div className="p-4 border-2 border-dashed border-alita-gray-100 rounded-2xl bg-alita-gray-50/30 flex items-center justify-center text-center">
            <p className="text-[11px] font-bold text-alita-gray-500 tracking-tight">
              {selectedMember?.certificateFilePath ? (
                <>✅ <span className="text-green-600 uppercase tracking-widest">Certificate Exists</span>. Editing will only update email/password credentials.</>
              ) : (
                <>📄 <span className="text-alita-black uppercase tracking-widest">Digital Certificate</span> akan digenerate otomatis menggunakan template resmi Alita.</>
              )}
            </p>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50" 
            disabled={submitting}
          >
            {submitting 
              ? "Processing..." 
              : (selectedMember?.certificateFilePath ? "Update Credentials Only" : "Generate & Publish Credentials")
            }
          </button>
        </form>
      </Modal>

      {/* Team Detail Modal (Read-Only) */}
      {isTeamManagementOpen && selectedTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-alita-black/60 backdrop-blur-sm" onClick={() => setIsTeamManagementOpen(false)}></div>
          <div className="relative w-full max-w-7xl z-10 animate-in fade-in zoom-in duration-300">
            <TeamManagement 
               assignment={selectedTask.dataTeamPartner} 
               onClose={() => setIsTeamManagementOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
