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
  const [step, setStep] = useState(1); // 1: Scan, 2: Form
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    nik: "",
    phone: "",
    ktpFile: null as File | null,
    selfieFile: null as File | null,
    ktpPreview: null as string | null,
    selfiePreview: null as string | null
  });

  const handleKtpChange = (file: File | null) => {
    if (file) {
      setForm({ ...form, ktpFile: file, ktpPreview: URL.createObjectURL(file) });
    }
  };

  const handleSelfieChange = (file: File | null) => {
    if (file) {
      setForm({ ...form, selfieFile: file, selfiePreview: URL.createObjectURL(file) });
    }
  };

  const handleOcrScan = async () => {
    if (!form.ktpFile) return;
    setIsScanning(true);
    setOcrProgress(0);
    setOcrError(null);

    try {
      const fd = new FormData();
      fd.append("image", form.ktpFile);

      const res = await fetch("/api/ocr/ktp-ai", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memindai KTP");
      }

      setForm({
        ...form,
        name: data.name || "",
        nik: data.nik || ""
      });
      setStep(2);
    } catch (err: any) {
      setOcrError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStructuralReadOnly) return;
    if (!form.ktpFile || !form.selfieFile) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("teamId", activeTeam.id);
      fd.append("name", form.name);
      fd.append("nik", form.nik);
      fd.append("phone", form.phone);
      fd.append("ktpFile", form.ktpFile);
      fd.append("selfieFile", form.selfieFile);
      fd.append("memberNumber", (activeTeam.members?.length + 1 || 1).toString());

      const res = await fetch("/api/data-team/members", {
        method: "POST",
        body: fd,
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
    setStep(1);
    setIsScanning(false);
    setOcrError(null);
    setForm({
      name: "",
      nik: "",
      phone: "",
      ktpFile: null,
      selfieFile: null,
      ktpPreview: null,
      selfiePreview: null
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tambah Anggota Tim">
      {step === 1 ? (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
               <h4 className="text-sm font-bold text-blue-800">Verifikasi KTP</h4>
               <p className="text-xs text-blue-600 mt-1">Gunakan foto KTP asli yang jelas untuk verifikasi otomatis menggunakan AI.</p>
            </div>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unggah Foto KTP</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                   {form.ktpPreview ? (
                     <div className="relative group">
                        <img src={form.ktpPreview} alt="KTP Preview" className="max-h-40 mx-auto rounded shadow-sm" />
                        <button 
                          onClick={() => setForm({...form, ktpFile: null, ktpPreview: null})}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                     </div>
                   ) : (
                     <input
                       type="file"
                       accept="image/*"
                       onChange={(e) => handleKtpChange(e.target.files?.[0] || null)}
                       className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                     />
                   )}
                </div>
             </div>

             {ocrError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{ocrError}</div>}

             <button
               onClick={handleOcrScan}
               disabled={!form.ktpFile || isScanning}
               className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
             >
               {isScanning ? (
                 <>
                   <span className="animate-spin text-lg">⏳</span>
                   Memindai KTP...
                 </>
               ) : "Lanjut Verifikasi AI"}
             </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 mb-4">
             <p className="text-xs text-green-700">✅ <strong>KTP Berhasil Diverifikasi!</strong> Silakan lengkapi data kontak dan foto selfie personil.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama (Auto-fill)</label>
              <input type="text" value={form.name} readOnly className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NIK (Auto-fill)</label>
              <input type="text" value={form.nik} readOnly className="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nomor HP</label>
            <input
              type="text"
              required
              placeholder="0812xxxx"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Unggah Foto Selfie</label>
             <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                {form.selfiePreview ? (
                  <div className="relative group">
                     <img src={form.selfiePreview} alt="Selfie Preview" className="max-h-40 mx-auto rounded shadow-sm" />
                     <button 
                       onClick={() => setForm({...form, selfieFile: null, selfiePreview: null})}
                       className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       ✕
                     </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => handleSelfieChange(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                )}
             </div>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              Kembali ke Scan
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || isStructuralReadOnly}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-bold transition-all shadow-sm"
              >
                {submitting ? "Menyimpan..." : "Daftarkan Anggota"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
