"use client";

import { useState } from "react";
import Modal from "./Modal";

interface MemberWizardProps {
  isOpen: boolean;
  onClose: () => void;
  activeTeam: any;
  onSave: () => void;
  isStructuralReadOnly: boolean;
}

export default function MemberWizard({ 
  isOpen, 
  onClose, 
  activeTeam, 
  onSave,
  isStructuralReadOnly 
}: MemberWizardProps) {
  const [memberStep, setMemberStep] = useState(1); // 1: Scan, 2: Form
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [memberForm, setMemberForm] = useState({
    name: "",
    position: "",
    nik: "",
    phone: "",
    ktpFile: null as File | null,
    selfieFile: null as File | null,
  });

  const handleKtpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setMemberForm({ ...memberForm, ktpFile: file });
      const reader = new FileReader();
      reader.onloadend = () => setKtpPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setMemberForm({ ...memberForm, selfieFile: file });
      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOcrScan = async () => {
    if (!memberForm.ktpFile) return;
    setIsScanning(true);
    setOcrProgress(0);
    setOcrError(null);

    let scanSuccess = false;

    try {
      const formData = new FormData();
      formData.append("image", memberForm.ktpFile);

      const res = await fetch("/api/ocr/ktp-ai", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setOcrError("Batas penggunaan AI tercapai (Quota Exceeded). Silakan isi data secara manual.");
          setMemberStep(2); // Immediate fallback if quota hit
          return;
        }
        throw new Error(data.error || "Gagal menghubungi layanan AI");
      }

      setMemberForm(prev => ({
        ...prev,
        nik: data.nik || prev.nik,
        name: (data.name || prev.name).toUpperCase().trim()
      }));
      
      scanSuccess = true;
    } catch (err: any) {
      console.error("AI OCR Error:", err);
      if (!ocrError) {
        setOcrError("Gagal memproses KTP via AI. Silakan isi manual.");
      }
      setMemberStep(2); 
    } finally {
      if (scanSuccess) {
        const startTime = Date.now();
        const duration = 1000;
        
        const animate = async () => {
          return new Promise<void>((resolve) => {
            const interval = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
              setOcrProgress(progress);
              
              if (progress >= 100) {
                clearInterval(interval);
                resolve();
              }
            }, 16);
          });
        };
        
        await animate();
        await new Promise(r => setTimeout(r, 300));
        setMemberStep(2);
      }
      setIsScanning(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || isStructuralReadOnly) return;
    
    if (memberForm.nik.length !== 16) {
      alert("NIK KTP harus berjumlah tepat 16 digit.");
      return;
    }

    if (memberForm.position === "Leader") {
      const existingLeader = activeTeam.members?.find((m: any) => m.position === "Leader" && m.isActive === 1);
      if (existingLeader) {
        alert(`Tim ini sudah memiliki Leader: ${existingLeader.name}. Silakan hapus leader lama terlebih dahulu jika ingin menggantinya.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("teamId", activeTeam.id.toString());
      formData.append("memberNumber", (activeTeam.members?.length + 1 || 1).toString());
      formData.append("name", memberForm.name);
      formData.append("position", memberForm.position);
      formData.append("nik", memberForm.nik);
      formData.append("phone", memberForm.phone);
      if (memberForm.ktpFile) formData.append("ktpFile", memberForm.ktpFile);
      if (memberForm.selfieFile) formData.append("selfieFile", memberForm.selfieFile);

      const res = await fetch("/api/data-team/members", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSave();
        handleClose();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menambah anggota");
      }
    } catch (err) {
      alert("Sistem error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMemberStep(1);
    setKtpPreview(null);
    setSelfiePreview(null);
    setMemberForm({ name: "", position: "", nik: "", phone: "", ktpFile: null, selfieFile: null });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={memberStep === 1 ? "Pindai KTP Anggota Baru" : "Detail Data Anggota"}
    >
      {memberStep === 1 ? (
        <div className="flex flex-col items-center">
          <div className="w-full relative group">
            <div 
              className={`w-full aspect-[1.58/1] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                ktpPreview ? 'border-alita-orange bg-alita-gray-50' : 'border-alita-gray-200 bg-alita-gray-50 hover:bg-alita-gray-100'
              }`}
            >
              {ktpPreview ? (
                <div className="w-full h-full p-2">
                  <img src={ktpPreview} alt="KTP Preview" className="w-full h-full object-contain rounded-xl" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-alita-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-alita-white z-10">
                      <div className="w-12 h-12 border-4 border-alita-orange/20 border-l-alita-orange rounded-full animate-spin mb-4" />
                      <p className="font-black text-xs tracking-widest animate-pulse">PROSES SCANNING... {ocrProgress}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-8 group-hover:scale-105 transition-transform">
                  <div className="text-6xl mb-4 group-hover:rotate-6 transition-transform">🪪</div>
                  <p className="text-sm font-black text-alita-black tracking-tight mb-2">Unggah Foto KTP</p>
                  <p className="text-xs font-bold text-alita-gray-400">Ekstrak data NIK & Nama secara otomatis</p>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleKtpFileChange} 
                className="absolute inset-0 opacity-0 cursor-pointer z-20"
              />
            </div>
          </div>

          <p className="mt-6 text-[10px] font-bold text-alita-gray-400 text-center leading-relaxed">
            * Pastikan pencahayaan cukup dan teks pada KTP terlihat jelas agar sistem AI dapat membaca dengan akurat.
          </p>

          <div className="w-full mt-8">
            <button 
              onClick={handleOcrScan}
              disabled={!memberForm.ktpFile || isScanning}
              className="w-full py-4 bg-alita-black text-alita-white rounded-xl text-xs font-black tracking-[0.2em] hover:bg-alita-gray-800 disabled:opacity-30 disabled:grayscale transition-all shadow-xl uppercase"
            >
              {isScanning ? "SCANNING..." : "MULAI PINDAI KTP"}
            </button>
            
            <div className="mt-6 flex items-center justify-center gap-2 opacity-50">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-alita-gray-400">Powered by</span>
              <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-red-500">Google AI</span>
            </div>
          </div>
          {ocrError && <p className="mt-4 text-[11px] font-bold text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{ocrError}</p>}
        </div>
      ) : (
        <form onSubmit={handleAddMember} className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
            <span className="text-xl">✨</span>
            <p className="text-[11px] font-bold text-blue-800 leading-normal">
              Verifikasi data di bawah ini. Pastikan Nama dan NIK sesuai dengan kartu identitas personil. Jika data tidak sesuai, silakan klik tombol Kembali untuk mengulang pindaian KTP.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl flex items-center gap-3">
            <span className="text-base shrink-0">⚠️</span>
            <p className="text-[11px] font-bold text-yellow-800 leading-normal">
              Cek dan scan ulang KTP jika data yang muncul tidak sesuai dengan KTP fisik.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-alita-gray-400 tracking-[0.1em] uppercase mb-2">Nama Lengkap (Sesuai KTP)</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-alita-gray-100/50 border border-alita-gray-200 rounded-xl text-sm font-bold cursor-not-allowed select-none text-alita-gray-500" 
                value={memberForm.name} 
                readOnly 
                required 
                title="Data terkunci sesuai hasil pindaian AI KTP"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-alita-gray-400 tracking-[0.1em] uppercase mb-2">NIK KTP (16 Digit)</label>
                 <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-alita-gray-100/50 border border-alita-gray-200 rounded-xl text-sm font-bold cursor-not-allowed select-none text-alita-gray-500" 
                  value={memberForm.nik} 
                  readOnly 
                  required 
                  title="Data terkunci sesuai hasil pindaian AI KTP"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-alita-gray-400 tracking-[0.1em] uppercase mb-2">Nomor WhatsApp</label>
                <input type="text" className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:border-alita-orange transition-colors" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} required placeholder="0812xxxx" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-alita-gray-400 tracking-[0.1em] uppercase mb-2">Target Posisi Pekerjaan</label>
              <select 
                className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:border-alita-orange transition-colors" 
                value={memberForm.position} 
                onChange={e => setMemberForm({...memberForm, position: e.target.value})} 
                required
              >
                <option value="">-- Pilih Posisi --</option>
                <option value="Leader">Leader</option>
                <option value="Technician">Technician</option>
                <option value="Helper">Helper</option>
                <option value="Driver">Driver</option>
              </select>
            </div>

            {/* Selfie Upload Section */}
            <div className="border-2 border-dashed border-alita-gray-200 rounded-2xl p-6 bg-alita-gray-50/50 hover:bg-alita-gray-100/50 transition-all relative group">
              <div className="flex flex-col items-center text-center">
                {selfiePreview ? (
                  <div className="relative w-40 h-40 mb-3">
                    <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover rounded-xl border-2 border-alita-orange shadow-md" />
                    <div className="absolute -top-2 -right-2 bg-alita-orange text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg">✓</div>
                  </div>
                ) : (
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🤳</div>
                )}
                <p className="text-[11px] font-black text-alita-black tracking-tight mb-1">Upload Foto Selfie Anggota</p>
                <p className="text-[9px] font-bold text-alita-gray-400 uppercase tracking-widest">Wajib untuk verifikasi identitas</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleSelfieFileChange} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />
              </div>
            </div>

            {memberForm.ktpFile && (
              <div className="border border-alita-gray-200 rounded-2xl overflow-hidden bg-alita-gray-50">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-alita-gray-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-alita-gray-400">📎 File KTP Terunggah</span>
                  <span className="text-[9px] font-bold text-alita-gray-300 truncate max-w-[200px]">{memberForm.ktpFile.name}</span>
                </div>
                {ktpPreview && (
                  <div className="p-3">
                    <img
                      src={ktpPreview}
                      alt="Thumbnail KTP"
                      className="w-full aspect-[1.58/1] object-contain rounded-xl border border-alita-gray-100 bg-alita-white shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
             <button type="button" className="col-span-1 py-3.5 border-2 border-alita-gray-50 rounded-xl text-[10px] font-black text-alita-gray-400 hover:bg-alita-gray-50 transition-all uppercase" onClick={() => setMemberStep(1)} disabled={submitting}>Kembali</button>
             <button type="submit" className="col-span-2 py-3.5 bg-alita-black text-alita-white rounded-xl text-[10px] font-black tracking-[0.15em] hover:bg-alita-orange transition-all uppercase shadow-lg shadow-black/10 disabled:opacity-50" disabled={submitting}>
               {submitting ? "PROSES MENYIMPAN..." : "SIMPAN ANGGOTA TIM"}
             </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
