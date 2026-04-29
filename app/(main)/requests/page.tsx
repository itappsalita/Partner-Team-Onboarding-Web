"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "../../../components/Modal";

const PROVINSI_INDONESIA = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", 
  "Sumatera Selatan", "Kepulauan Bangka Belitung", "Bengkulu", "Lampung", 
  "DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", 
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", 
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", 
  "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara", 
  "Maluku", "Maluku Utara", "Papua Barat", "Papua", "Papua Tengah", "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya"
];

const SORTED_PROVINSI_INDONESIA = [...PROVINSI_INDONESIA].sort((a, b) => a.localeCompare(b, "id"));

export default function RequestsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isPmo = userRole === "PMO_OPS" || userRole === "SUPERADMIN";

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [searchSow, setSearchSow] = useState("");
  const [searchPmo, setSearchPmo] = useState("");
  const [filterProvinsi, setFilterProvinsi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [formData, setFormData] = useState({
    deskripsi: "",
    sowPekerjaan: "",
    provinsi: "",
    area: "",
    jumlahKebutuhan: "",
    membersPerTeam: "3", // Default to 3
    siteId: "",
    dueDate: ""
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/requests");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRequests();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchSow, searchPmo, filterProvinsi, activeTab]);

  const handleCancel = async (id: string, displayId: string) => {
    if (!confirm(`Yakin ingin membatalkan request ${displayId}? Tindakan ini tidak dapat diurungkan.`)) return;
    try {
      const res = await fetch(`/api/requests/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal membatalkan request.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({deskripsi: "", sowPekerjaan: "", provinsi: "", area: "", jumlahKebutuhan: "", membersPerTeam: "3", siteId: "", dueDate: "" });
        fetchRequests();
      } else {
        const error = await res.json();
        alert(error.error || "Gagal membuat request");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "REQUESTED": return "bg-blue-50 text-blue-700 border-blue-100";
      case "SOURCING": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "ON_TRAINING": return "bg-purple-50 text-purple-700 border-purple-100";
      case "TRAINED": return "bg-green-50 text-green-700 border-green-100";
      case "COMPLETED": return "bg-alita-black text-alita-white border-alita-black shadow-sm";
      case "CANCELED": return "bg-red-50 text-red-500 border-red-100";
      default: return "bg-alita-gray-100 text-alita-gray-600 border-alita-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "REQUESTED": return "Requested";
      case "SOURCING": return "Sourcing";
      case "ON_TRAINING": return "Validated & On Training";
      case "TRAINED": return "Verified & Trained";
      case "COMPLETED": return "Certified & Completed";
      case "CANCELED": return "Canceled";
      default: return status;
    }
  };

  const filteredRequests = requests.filter(req => {
    // 1. Tab Filtering
    const isCompleted = req.status === 'COMPLETED';
    if (activeTab === 'ongoing' && isCompleted) return false;
    if (activeTab === 'completed' && !isCompleted) return false;

    // 2. Search SOW
    if (searchSow && !req.sowPekerjaan.toLowerCase().includes(searchSow.toLowerCase())) return false;

    // 3. Search PMO
    if (searchPmo && !req.pmo?.name.toLowerCase().includes(searchPmo.toLowerCase())) return false;

    // 4. Filter Provinsi
    if (filterProvinsi && req.provinsi !== filterProvinsi) return false;

    return true;
  });

  const ongoingCount = requests.filter(r => r.status !== 'COMPLETED').length;
  const completedCount = requests.filter(r => r.status === 'COMPLETED').length;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">Request for Partner</h1>
          <p className="text-alita-gray-500 text-sm font-medium">Kelola permintaan kebutuhan tim dari Operation ke Procurement.</p>
        </div>
        {isPmo && (
          <button 
            className="bg-alita-black text-alita-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-alita-gray-800 active:scale-95 transition-all whitespace-nowrap" 
            onClick={() => setIsModalOpen(true)}
          >
            + Create New Request
          </button>
        )}
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
              placeholder="Filter Nama PMO..." 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
              value={searchPmo}
              onChange={(e) => setSearchPmo(e.target.value)}
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div className="relative group">
            <select
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm appearance-none"
              value={filterProvinsi}
              onChange={(e) => setFilterProvinsi(e.target.value)}
            >
              <option value="">Semua Provinsi</option>
              {SORTED_PROVINSI_INDONESIA.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>

        {(searchSow || searchPmo || filterProvinsi) && (
          <button 
            onClick={() => {
              setSearchSow("");
              setSearchPmo("");
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
          <table className="w-full min-w-[1320px] text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-alita-gray-50">
              <tr className="border-b border-alita-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Nomor</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">SOW Pekerjaan</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Deskripsi</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Lokasi</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400 text-center">Quota</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400 text-center">Fulfillment</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">PMO Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Created At</th>
                {isPmo && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-40" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-44" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-10 mx-auto" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-10 mx-auto" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-20" /></td>
                    {isPmo && <td className="px-6 py-5" />}
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={isPmo ? 11 : 10} className="px-6 py-16 text-center">
                  <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div className="text-sm font-bold text-alita-gray-400">Tidak ada data request</div>
                  <div className="text-xs text-alita-gray-300 mt-1">Coba ubah filter atau buat request baru</div>
                </td></tr>
              ) : (
                currentItems.map((req) => (
                  <tr key={req.id} className="hover:bg-orange-50/30 transition-all duration-200 table-row-hover">
                    <td className="px-6 py-5 text-sm font-bold text-alita-gray-400 leading-none">#{req.displayId}</td>
                    <td className="px-6 py-5">
                      <div 
                        className="text-sm font-bold text-alita-black tracking-tight max-w-[200px] truncate" 
                        title={req.sowPekerjaan}
                      >
                        {req.sowPekerjaan}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div
                        className="text-sm font-bold text-alita-gray-600 tracking-tight max-w-[240px] truncate"
                        title={req.deskripsi}
                      >
                        {req.deskripsi || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black leading-none mb-1">{req.provinsi}</div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">
                        {req.area} {req.siteId ? `• ${req.siteId}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="text-lg font-black text-alita-black leading-none">{req.jumlahKebutuhan}</div>
                      <div className="text-[9px] font-bold text-alita-gray-400 uppercase tracking-tighter mt-0.5">TEAM</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`text-lg font-black leading-none ${req.totalRegisteredTeams > 0 ? "text-alita-orange" : "text-alita-gray-300"}`}>
                        {req.totalRegisteredTeams || 0}
                      </div>
                      <div className="text-[9px] font-bold text-alita-gray-400 uppercase tracking-tighter mt-0.5">FULFILLED</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight">{req.pmo?.name || "N/A"}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${getStatusClasses(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[10px] font-bold text-alita-gray-401 whitespace-nowrap">
                        {mounted && req.dueDate ? new Date(req.dueDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[10px] font-bold text-alita-gray-401 whitespace-nowrap">
                        {mounted ? new Date(req.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : ""}
                      </div>
                    </td>
                    {isPmo && (
                      <td className="px-6 py-5">
                        {req.status === "REQUESTED" && (
                          <button
                            onClick={() => handleCancel(req.id, req.displayId)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 hover:text-red-600 transition-all whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredRequests.length > 0 && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{indexOfFirstItem + 1}</span> to <span className="text-alita-black">{Math.min(indexOfLastItem, filteredRequests.length)}</span> of <span className="text-alita-black">{filteredRequests.length}</span> results
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Partner Request"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">SOW Pekerjaan</label>
            <select
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
              value={formData.sowPekerjaan}
              onChange={(e) => setFormData({...formData, sowPekerjaan: e.target.value})}
              required
            >
              <option value="">Pilih SOW Pekerjaan</option>
              <option value="Dismantle">Dismantle</option>
              <option value="Newlink">Newlink</option>
              <option value="Reroute">Reroute</option>
              <option value="Swap upgrade">Swap upgrade</option>
              <option value="Rewiring">Rewiring</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Deskripsi</label>
            <textarea 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
              rows={3}
              placeholder="Jelaskan ruang lingkup pekerjaan..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Provinsi</label>
              <select 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white transition-all shadow-sm"
                value={formData.provinsi}
                onChange={(e) => setFormData({...formData, provinsi: e.target.value})}
                required
              >
                <option value="">Pilih Provinsi</option>
                {SORTED_PROVINSI_INDONESIA.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Area / Kota</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
                placeholder="Misal: Jakarta Selatan"
                value={formData.area}
                onChange={(e) => setFormData({...formData, area: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Jumlah Kebutuhan Team</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
                placeholder="Min. 1"
                min="1"
                value={formData.jumlahKebutuhan}
                onChange={(e) => setFormData({...formData, jumlahKebutuhan: e.target.value})}
                required
              />
              <p className="text-[10px] font-medium text-alita-gray-400 mt-0.5 italic">* 1 team minimal terdiri dari 3 orang.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Anggota per Tim</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
                placeholder="Misal: 3"
                min="1"
                value={formData.membersPerTeam}
                onChange={(e) => setFormData({...formData, membersPerTeam: e.target.value})}
                required
              />
              <p className="text-[10px] font-medium text-alita-gray-400 mt-0.5 italic">* Jumlah personil per 1 tim.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Project ID (Opsional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
                placeholder="Masukkan Project ID"
                value={formData.siteId}
                onChange={(e) => setFormData({...formData, siteId: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Due Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full mt-4 py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Memproses..." : "Submit New Request"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
