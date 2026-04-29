"use client";

import { useState, useEffect, useCallback } from "react";
import TeamManagement from "../../../components/TeamManagement";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterCertified, setFilterCertified] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
    } catch {
      console.error("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchMembers(), 300);
    return () => clearTimeout(timeout);
  }, [fetchMembers]);

  useEffect(() => { setCurrentPage(1); }, [search, filterPosition, filterCertified]);

  const handleOpenTeam = async (dataTeamPartnerId: string) => {
    if (!dataTeamPartnerId) return;
    setLoadingAssignment(true);
    try {
      const res = await fetch("/api/data-team");
      const data = await res.json();
      if (Array.isArray(data)) {
        const assignment = data.find((a: any) => a.id === dataTeamPartnerId);
        if (assignment) setSelectedAssignment(assignment);
      }
    } catch {
      console.error("Failed to fetch assignment");
    } finally {
      setLoadingAssignment(false);
    }
  };

  const filtered = members.filter(m => {
    if (filterPosition && m.position !== filterPosition) return false;
    if (filterCertified === "yes" && !m.certificateFilePath) return false;
    if (filterCertified === "no" && m.certificateFilePath) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const current = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">Database Anggota</h1>
          <p className="text-alita-gray-500 text-sm font-medium">Direktori seluruh anggota tim yang sudah terdaftar.</p>
        </div>
        <div className="text-xs font-black text-alita-gray-400 bg-alita-gray-50 border border-alita-gray-100 px-4 py-2 rounded-xl">
          Total: <span className="text-alita-black">{filtered.length}</span> anggota
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative group col-span-1 md:col-span-1">
          <input
            type="text"
            placeholder="Cari nama, NIK, no. HP..."
            className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>

        {/* Filter Posisi */}
        <div className="relative group">
          <select
            className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange transition-all shadow-sm appearance-none"
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
          >
            <option value="">Semua Posisi</option>
            {["Leader", "Technician", "Helper", "Driver"].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>

        {/* Filter Sertifikat */}
        <div className="relative group">
          <select
            className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange transition-all shadow-sm appearance-none"
            value={filterCertified}
            onChange={e => setFilterCertified(e.target.value)}
          >
            <option value="">Semua Status Sertifikat</option>
            <option value="yes">Sudah Bersertifikat</option>
            <option value="no">Belum Bersertifikat</option>
          </select>
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        </div>
      </div>

      {/* Table */}
      <div className="bg-alita-white rounded-2xl shadow-sm border border-alita-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-alita-gray-50">
              <tr className="border-b border-alita-gray-100">
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">#</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Foto</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Nama & NIK</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Posisi</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">No. HP</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">No. Tim</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">No. Assignment</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Tim / SOW</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Training</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Sertifikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : current.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <div className="text-sm font-bold text-alita-gray-400">Tidak ada anggota ditemukan</div>
                    <div className="text-xs text-alita-gray-300 mt-1">Coba ubah kata kunci pencarian</div>
                  </td>
                </tr>
              ) : (
                current.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-orange-50/30 transition-all duration-200">
                    <td className="px-5 py-4 text-xs font-black text-alita-gray-400">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-alita-gray-200 bg-alita-gray-100 shadow-sm">
                        {m.selfieFilePath ? (
                          <img
                            src={m.selfieFilePath}
                            alt={m.name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => window.open(m.selfieFilePath, '_blank')}
                            title="Klik untuk memperbesar"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-alita-gray-300 uppercase">N/A</div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <button
                          onClick={() => handleOpenTeam(m.team?.dataTeamPartnerId)}
                          className="text-sm font-bold text-alita-black tracking-tight hover:text-alita-orange hover:underline transition-colors text-left"
                          title="Klik untuk lihat detail tim"
                        >
                          {loadingAssignment ? "..." : m.name}
                        </button>
                        {m.isReturning === 1 && (
                          <span title="Returning Personnel" className="w-4 h-4 flex items-center justify-center bg-orange-50 border border-orange-100 rounded-full text-alita-orange shrink-0">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l-4-4l-1 1l-4-4l11-13l11 13l-4 4l-1-1l-4 4l-2-5Z"/></svg>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider">NIK: {m.nik}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-alita-gray-50 border border-alita-gray-100 rounded-full text-[9px] font-black uppercase tracking-wider text-alita-gray-500 whitespace-nowrap">
                        {m.position || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-alita-black">{m.phone || "-"}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-alita-gray-50 border border-alita-gray-100 rounded-lg text-[10px] font-black text-alita-black whitespace-nowrap">
                        #{m.team?.displayId || `Tim ${m.team?.teamNumber || "-"}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-alita-gray-50 border border-alita-gray-100 rounded-lg text-[10px] font-black text-alita-black whitespace-nowrap">
                        {m.team?.dataTeamPartner?.displayId || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold text-alita-black leading-tight mb-0.5 max-w-[180px] truncate" title={m.team?.dataTeamPartner?.request?.sowPekerjaan}>
                        {m.team?.dataTeamPartner?.request?.sowPekerjaan || "-"}
                      </div>
                      <div className="text-[10px] font-black text-alita-gray-400 uppercase tracking-wider">
                        {m.team?.dataTeamPartner?.request?.provinsi || ""}{m.team?.dataTeamPartner?.request?.area ? ` • ${m.team.dataTeamPartner.request.area}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap ${
                        m.isAttendedTraining === 1
                          ? 'bg-green-50 border-green-100 text-green-700'
                          : 'bg-red-50 border-red-100 text-red-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.isAttendedTraining === 1 ? 'bg-green-600' : 'bg-red-400'}`} />
                        {m.isAttendedTraining === 1 ? "Trained" : "Untrained"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {m.certificateFilePath ? (
                        <a
                          href={m.certificateFilePath}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-100 rounded-lg text-[10px] font-black text-alita-orange hover:bg-alita-orange hover:text-alita-white transition-all"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Lihat
                        </a>
                      ) : (
                        <span className="text-[9px] font-black text-alita-gray-300 uppercase tracking-widest italic">Belum</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > itemsPerPage && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-alita-black">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-alita-black">{filtered.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
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
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-alita-gray-200 bg-alita-white text-alita-gray-500 hover:bg-alita-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TeamManagement Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-alita-black/60 backdrop-blur-sm" onClick={() => setSelectedAssignment(null)} />
          <div className="relative w-full max-w-7xl z-10 animate-in fade-in zoom-in duration-300">
            <TeamManagement
              assignment={selectedAssignment}
              onClose={() => setSelectedAssignment(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
