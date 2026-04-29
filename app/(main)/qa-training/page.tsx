"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Modal from "../../../components/Modal";
import TeamManagement from "../../../components/TeamManagement";

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

export default function QaTrainingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black text-alita-orange animate-pulse">MEMUAT DASHBOARD QA...</div>}>
      <QaTrainingContent />
    </Suspense>
  );
}

function QaTrainingContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get("highlight");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ongoing' | 'done'>('ongoing');
  
  // Advanced Filters
  const [searchSow, setSearchSow] = useState("");
  const [searchPartner, setSearchPartner] = useState("");
  const [filterProvinsi, setFilterProvinsi] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Forms
  const [submitting, setSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ trainingDate: "" });
  const [evaluationForm, setEvaluationForm] = useState({
    attendedMemberIds: [] as string[],
    memberScores: {} as Record<string, string>,
    result: "PENDING",
    whatsappGroupJustification: "",
    evaluationNotes: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/qa-training/schedule");
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      }
    } catch (error) {
      console.error("Fetch training error:", error);
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
  }, [searchSow, searchPartner, filterProvinsi, filter]);

  // AUTO-TAB SWITCHING & HIGHLIGHT LOGIC
  useEffect(() => {
    if (highlightId && data.length > 0 && mounted) {
      const target = data.find(item => item.id === highlightId || item.dataTeamPartnerId === highlightId);
      if (target) {
        // 1. Switch to correct tab
        const isDone = target.status === 'TRAINING_EVALUATED' || target.status === 'COMPLETED';
        if (isDone) setFilter('done');
        else setFilter('ongoing');

        // 2. Scroll into view with a small delay for tab switching/rendering
        setTimeout(() => {
          const rowElement = document.querySelector('.row-highlight');
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Clean URL after focus
            router.replace('/qa-training', { scroll: false });
          }
        }, 800);
      }
    }
  }, [highlightId, data, mounted, router]);

  const handleOpenSchedule = (item: any) => {
    setSelectedTask(item);
    setScheduleForm({ 
      trainingDate: item.trainingProcess?.trainingDate 
        ? new Date(item.trainingProcess.trainingDate).toISOString().slice(0, 16) 
        : "" 
    });
    setIsScheduleModalOpen(true);
  };

  const handleOpenEvaluation = (item: any) => {
    setSelectedTask(item);
    // Preset attended members if already evaluated before
    const attended = item.members?.filter((m: any) => m.isAttendedTraining === 1).map((m: any) => m.id) || [];

    // Preset existing scores
    const scores: Record<string, string> = {};
    item.members?.filter((m: any) => m.isReturning === 0).forEach((m: any) => {
      scores[m.id] = m.score !== null && m.score !== undefined ? String(m.score) : "";
    });

    setEvaluationForm({
      attendedMemberIds: attended,
      memberScores: scores,
      result: item.trainingProcess?.result || "PENDING",
      whatsappGroupJustification: item.trainingProcess?.whatsappGroupJustification || "",
      evaluationNotes: item.trainingProcess?.evaluationNotes || ""
    });
    setIsEvaluationModalOpen(true);
  };
  
  const handleOpenTeamDetail = (item: any) => {
    setSelectedTask(item);
    setIsTeamManagementOpen(true);
  };

  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/qa-training/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTask.id,
          trainingDate: scheduleForm.trainingDate
        })
      });
      if (res.ok) {
        setIsScheduleModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan jadwal");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (evaluationForm.result === "PENDING") {
      alert("Pilih hasil training (Lulus/Tidak Lulus)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/qa-training/evaluation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTask.id,
          ...evaluationForm,
          memberScores: evaluationForm.memberScores
        })
      });
      if (res.ok) {
        setIsEvaluationModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan evaluasi");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMemberAttendance = (id: string) => {
    setEvaluationForm(prev => {
      const isAttended = prev.attendedMemberIds.includes(id);
      return {
        ...prev,
        attendedMemberIds: isAttended 
          ? prev.attendedMemberIds.filter(mid => mid !== id)
          : [...prev.attendedMemberIds, id]
      };
    });
  };

  const filteredData = data.filter(item => {
    if (!item || !item.status) return false;

    // 1. Tab Status Filtering
    const isDone = item.status === 'TRAINING_EVALUATED' || item.status === 'COMPLETED';
    if (filter === 'ongoing' && isDone) return false;
    if (filter === 'done' && !isDone) return false;

    // 2. Search SOW
    if (searchSow && !item.dataTeamPartner?.request?.sowPekerjaan?.toLowerCase().includes(searchSow.toLowerCase())) return false;

    // 3. Search Partner
    if (searchPartner && !item.dataTeamPartner?.partner?.name?.toLowerCase().includes(searchPartner.toLowerCase())) return false;

    // 4. Filter Provinsi
    if (filterProvinsi && item.dataTeamPartner?.request?.provinsi !== filterProvinsi) return false;

    return true;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const ongoingCount = data.filter(item => item.status !== 'TRAINING_EVALUATED' && item.status !== 'COMPLETED').length;
  const doneCount = data.filter(item => item.status === 'TRAINING_EVALUATED' || item.status === 'COMPLETED').length;

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">QA Training Dashboard</h1>
        <p className="text-alita-gray-500 text-sm font-medium">Kelola jadwal training dan evaluasi kelulusan tim partner.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-alita-gray-50 p-1.5 rounded-2xl w-fit border border-alita-gray-100 shadow-inner">
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            filter === 'ongoing' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setFilter('ongoing')}
        >
          Sedang Berjalan
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${filter === 'ongoing' ? 'bg-alita-orange text-alita-white' : 'bg-alita-gray-200 text-alita-gray-500'}`}>
            {ongoingCount}
          </span>
        </button>
        <button 
          className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
            filter === 'done' 
              ? 'bg-alita-white text-alita-black shadow-md' 
              : 'text-alita-gray-400 hover:text-alita-gray-600'
          }`}
          onClick={() => setFilter('done')}
        >
          Selesai (Evaluated)
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${filter === 'done' ? 'bg-green-600 text-alita-white' : 'bg-green-50 text-green-600'}`}>
            {doneCount}
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Perusahaan / PIC Partner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Assignment</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Jadwal Training</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Evaluator (QA)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-36" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-6 py-5 text-right"><div className="skeleton h-6 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <div className="text-sm font-bold text-alita-gray-400">{filter === 'ongoing' ? "Tidak ada training aktif" : "Belum ada evaluasi selesai"}</div>
                  <div className="text-xs text-alita-gray-300 mt-1">Coba ubah filter untuk melihat data lain</div>
                </td></tr>
              ) : (
                currentItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-orange-50/30 transition-all duration-200 table-row-hover ${
                      (highlightId === item.id || highlightId === item.dataTeamPartnerId) ? 'row-highlight' : ''
                    }`}
                  >
                    <td className={`px-6 py-5 ${(highlightId === item.id || highlightId === item.dataTeamPartnerId) ? 'animate-active-row' : ''}`}>
                      <div className="text-sm font-bold text-alita-gray-400 tracking-tight">
                        #{item.displayId}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight mb-0.5">
                        {item.dataTeamPartner?.companyName || "Partner"}
                      </div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">
                        PIC: {item.leaderName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight mb-0.5" title={item.dataTeamPartner?.request?.sowPekerjaan}>
                        {(item.dataTeamPartner?.request?.sowPekerjaan?.substring(0, 30) || "-")}...
                      </div>
                      <div className="text-[10px] font-black text-alita-gray-400 tracking-wider uppercase">{item.dataTeamPartner?.request?.provinsi || "-"}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                        item.trainingProcess?.result === 'LULUS' 
                          ? 'bg-green-50 text-green-700 border-green-100' 
                          : item.trainingProcess?.result === 'TIDAK_LULUS'
                            ? 'bg-red-50 text-red-600 border-red-100 shadow-sm'
                            : item.status === 'TRAINING_SCHEDULED' 
                              ? 'bg-green-50 text-green-700 border-green-100' 
                              : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {item.trainingProcess?.result ? `EVALUASI: ${item.trainingProcess.result}` : (item.status?.replace(/_/g, ' ') || 'UNKNOWN')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {mounted && item.trainingProcess?.trainingDate ? (
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-alita-black">
                            {new Date(item.trainingProcess.trainingDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] font-black text-alita-gray-400 uppercase tracking-widest mt-0.5">
                            {new Date(item.trainingProcess.trainingDate).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-alita-gray-300 uppercase tracking-tighter italic">Belum dijadwalkan</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-alita-black tracking-tight">
                      {item.trainingProcess?.qa?.name || "-"}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {item.status !== 'TRAINING_EVALUATED' && item.status !== 'COMPLETED' && (
                          <>
                            {(!item.trainingProcess?.trainingDate || (mounted && new Date() <= new Date(item.trainingProcess.trainingDate))) && (
                              <button 
                                className="px-3 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm active:scale-95 whitespace-nowrap flex items-center gap-2" 
                                onClick={() => handleOpenSchedule(item)}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                {item.trainingProcess?.trainingDate ? "RESCHEDULE" : "SET SCHEDULE"}
                              </button>
                            )}

                            <button 
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-2 ${
                                mounted && item.trainingProcess?.trainingDate && new Date() >= new Date(item.trainingProcess.trainingDate)
                                  ? 'bg-alita-black text-alita-white hover:bg-alita-gray-800'
                                  : 'bg-alita-gray-100 text-alita-gray-400 border border-alita-gray-200 cursor-not-allowed shadow-none'
                              }`} 
                              onClick={() => handleOpenEvaluation(item)}
                              disabled={!mounted || !item.trainingProcess?.trainingDate || new Date() < new Date(item.trainingProcess.trainingDate)}
                              title={!item.trainingProcess?.trainingDate ? "Set jadwal training terlebih dahulu" : "Evaluasi hanya dapat dilakukan setelah waktu training dimulai"}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                              <span>EVALUATION</span>
                              {!item.trainingProcess?.trainingDate && <span className="text-[10px]">🔒</span>}
                            </button>
                          </>
                        )}
                        {(item.status === 'TRAINING_EVALUATED' || item.status === 'COMPLETED') && (
                          <div className="flex flex-col gap-2">
                            <button 
                              className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-[10px] font-black text-green-600 hover:bg-green-600 hover:text-alita-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 group" 
                              onClick={() => handleOpenEvaluation(item)}
                            >
                              <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              VIEW SUMMARY
                            </button>
                            <button 
                              className="px-3 py-1.5 bg-alita-gray-50 border border-alita-gray-200 rounded-lg text-[10px] font-black text-alita-orange hover:bg-alita-orange hover:text-alita-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 group" 
                              onClick={() => handleOpenTeamDetail(item)}
                            >
                              <svg className="w-3 h-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                              VIEW TEAM DETAIL
                            </button>
                          </div>
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

      {/* Schedule Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Tentukan Jadwal Training">
        <form onSubmit={submitSchedule} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Tanggal & Waktu Training</label>
            <input 
              type="datetime-local" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
              value={scheduleForm.trainingDate} 
              onChange={e => setScheduleForm({ trainingDate: e.target.value })}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Simpan Jadwal Training"}
          </button>
        </form>
      </Modal>

      {/* Evaluation Modal */}
      <Modal isOpen={isEvaluationModalOpen} onClose={() => setIsEvaluationModalOpen(false)} title="Absensi & Hasil Training">
        <form onSubmit={submitEvaluation} className="space-y-6">
          <div className="bg-orange-50/30 border border-orange-100/50 p-4 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-alita-orange mb-3">Daftar Hadir Anggota Tim</h3>
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {selectedTask && (
                <div className="bg-alita-white/80 p-3 rounded-xl border border-alita-gray-100">
                  <div className="font-bold text-[11px] text-alita-black flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-alita-orange"></span>
                    TIM #{selectedTask.teamNumber} • Leader: {selectedTask.leaderName}
                  </div>
                  <div className="space-y-0.5">
                    {selectedTask.members?.filter((m: any) => m.isReturning === 0).map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 py-3 px-2 hover:bg-alita-gray-50 rounded-xl transition-all group border-b border-alita-gray-50/50 last:border-0">
                        <div className="relative flex items-center shrink-0">
                          <input 
                            type="checkbox" 
                            id={`member-${m.id}`}
                            className="w-5 h-5 rounded-md border-alita-gray-300 text-alita-orange focus:ring-alita-orange transition-all cursor-pointer disabled:opacity-50"
                            checked={evaluationForm.attendedMemberIds.includes(m.id)}
                            onChange={() => toggleMemberAttendance(m.id)}
                            disabled={selectedTask?.status === 'TRAINING_EVALUATED' || selectedTask?.status === 'COMPLETED'}
                          />
                        </div>

                        {/* Selfie Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-alita-gray-200 bg-alita-gray-100 shrink-0 shadow-sm group-hover:border-alita-orange transition-colors">
                          {m.selfieFilePath ? (
                            <img 
                              src={m.selfieFilePath} 
                              alt="Selfie" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onClick={() => window.open(m.selfieFilePath, '_blank')}
                              title="Klik untuk memperbesar"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-alita-gray-400 font-bold uppercase tracking-tighter italic">N/A</div>
                          )}
                        </div>

                        <label htmlFor={`member-${m.id}`} className="flex flex-col cursor-pointer flex-1">
                          <span className="text-xs font-bold text-alita-black tracking-tight group-hover:text-alita-orange transition-colors">{m.name}</span>
                          <span className="text-[9px] font-black uppercase text-alita-gray-400 tracking-wider leading-none mt-0.5">{m.position}</span>
                        </label>

                        {/* Input Nilai */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            value={evaluationForm.memberScores[m.id] ?? ""}
                            onChange={e => setEvaluationForm(prev => ({
                              ...prev,
                              memberScores: { ...prev.memberScores, [m.id]: e.target.value }
                            }))}
                            disabled={selectedTask?.status === 'TRAINING_EVALUATED' || selectedTask?.status === 'COMPLETED'}
                            className="w-16 px-2 py-1.5 text-center text-xs font-black bg-alita-gray-50 border border-alita-gray-200 rounded-lg focus:border-alita-orange focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          />
                          <span className="text-[9px] font-black text-alita-gray-400 uppercase">Nilai</span>
                        </div>
                      </div>
                    ))}
                    {selectedTask.members?.filter((m: any) => m.isReturning === 1).length > 0 && (
                      <div className="pt-2 mt-2 border-t border-alita-gray-100 italic text-[9px] text-alita-gray-400 font-medium">
                        * {selectedTask.members?.filter((m: any) => m.isReturning === 1).length} personil lama (certified) disembunyikan dari daftar absensi.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Hasil Training</label>
              <select 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white transition-all shadow-sm disabled:opacity-50"
                value={evaluationForm.result}
                onChange={e => setEvaluationForm({...evaluationForm, result: e.target.value})}
                disabled={selectedTask?.status === 'TRAINING_EVALUATED' || selectedTask?.status === 'COMPLETED'}
                required
              >
                <option value="PENDING">-- Pilih Hasil --</option>
                <option value="LULUS">LULUS</option>
                <option value="TIDAK_LULUS">TIDAK LULUS</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Justifikasi Grup WA</label>
              <input 
                type="text"
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all disabled:opacity-50"
                value={evaluationForm.whatsappGroupJustification}
                onChange={e => setEvaluationForm({...evaluationForm, whatsappGroupJustification: e.target.value})}
                disabled={selectedTask?.status === 'TRAINING_EVALUATED' || selectedTask?.status === 'COMPLETED'}
                placeholder="Link grup atau alasan..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Catatan QA / Laporan Training</label>
            <textarea 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all disabled:opacity-50"
              rows={4}
              value={evaluationForm.evaluationNotes}
              onChange={e => setEvaluationForm({...evaluationForm, evaluationNotes: e.target.value})}
              disabled={selectedTask?.status === 'TRAINING_EVALUATED' || selectedTask?.status === 'COMPLETED'}
              placeholder="Tuliskan laporan hasil training di sini..."
            />
          </div>

          {selectedTask?.status !== 'TRAINING_EVALUATED' && selectedTask?.status !== 'COMPLETED' ? (
            <button 
              type="submit" 
              className="w-full py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50" 
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Submit Hasil Evaluasi"}
            </button>
          ) : (
            <button 
              type="button" 
              className="w-full py-4 bg-alita-white border border-alita-gray-200 rounded-xl text-xs font-black uppercase tracking-[0.15em] text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm" 
              onClick={() => setIsEvaluationModalOpen(false)}
            >
              Close Summary
            </button>
          )}
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
