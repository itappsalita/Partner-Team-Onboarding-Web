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
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Tim" : "Tambah Tim Baru"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nomor Tim</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.teamNumber}
              onChange={(e) => setFormData({ ...formData, teamNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Posisi Pekerjaan</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Leader</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.leaderName}
              onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">No. HP Leader</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.leaderPhone}
              onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Lokasi Kerja</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-bold text-gray-800 mb-2">Dokumen Kelengkapan Tim (Leader)</h4>
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500">No. TKPK 1</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={formData.tkpk1Number}
                    onChange={(e) => setFormData({ ...formData, tkpk1Number: e.target.value })}
                  />
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setFormData({ ...formData, tkpk1File: e.target.files?.[0] || null })}
                />
             </div>
             
             <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500">No. Sertifikat P3K</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={formData.firstAidNumber}
                    onChange={(e) => setFormData({ ...formData, firstAidNumber: e.target.value })}
                  />
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setFormData({ ...formData, firstAidFile: e.target.files?.[0] || null })}
                />
             </div>

             <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500">No. Sertifikat Listrik</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    value={formData.electricalNumber}
                    onChange={(e) => setFormData({ ...formData, electricalNumber: e.target.value })}
                  />
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setFormData({ ...formData, electricalFile: e.target.files?.[0] || null })}
                />
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || isStructuralReadOnly}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {submitting ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Buat Tim")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
