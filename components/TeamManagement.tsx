"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "./Modal";
import TeamForm from "./TeamForm";
import MemberWizard from "./MemberWizard";

interface TeamManagementProps {
  assignment: any; // dataTeamPartner object
  onClose: () => void;
}

export default function TeamManagement({ assignment, onClose }: TeamManagementProps) {
  const { data: session } = useSession() as any;
  const userRole = (session?.user as any)?.role;
  const isPartner = userRole === "PARTNER";
  const isSuperAdmin = userRole === "SUPERADMIN";
  
  // Structural changes (Edit Team/Add Member) are locked if Completed/Canceled
  const isStructuralReadOnly = (!isPartner && !isSuperAdmin) || 
                                assignment.status === 'COMPLETED' || 
                                assignment.status === 'CANCELED';
                     
  const isCanceled = assignment.status === 'CANCELED';

  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<any>(null);
  const [memberPage, setMemberPage] = useState(1);
  const membersPerPage = 10;
  
  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  
  const [teamFormInitial, setTeamFormInitial] = useState<any>(null);
  const [memberFormInitial, setMemberFormInitial] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Member Edit State
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editForm, setEditForm] = useState({ position: '', selfieFile: null as File | null });
  const [exportingTeamId, setExportingTeamId] = useState<string | null>(null);

  const handleExportTeam = async (team: any) => {
    setExportingTeamId(team.id);
    try {
      const res = await fetch(`/api/data-team/export?id=${assignment.id}&teamId=${team.id}`);
      if (!res.ok) throw new Error("Gagal mengunduh");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tim_${team.displayId || team.teamNumber}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert("Terjadi kesalahan saat mengekspor data.");
    } finally {
      setExportingTeamId(null);
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data-team/teams?dataTeamPartnerId=${assignment.id}`);
      const data = await res.json();
      
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setTeams(data);
        if (data.length > 0 && !activeTeam) {
          setActiveTeam(data[0]);
        } else if (activeTeam) {
          const updatedActive = data.find((t: any) => t.id === activeTeam.id);
          if (updatedActive) setActiveTeam(updatedActive);
        }
      } else {
        console.error("API Error or Invalid format:", data);
        setTeams([]); // Fallback to empty array
      }
    } catch (err) {
      console.error("Fetch teams error:", err);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSaveEditMember = async () => {
    if (!editingMember) return;
    setSubmitting(true);
    try {
        const formData = new FormData();
        formData.append("position", editForm.position);
        if (editForm.selfieFile) {
            formData.append("selfieFile", editForm.selfieFile);
        }

        const res = await fetch(`/api/data-team/members/${editingMember.id}`, {
            method: "PUT",
            body: formData
        });

        const result = await res.json();
        if (res.ok) {
            alert("✅ Data anggota berhasil diperbarui!");
            setEditingMember(null);
            fetchTeams();
        } else {
            alert("❌ " + (result.error || "Gagal memperbarui data"));
        }
    } catch (err) {
        console.error("Update member error:", err);
        alert("❌ Terjadi kesalahan sistem saat memperbarui data");
    } finally {
        setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [assignment.id]);

  // Reset member page when active team changes
  useEffect(() => {
    setMemberPage(1);
  }, [activeTeam?.id]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const openAddTeamModal = () => {
    setIsEditMode(false);
    setTeamFormInitial({
      id: null,
      teamNumber: (teams.length + 1).toString(),
      leaderName: "",
      leaderPhone: "",
      tkpk1Number: "",
      tkpk1File: null,
      firstAidNumber: "",
      firstAidFile: null,
      electricalNumber: "",
      electricalFile: null,
      position: "Team Leader",
      location: assignment.request ? `${assignment.request.provinsi}, ${assignment.request.area}` : ""
    });
    setIsTeamModalOpen(true);
  };

  const openEditTeamModal = (team: any) => {
    setIsEditMode(true);
    // Find leader from members if not already populated in team object
    const memberLeader = team.members?.find((m: any) => m.position === "Leader" && m.isActive === 1);
    
    setTeamFormInitial({
      id: team.id,
      teamNumber: team.teamNumber.toString(),
      leaderName: memberLeader?.name || team.leaderName || "",
      leaderPhone: memberLeader?.phone || team.leaderPhone || "",
      tkpk1Number: team.tkpk1Number || "",
      tkpk1File: null,
      firstAidNumber: team.firstAidNumber || "",
      firstAidFile: null,
      electricalNumber: team.electricalNumber || "",
      electricalFile: null,
      position: team.position || "Team Leader",
      location: team.location || ""
    });
    setIsTeamModalOpen(true);
  };



  const handleDeleteMember = async (memberId: string, isCertified: boolean) => {
    const action = isCertified ? "menonaktifkan" : "menghapus";
    if (!confirm(`Apakah Anda yakin ingin ${action} anggota ini?`)) return;

    try {
      const res = await fetch(`/api/data-team/members/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTeams();
      } else {
        const err = await res.json();
        alert(err.error || `Gagal ${action} anggota`);
      }
    } catch (err) {
      alert("Sistem error.");
    }
  };

  const executeRequestTraining = async () => {
    if (!activeTeam || assignment.status === 'CANCELED' || assignment.status === 'COMPLETED') return;
    
    const activeMembers = activeTeam.members?.filter((m: any) => m.isActive === 1) || [];
    const hasLeader = activeMembers.some((m: any) => m.position === "Leader");
    const requiredQuota = assignment.request?.membersPerTeam || 0;
    
    if (!hasLeader || !activeTeam.tkpk1Number || activeMembers.length !== requiredQuota) {
      alert(`Syarat Minimal belum terpenuhi: 
1. Tim harus memiliki tepat ${requiredQuota} anggota aktif (Saat ini: ${activeMembers.length}).
2. Wajib terdapat minimal 1 anggota dengan posisi "Leader".
3. Nomor Sertifikat TKPK1 wajib terisi.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin mengajukan QA Training untuk Tim #${activeTeam.teamNumber}? Sertifikat TKPK1 dan data identitas akan diuji.`)) return;

    setRequesting(activeTeam.id);
    try {
      const res = await fetch("/api/qa-training/request", {
        method: "POST",
        body: JSON.stringify({ teamId: activeTeam.id }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        alert("Berhasil! Jadwal training diajukan untuk Tim #" + activeTeam.teamNumber);
        fetchTeams();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal mengajukan training");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setRequesting(null);
    }
  };

  const activeMembersLen = activeTeam?.members?.filter((m: any) => m.isActive === 1).length || 0;
  const hasLeader = activeTeam?.members?.some((m: any) => m.position === "Leader" && m.isActive === 1);
  const requiredQuota = assignment.request?.membersPerTeam || 0;

  const isTeamValidToRequest = activeTeam && 
                               hasLeader && 
                               activeTeam.tkpk1Number && 
                               activeMembersLen === requiredQuota;

  return (
    <div className="flex flex-col h-[90vh] lg:h-[85vh] bg-alita-white rounded-xl shadow-2xl border border-alita-gray-100 overflow-hidden">
      {/* Container Header */}
      <header className="px-6 py-5 bg-alita-black text-alita-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[1.25rem] font-bold text-alita-orange leading-tight">Kelola Tim Lapangan</h2>
          <p className="text-[0.8rem] text-alita-gray-400 mt-1 flex items-center gap-3">
            <span>Penugasan: <strong className="text-alita-white font-semibold">{assignment.request?.sowPekerjaan || "N/A"}</strong></span>
            {isStructuralReadOnly && <span className="px-3 py-1 bg-alita-orange text-alita-white rounded-full text-[9px] font-black tracking-[0.15em] shadow-sm shadow-orange-100">READ ONLY</span>}
          </p>
        </div>
        <button onClick={onClose} className="text-3xl font-light text-alita-white hover:text-alita-orange transition-colors">&times;</button>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Sidebar Tim (Desktop: Samping, Mobile: Atas/Carousel) */}
        <aside className="w-full lg:w-[280px] border-b lg:border-r border-alita-gray-100 bg-alita-gray-50/50 flex flex-col pt-4 lg:pt-6 shrink-0">
          <div className="px-5 mb-2 lg:mb-4 border-b lg:border-b-0 border-alita-gray-100 pb-2 lg:pb-0">
            <h3 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] text-alita-gray-400">Daftar Tim Lapangan</h3>
          </div>
          <div className="flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto px-4 pb-4 lg:pb-6 custom-scrollbar flex gap-3 lg:gap-0 lg:space-y-3">
            {Array.isArray(teams) && teams.map(t => (
              <div 
                key={t.id} 
                onClick={() => setActiveTeam(t)}
                className={`p-3 lg:p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 shrink-0 w-[180px] lg:w-full ${
                  activeTeam?.id === t.id 
                    ? 'bg-alita-orange text-alita-white border-alita-orange shadow-[0_8px_20px_rgba(255,122,0,0.2)] scale-[1.02]' 
                    : 'bg-alita-white text-alita-black border-alita-gray-100 hover:border-alita-gray-300 shadow-sm'
                } ${!t.leaderName ? 'border-dashed' : ''}`}
              >
                  <div className="flex justify-between items-start mb-1">
                     <span className={`text-[11px] font-bold uppercase tracking-wider ${activeTeam?.id === t.id ? 'text-alita-white/80' : 'text-alita-gray-400'}`}>
                        {t.displayId || `Tim #${t.teamNumber}`}
                     </span>
                     <span className="text-sm font-black tracking-tight">#{t.teamNumber}</span>
                  </div>
                  <div className={`text-[0.85rem] font-bold truncate ${activeTeam?.id === t.id ? 'text-alita-white' : 'text-alita-black'}`}>
                    {t.leaderName || <span className={`${activeTeam?.id === t.id ? 'text-alita-white/60 italic' : 'text-alita-orange'}`}>⚠️ Lengkapi Data</span>}
                  </div>
                </div>
              ))}
              
            </div>
        </aside>

        {/* Detail Tim & Anggota */}
        <main className="flex-1 overflow-y-auto bg-alita-white flex flex-col">
          {activeTeam ? (
            <div className="flex flex-col h-full">
              {/* Banner for CANCELED or COMPLETED status */}
              {isCanceled && (
                <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-center gap-3 animate-pulse">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                  <span className="text-xs font-black uppercase tracking-[0.2em]">PENUGASAN DIBATALKAN - SELURUH DATA TERKUNCI</span>
                </div>
              )}
              {assignment.status === 'COMPLETED' && (
                <div className="bg-green-600 text-white px-6 py-3 flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs font-black uppercase tracking-[0.2em]">PROSES SELESAI - DATA TERKUNCI</span>
                </div>
              )}

              <div className="p-4 lg:p-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-alita-gray-100 pb-8 mb-8">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div className="w-14 h-14 bg-alita-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-alita-gray-100">👤</div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2 lg:gap-3 mb-2">
                        <h2 className="text-xl lg:text-2xl font-black text-alita-black tracking-tight leading-none">{activeTeam.leaderName || "Data Belum Lengkap"}</h2>
                        <span className={`inline-flex items-center px-3 py-1 text-[9px] lg:text-[10px] font-black uppercase tracking-wider rounded-full border whitespace-nowrap ${
                            activeTeam.status === 'SOURCING' ? 'bg-alita-gray-50 border-alita-gray-200 text-alita-gray-400' :
                            activeTeam.status === 'WAIT_SCHEDULE_TRAINING' ? 'bg-orange-50 border-orange-200 text-alita-orange' :
                            activeTeam.status === 'TRAINING_SCHEDULED' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            activeTeam.status === 'TRAINING_EVALUATED' ? 'bg-green-50 border-green-200 text-green-600' :
                            'bg-alita-gray-50 border-alita-gray-200 text-alita-gray-400'
                          }`}>
                          {(activeTeam.status || "SOURCING").replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-alita-gray-500 font-medium">
                        <span className="px-3 py-1 bg-alita-gray-50 border border-alita-gray-200 rounded-full text-[9px] font-black uppercase tracking-tight text-alita-gray-500">Leader</span>
                        {activeTeam.leaderPhone && <span>• {activeTeam.leaderPhone}</span>}
                        {activeTeam.location && <span>• {activeTeam.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {!isStructuralReadOnly && activeTeam.tkpk1Number && activeTeam.tkpk1FilePath && (
                      <button
                        onClick={() => openEditTeamModal(activeTeam)}
                        className="px-4 py-2 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                      >
                        ✏️ EDIT DATA TIM
                      </button>
                    )}
                    {(userRole === 'PROCUREMENT' || userRole === 'SUPERADMIN') && (!activeTeam.status || activeTeam.status === 'SOURCING') && !isCanceled && (
                      <button
                        onClick={executeRequestTraining}
                        disabled={!isTeamValidToRequest || requesting === activeTeam.id}
                        title={!isTeamValidToRequest ? `Syarat: Tepat ${assignment.request?.membersPerTeam || 0} anggota aktif, minimal 1 Leader, dan Nomor TKPK1 terisi.` : ""}
                        className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                          isTeamValidToRequest
                            ? 'bg-alita-black text-alita-white hover:bg-alita-gray-800 cursor-pointer'
                            : 'bg-alita-gray-100 text-alita-gray-400 cursor-not-allowed opacity-70 border border-alita-gray-300'
                        }`}
                      >
                        {requesting === activeTeam.id ? (
                          <span className="animate-pulse italic">PROCESSING...</span>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            AJUKAN TRAINING
                          </>
                        )}
                      </button>
                    )}
                    {!isPartner && (
                      <button
                        onClick={() => handleExportTeam(activeTeam)}
                        disabled={exportingTeamId === activeTeam.id}
                        className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-all shadow-sm active:scale-95 flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight"
                      >
                        {exportingTeamId === activeTeam.id ? (
                          <span className="animate-pulse italic">EXPORTING...</span>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Excel
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-row lg:flex-col gap-2 items-center lg:items-end w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                  {activeTeam.tkpk1Number ? (
                    <a 
                      href={activeTeam.tkpk1FilePath || "#"} 
                      target="_blank" 
                      className="inline-flex items-center gap-2 px-3 py-2 bg-alita-black text-alita-white rounded-lg text-[11px] font-bold shadow-sm hover:brightness-125 transition-all"
                    >
                      <span>📜 TKPK1: {activeTeam.tkpk1Number}</span>
                      <span className="text-[10px] opacity-60">↗️</span>
                    </a>
                  ) : (
                    <div className="px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-lg text-[11px] font-bold flex items-center gap-2">
                       ⚠️ NO TKPK1
                    </div>
                  )}

                  {activeTeam.firstAidNumber && (
                    <a 
                      href={activeTeam.firstAidFilePath || "#"} 
                      target="_blank" 
                      className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-colors"
                    >
                      First Aid: {activeTeam.firstAidNumber} ↗️
                    </a>
                  )}

                  {activeTeam.electricalNumber && (
                    <a 
                      href={activeTeam.electricalFilePath || "#"} 
                      target="_blank" 
                      className="px-3 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg text-[11px] font-bold hover:bg-green-100 transition-colors inline-block text-center w-full"
                    >
                      Elec: {activeTeam.electricalNumber} ↗️
                    </a>
                  )}
                  {isPartner && activeTeam.status !== 'SOURCING' && activeTeam.status && (
                    <div className="mt-1 w-full text-center px-3 py-2 rounded-lg text-[9px] font-black text-alita-gray-400 bg-alita-gray-50 border border-alita-gray-200 border-dashed shrink-0 min-w-[150px] lg:min-w-0">
                      LOCKED (IN PROGRESS)
                    </div>
                  )}
                </div>
              </div>

              {/* Members Section */}
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg lg:text-[1.1rem] font-black text-alita-black tracking-tight">Anggota Tim</h3>
                  <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-alita-gray-400">Total: {activeTeam.members?.filter((m: any) => m.isActive === 1).length || 0} Aktif</p>
                </div>
                 {!isStructuralReadOnly && (
                  <div className="flex items-center gap-2 lg:gap-3">
                    <span className="hidden md:block text-[10px] font-black text-alita-gray-400 uppercase tracking-widest bg-alita-gray-50 px-3 py-1.5 rounded-lg border border-alita-gray-100 italic">
                      Limit: {assignment.request?.membersPerTeam || 0}
                    </span>
                    <button 
                      onClick={() => setIsMemberModalOpen(true)}
                      disabled={!activeTeam.tkpk1Number || !activeTeam.tkpk1FilePath || ((activeTeam.members?.filter((m: any) => m.isActive === 1).length || 0) >= (assignment.request?.membersPerTeam || 0))}
                      className="px-4 lg:px-5 py-2 lg:py-2.5 bg-alita-black text-alita-white rounded-lg text-[10px] lg:text-xs font-bold hover:bg-alita-orange disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                    >
                      { ((activeTeam.members?.filter((m: any) => m.isActive === 1).length || 0) >= (assignment.request?.membersPerTeam || 0)) 
                        ? "Kuota Penuh" 
                        : "+ Tambah Anggota" 
                      }
                    </button>
                  </div>
                )}
              </div>
              
              {(!activeTeam.tkpk1Number || !activeTeam.tkpk1FilePath) && (
                 <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center mb-4 space-y-4">
                    <p className="text-red-600 font-bold text-sm italic">⚠️ Wajib melengkapi data sertifikat TKPK1 (Nomor & Unggah File) sebelum dapat menambahkan anggota.</p>
                    {!isStructuralReadOnly && (
                      <button
                        onClick={() => openEditTeamModal(activeTeam)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-md"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Lengkapi Data Tim Sekarang
                      </button>
                    )}
                 </div>
              )}

              {/* Inline Edit Member Panel — muncul di bawah warning merah saat edit diklik */}
              {editingMember && (
                <div className="mb-6 bg-alita-white border-2 border-alita-orange rounded-2xl overflow-hidden shadow-md animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-alita-orange px-5 py-3 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-alita-white">Edit Posisi Anggota</span>
                    <button onClick={() => setEditingMember(null)} className="text-alita-white hover:opacity-70 transition-opacity text-xl font-light leading-none">&times;</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="bg-alita-gray-50 border border-alita-gray-100 px-4 py-3 rounded-xl flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-alita-gray-400 tracking-widest">Nama:</span>
                      <span className="text-sm font-bold text-alita-black">{editingMember.name}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-alita-gray-400 mb-2">Pilih Jabatan</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['Leader', 'Technician', 'Helper', 'Driver'].map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, position: role }))}
                            className={`py-3 px-4 rounded-xl border-2 text-[10px] font-bold transition-all uppercase tracking-tighter ${
                              editForm.position === role
                                ? 'border-alita-orange bg-orange-50 text-alita-orange'
                                : 'border-alita-gray-100 text-alita-gray-400 hover:border-alita-gray-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-alita-gray-400 mb-2">Upload Foto Selfie Baru (Opsional)</label>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditForm(prev => ({ ...prev, selfieFile: e.target.files?.[0] || null }))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`p-4 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-3 ${
                          editForm.selfieFile ? 'border-green-200 bg-green-50' : 'border-alita-gray-100 group-hover:border-alita-orange group-hover:bg-orange-50'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            editForm.selfieFile ? 'bg-green-100 text-green-600' : 'bg-alita-gray-100 text-alita-gray-400'
                          }`}>
                            {editForm.selfieFile ? (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            )}
                          </div>
                          <span className={`text-[11px] font-bold ${editForm.selfieFile ? 'text-green-700' : 'text-alita-gray-400 italic'}`}>
                            {editForm.selfieFile ? editForm.selfieFile.name : 'Klik untuk ubah foto selfie'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setEditingMember(null)}
                        className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-alita-gray-400 hover:bg-alita-gray-50 rounded-xl border border-alita-gray-200 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveEditMember}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-alita-orange text-alita-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 shadow-md disabled:opacity-50 active:scale-[0.98] transition-all"
                      >
                        {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

               {/* Members Table with Pagination & Scroll */}
               <div className="bg-alita-white border border-alita-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                 <div className="overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar">
                   <table className="w-full border-collapse min-w-[900px]">
                     <thead className="sticky top-0 z-10 bg-alita-gray-50 uppercase">
                       <tr>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">#</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Nomor</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Nama & NIK</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Selfie</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">KTP</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Posisi</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Training</th>
                         <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Akses Sistem</th>
                         {(!isCanceled && (isPartner || isSuperAdmin)) && (
                           <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest text-alita-gray-400 border-b border-alita-gray-100">Action</th>
                         )}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-alita-gray-50">
                       {(() => {
                         const activeMembers = activeTeam.members?.filter((m: any) => m.isActive === 1) || [];
                         const indexOfLast = memberPage * membersPerPage;
                         const indexOfFirst = indexOfLast - membersPerPage;
                         const currentMembers = activeMembers.slice(indexOfFirst, indexOfLast);
                         
                         if (currentMembers.length === 0) {
                            return <tr><td colSpan={isStructuralReadOnly ? 7 : 8} className="px-5 py-16 text-center text-alita-gray-300 font-bold text-sm tracking-tight italic">Belum ada anggota tim terdaftar.</td></tr>;
                         }

                         return currentMembers.map((m: any, idx: number) => (
                           <tr key={m.id} className="hover:bg-alita-gray-50/50 transition-colors">
                             <td className="px-5 py-5 text-xs font-black text-alita-gray-400">{indexOfFirst + idx + 1}</td>
                             <td className="px-5 py-5 text-xs font-bold text-alita-gray-400">#{m.displayId}</td>
                             <td className="px-5 py-5">
                               <div className="flex items-center gap-2 mb-1">
                                 <div className="font-bold text-alita-black text-sm">{m.name}</div>
                                 {m.isReturning === 1 && (
                                   <div 
                                     title="RETURNING PERSONNEL (Certified)"
                                     className="group relative cursor-help shrink-0"
                                   >
                                     <div className="flex items-center justify-center w-4 h-4 bg-orange-50 border border-orange-100 rounded-full text-alita-orange transition-all hover:bg-alita-orange hover:text-alita-white hover:scale-110 shadow-sm shadow-orange-100">
                                       <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-2 5l-4-4l-1 1l-4-4l11-13l11 13l-4 4l-1-1l-4 4l-2-5Z"></path></svg>
                                     </div>
                                   </div>
                                 )}
                               </div>
                               <div className="text-[10px] font-black text-alita-gray-400 tracking-wider">NIK: {m.nik}</div>
                             </td>
                             <td className="px-5 py-5">
                               {m.selfieFilePath ? (
                                 <a href={m.selfieFilePath} target="_blank" className="text-[11px] font-bold text-alita-orange hover:underline">Lihat Foto</a>
                               ) : (
                                 <span className="text-[10px] italic font-bold text-alita-gray-300 uppercase tracking-widest">No Photo</span>
                               )}
                             </td>
                             <td className="px-5 py-5">
                               <a href={m.ktpFilePath} target="_blank" className="text-[11px] font-bold text-alita-orange hover:underline">Lihat File</a>
                             </td>
                             <td className="px-5 py-5">
                                <span className="px-3 py-1 bg-alita-gray-50 rounded-full text-[9px] font-black uppercase text-alita-gray-501 border border-alita-gray-200 whitespace-nowrap">{m.position}</span>
                             </td>
                             <td className="px-5 py-5">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap ${
                                  m.isAttendedTraining === 1 ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${m.isAttendedTraining === 1 ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                  {m.isAttendedTraining === 1 ? 'Trained' : 'Untrained'}
                                </div>
                             </td>
                             <td className="px-5 py-5 min-w-[200px]">
                               {(m.alitaExtEmail || m.certificateFilePath) ? (
                                 <div className="flex flex-col gap-3">
                                   <div className="space-y-1.5">
                                     {m.alitaExtEmail && (
                                       <div className="flex items-center gap-2 overflow-hidden" title="Email Eksternal / Pribadi">
                                         <svg className="w-3 h-3 text-alita-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                         <span className="text-[11px] font-bold text-alita-gray-500 truncate italic">{m.alitaExtEmail}</span>
                                       </div>
                                     )}
                                   </div>
                                   <div className="flex items-center gap-2 pt-2.5 border-t border-alita-gray-50">
                                     <button 
                                       onClick={() => {
                                         if (m.alitaEmailPassword) {
                                           navigator.clipboard.writeText(m.alitaEmailPassword);
                                           alert("Password berhasil disalin ke clipboard!");
                                         } else {
                                           alert("Data password belum tersedia.");
                                         }
                                       }}
                                       title="Klik untuk Salin Password Akses Email"
                                       className="flex items-center gap-2 px-2.5 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-alita-gray-400 hover:text-alita-orange hover:border-alita-orange transition-all shadow-sm group"
                                     >
                                       <svg className="w-3 h-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                       <span className="text-[8px] font-black uppercase tracking-widest text-alita-gray-400">PWD</span>
                                     </button>
                                     {m.certificateFilePath && (
                                       <a 
                                         href={m.certificateFilePath} 
                                         target="_blank"
                                         title="Klik untuk Buka Sertifikat Kelulusan Anggota"
                                         className="flex items-center gap-2 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-alita-orange hover:bg-alita-orange hover:text-alita-white transition-all shadow-sm group"
                                       >
                                         <svg className="w-3 h-3 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                         <span className="text-[8px] font-black uppercase tracking-widest">CERT</span>
                                       </a>
                                     )}
                                   </div>
                                 </div>
                               ) : (
                                 <span className="inline-flex items-center px-2 py-1 rounded-md bg-alita-gray-50 text-[9px] font-black text-alita-gray-300 uppercase tracking-widest border border-alita-gray-100 italic">Pending P&C</span>
                               )}
                             </td>
                           {(!isCanceled && (isPartner || isSuperAdmin)) && (
                             <td className="px-5 py-5 text-center">
                               <div className="flex items-center justify-center gap-2">
                                 {activeTeam.status === 'SOURCING' && (isPartner || isSuperAdmin) && (
                                   <button 
                                     onClick={() => {
                                       setEditingMember(m);
                                       setEditForm({ position: m.position, selfieFile: null });
                                     }}
                                     className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg font-black text-[8px] uppercase tracking-tighter transition-all shadow-sm active:scale-95 bg-alita-black text-alita-white hover:bg-alita-gray-800"
                                   >
                                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                     <span>Edit</span>
                                   </button>
                                 )}
                                 
                                 {((!m.certificateFilePath && !isStructuralReadOnly) || (m.certificateFilePath)) ? (
                                   <button 
                                     onClick={() => handleDeleteMember(m.id, !!m.certificateFilePath)}
                                     className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg font-black text-[8px] uppercase tracking-tighter transition-all shadow-sm active:scale-95 ${
                                       m.certificateFilePath 
                                         ? 'bg-alita-gray-50 text-alita-gray-400 hover:bg-alita-gray-100' 
                                         : 'bg-red-50 text-red-500 border border-red-50 hover:bg-red-100'
                                     }`}
                                   >
                                     {m.certificateFilePath ? (
                                       <>
                                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                         <span>Deactivate</span>
                                       </>
                                     ) : (
                                       <>
                                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                         <span>Delete</span>
                                       </>
                                     )}
                                   </button>
                                 ) : (
                                   <span className="text-[8px] font-black text-alita-gray-300 uppercase">Locked</span>
                                 )}
                               </div>
                             </td>
                           )}
                           </tr>
                         ));
                       })()}
                     </tbody>
                   </table>
                 </div>

                 {/* Modal Member Pagination Footer */}
                 {activeTeam.members?.filter((m: any) => m.isActive === 1).length > membersPerPage && (
                   <div className="px-5 py-3 bg-alita-gray-50 border-t border-alita-gray-100 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-alita-gray-401 uppercase">Halaman {memberPage} dari {Math.ceil((activeTeam.members?.filter((m: any) => m.isActive === 1).length || 0) / membersPerPage)}</span>
                     <div className="flex gap-2">
                        <button 
                          disabled={memberPage === 1}
                          onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1 bg-alita-white border border-alita-gray-200 rounded-lg text-[10px] font-black text-alita-gray-400 hover:text-alita-black disabled:opacity-30 transition-all uppercase"
                        >Prev</button>
                        <button 
                          disabled={memberPage >= Math.ceil((activeTeam.members?.filter((m: any) => m.isActive === 1).length || 0) / membersPerPage)}
                          onClick={() => setMemberPage(p => p + 1)}
                          className="px-3 py-1 bg-alita-white border border-alita-gray-200 rounded-lg text-[10px] font-black text-alita-gray-400 hover:text-alita-black disabled:opacity-30 transition-all uppercase"
                        >Next</button>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-alita-gray-200">
              <div className="text-7xl mb-6 opacity-30 select-none">🏗️</div>
              <h3 className="text-lg font-black tracking-tight text-alita-gray-300">Tim Belum Dipilih</h3>
              <p className="text-sm font-bold text-alita-gray-300/60 max-w-[280px] text-center mt-2 leading-relaxed">Silakan pilih tim dari panel sebelah kiri atau buat tim baru.</p>
            </div>
          )}
        </main>
      </div>

      {/* Modular Team Form */}
      {isTeamModalOpen && teamFormInitial && (
        <TeamForm 
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          assignment={assignment}
          isEditMode={isEditMode}
          initialData={teamFormInitial}
          onSave={fetchTeams}
          isStructuralReadOnly={isStructuralReadOnly}
        />
      )}

      {/* Modular Member Wizard */}
      {isMemberModalOpen && (
        <MemberWizard 
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          activeTeam={activeTeam}
          onSave={fetchTeams}
          isStructuralReadOnly={isStructuralReadOnly}
        />
      )}
    </div>
  );
}
