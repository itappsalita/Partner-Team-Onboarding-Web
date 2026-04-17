"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";

interface AssignPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignPartnerModal({ isOpen, onClose, onSuccess }: AssignPartnerModalProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [requestId, setRequestId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [numTeams, setNumTeams] = useState("1");
  const [torFile, setTorFile] = useState<File | null>(null);
  const [bakFile, setBakFile] = useState<File | null>(null);

  const selectedReq = requests.find(r => r.id.toString() === requestId);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const reqRes = await fetch("/api/requests");
      if (!reqRes.ok) throw new Error("Gagal mengambil data request");
      const reqData = await reqRes.json();
      
      const filteredRequests = Array.isArray(reqData) 
        ? reqData.filter((r: any) => 
            r.status !== "COMPLETED" && 
            (r.totalRegisteredTeams || 0) < r.jumlahKebutuhan
          )
        : [];
      setRequests(filteredRequests);

      const partRes = await fetch("/api/users?role=PARTNER");
      if (!partRes.ok) throw new Error("Gagal mengambil data partner");
      const partData = await partRes.json();
      setPartners(Array.isArray(partData) ? partData : []);
      
    } catch (err) {
      console.error("Load modal data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !partnerId) {
      alert("Harap pilih Request dan Partner.");
      return;
    }

    const maxAllowed = selectedReq ? selectedReq.jumlahKebutuhan - (selectedReq.totalRegisteredTeams || 0) : 0;
    if (parseInt(numTeams) > maxAllowed) {
      alert(`Jumlah tim melebihi kuota tersedia (${maxAllowed} tim).`);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("requestId", requestId);
      formData.append("partnerId", partnerId);
      formData.append("numTeams", numTeams);
      if (torFile) formData.append("torFile", torFile);
      if (bakFile) formData.append("bakFile", bakFile);

      const res = await fetch("/api/data-team", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSuccess();
        onClose();
        // Reset form
        setRequestId("");
        setPartnerId("");
        setTorFile(null);
        setBakFile(null);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan data penunjukan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Partner to Request">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Pilih Request (PMO)</label>
          <select 
            className="w-full px-3.5 py-2.5 bg-alita-gray-50 border border-alita-gray-200 rounded-md text-sm text-alita-black focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">-- Pilih Request --</option>
            {requests.map(req => (
              <option key={req.id} value={req.id}>
                #{req.displayId} - {req.sowPekerjaan.substring(0, 40)}... ({req.jumlahKebutuhan} tim)
              </option>
            ))}
          </select>
          {requests.length === 0 && !loading && <p className="text-[10px] font-medium text-alita-orange-dark mt-1">Tidak ada request aktif yang tersedia atau quota tim sudah terpenuhi.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Pilih Partner (Perusahaan - PIC)</label>
          <select 
            className="w-full px-3.5 py-2.5 bg-alita-gray-50 border border-alita-gray-200 rounded-md text-sm text-alita-black focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">-- Pilih Partner --</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>
                {p.companyName || "No Company"} - {p.name} ({p.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Jumlah Team yang Ditugaskan</label>
          <input 
            type="number" 
            className="w-full px-3.5 py-2.5 bg-alita-gray-50 border border-alita-gray-200 rounded-md text-sm text-alita-black focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
            min="1"
            max={selectedReq ? selectedReq.jumlahKebutuhan - (selectedReq.totalRegisteredTeams || 0) : undefined}
            value={numTeams}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              const max = selectedReq ? selectedReq.jumlahKebutuhan - (selectedReq.totalRegisteredTeams || 0) : 999;
              if (val > max) {
                setNumTeams(max.toString());
              } else {
                setNumTeams(e.target.value);
              }
            }}
            required
          />
          <p className="text-[10px] text-alita-gray-400 mt-1 font-medium">
            {selectedReq ? (
              <>Maksimal: <strong className="text-alita-orange">{selectedReq.jumlahKebutuhan - (selectedReq.totalRegisteredTeams || 0)} tim lagi</strong> (Sesuai kuota request).</>
            ) : "* Tim akan dikonfigurasi sebagai placeholder untuk diisi oleh partner."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Upload TOR (Max 50MB)</label>
            <input 
              type="file" 
              className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-alita-gray-100 file:text-alita-gray-700 hover:file:bg-alita-gray-200 italic text-alita-gray-400" 
              onChange={(e) => setTorFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Upload BAK (Max 50MB)</label>
            <input 
              type="file" 
              className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-alita-gray-100 file:text-alita-gray-700 hover:file:bg-alita-gray-200 italic text-alita-gray-400" 
              onChange={(e) => setBakFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full mt-2 py-3.5 inline-flex items-center justify-center bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white border-none rounded-md text-sm font-bold cursor-pointer transition-all shadow-[0_2px_4px_rgba(255,122,0,0.2)] hover:shadow-orange hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
          disabled={submitting || loading}
        >
          {submitting ? "Memproses..." : "Assign & Update Status"}
        </button>
      </form>
    </Modal>
  );
}
