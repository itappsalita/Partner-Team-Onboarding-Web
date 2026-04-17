"use client";

import { useState } from "react";
import Modal from "./Modal";

interface TeamFormProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  isEditMode: boolean;
  initialData: any;
  onSave: () => void;
  isStructuralReadOnly: boolean;
}

export default function TeamForm({ 
  isOpen, 
  onClose, 
  assignment, 
  isEditMode, 
  initialData, 
  onSave,
  isStructuralReadOnly 
}: TeamFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStructuralReadOnly) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (isEditMode && formData.id) {
        fd.append("id", formData.id.toString());
      }
      fd.append("dataTeamPartnerId", assignment.id.toString());
      fd.append("teamNumber", formData.teamNumber);
      fd.append("leaderName", formData.leaderName);
      fd.append("leaderPhone", formData.leaderPhone);
      fd.append("tkpk1Number", formData.tkpk1Number);
      fd.append("position", formData.position);
      fd.append("location", formData.location);
      fd.append("firstAidNumber", formData.firstAidNumber);
      fd.append("electricalNumber", formData.electricalNumber);
      
      if (formData.tkpk1File) fd.append("tkpk1File", formData.tkpk1File);
      if (formData.firstAidFile) fd.append("firstAidFile", formData.firstAidFile);
      if (formData.electricalFile) fd.append("electricalFile", formData.electricalFile);
      
      const url = "/api/data-team/teams";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: fd,
      });

      if (res.ok) {
        onSave();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan tim");
      }
    } catch (err) {
      alert("Sistem error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? "Edit Data Tim Lapangan" : "Buat Tim Lapangan Baru"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="md:col-span-1">
             <label className="block text-xs font-black text-alita-gray-400 uppercase tracking-[0.1em] mb-2">No Tim</label>
             <input type="number" className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold disabled:opacity-50" value={formData.teamNumber} onChange={e => setFormData({...formData, teamNumber: e.target.value})} required disabled={isEditMode} />
           </div>
           <div className="md:col-span-3">
             <label className="block text-xs font-black text-alita-gray-400 uppercase tracking-[0.1em] mb-2">Nama Team Leader</label>
             <input type="text" className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold" value={formData.leaderName} onChange={e => setFormData({...formData, leaderName: e.target.value})} required placeholder="Masukkan nama lengkap leader" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black text-alita-gray-400 uppercase tracking-[0.1em] mb-2">No Handphone Leader</label>
            <input type="text" className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold" value={formData.leaderPhone} onChange={e => setFormData({...formData, leaderPhone: e.target.value})} required placeholder="Contoh: 081234567890" />
          </div>
          <div>
            <label className="block text-xs font-black text-alita-gray-400 uppercase tracking-[0.1em] mb-2">Posisi</label>
            <input type="text" className="w-full px-4 py-3 bg-alita-100 border border-alita-gray-200 rounded-xl text-sm font-bold text-alita-gray-500 cursor-not-allowed" value={formData.position} disabled />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-alita-gray-400 uppercase tracking-[0.1em] mb-2">Lokasi Penugasan</label>
          <input type="text" className="w-full px-4 py-3 bg-alita-100 border border-alita-gray-200 rounded-xl text-sm font-bold text-alita-gray-500 cursor-not-allowed" value={formData.location} disabled />
        </div>

        <div className="border-2 border-alita-gray-50 rounded-2xl p-6 bg-alita-gray-50/30">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-alita-gray-400 mb-5 flex items-center gap-2">
            <span className="w-4 h-[2px] bg-alita-gray-200"></span>
            Sertifikat Keahlian
          </h4>
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-alita-black mb-2 tracking-tight">Nomor Sertifikat TKPK 1</label>
              <input type="text" className="w-full px-4 py-3 bg-alita-white border border-alita-gray-200 rounded-xl text-sm font-bold shadow-sm focus:border-alita-orange transition-colors" value={formData.tkpk1Number} onChange={e => setFormData({...formData, tkpk1Number: e.target.value})} required placeholder="Input Nomor Sertifikat" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-alita-black mb-2 tracking-tight">File Sertifikat TKPK 1 (PDF/JPG)</label>
              <div className="flex flex-col gap-2">
                 {isEditMode && initialData?.tkpk1FilePath && <p className="text-[10px] font-bold text-alita-orange italic">Sudah ada file. Unggah baru untuk mengganti.</p>}
                 <input type="file" className="block w-full text-xs text-alita-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-alita-black file:text-alita-white hover:file:bg-alita-orange file:transition-colors" onChange={e => setFormData({...formData, tkpk1File: e.target.files?.[0] || null})} required={!isEditMode && !initialData?.tkpk1FilePath} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-alita-gray-100 mt-6">
               <div>
                  <label className="block text-[11px] font-bold text-alita-black mb-2">No. First Aid (Opsional)</label>
                  <input type="text" className="w-full px-4 py-2 bg-alita-white border border-alita-gray-200 rounded-lg text-sm font-bold mb-2 shadow-sm" value={formData.firstAidNumber} onChange={e => setFormData({...formData, firstAidNumber: e.target.value})} />
                  <input type="file" className="block w-full text-[10px] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-alita-gray-100 italic" onChange={e => setFormData({...formData, firstAidFile: e.target.files?.[0] || null})} />
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-alita-black mb-2">No. Electrical (Opsional)</label>
                  <input type="text" className="w-full px-4 py-2 bg-alita-white border border-alita-gray-200 rounded-lg text-sm font-bold mb-2 shadow-sm" value={formData.electricalNumber} onChange={e => setFormData({...formData, electricalNumber: e.target.value})} />
                  <input type="file" className="block w-full text-[10px] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-alita-gray-100 italic" onChange={e => setFormData({...formData, electricalFile: e.target.files?.[0] || null})} />
               </div>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50" disabled={submitting}>
          {submitting ? "Proses Menyimpan..." : isEditMode ? "Perbarui Data Tim" : "Simpan Tim Baru"}
        </button>
      </form>
    </Modal>
  );
}
