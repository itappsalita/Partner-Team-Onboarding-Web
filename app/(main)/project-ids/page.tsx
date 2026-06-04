"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "../../../components/Modal";

interface ProjectId {
  id: number;
  projectId: string;
  projectName: string;
  isActive: number;
  createdAt: string;
}

export default function ProjectIdsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [items, setItems] = useState<ProjectId[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ProjectId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({ projectId: "", projectName: "" });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/project-ids?all=true");
      const data = await res.json();
      if (Array.isArray(data.data)) setItems(data.data);
    } catch {
      console.error("Failed to fetch project IDs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ projectId: "", projectName: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProjectId) => {
    setModalMode("edit");
    setSelected(item);
    setFormData({ projectId: item.projectId, projectName: item.projectName });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = modalMode === "create" ? "POST" : "PUT";
      const body = modalMode === "create" ? formData : { ...formData, id: selected!.id };

      const res = await fetch("/api/project-ids", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal memproses data");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item: ProjectId) => {
    try {
      const res = await fetch("/api/project-ids", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: item.isActive === 1 ? 0 : 1 }),
      });
      if (res.ok) {
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const filtered = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.projectId.toLowerCase().includes(q) ||
      item.projectName.toLowerCase().includes(q)
    );
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">Project ID</h1>
          <p className="text-alita-gray-500 text-sm font-medium">Kelola daftar Project ID yang digunakan pada Request for Partner.</p>
        </div>
        <button
          className="bg-alita-black text-alita-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-alita-gray-800 transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-2"
          onClick={handleOpenCreate}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Project ID
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="relative group w-full max-w-sm">
          <input
            type="text"
            placeholder="Cari Project ID atau Nama..."
            className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="px-5 py-3 bg-alita-white border border-alita-gray-200 text-alita-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Reset
          </button>
        )}
      </div>

      <div className="bg-alita-white rounded-2xl shadow-sm border border-alita-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-alita-gray-50">
              <tr className="border-b border-alita-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">No</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Project ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Project Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-6" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-48" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-6 w-28" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <div className="text-sm font-bold text-alita-gray-400">Belum ada Project ID</div>
                    <div className="text-xs text-alita-gray-300 mt-1">Tambahkan Project ID baru dengan tombol di atas</div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-all duration-200">
                    <td className="px-6 py-5 text-sm font-bold text-alita-gray-400">{indexOfFirst + idx + 1}</td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-black text-alita-black tracking-tight">{item.projectId}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-alita-gray-600">{item.projectName}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition-colors ${
                        item.isActive === 1
                          ? "text-green-700 bg-green-50 border-green-100"
                          : "text-red-600 bg-red-50 border-red-100"
                      }`}>
                        {item.isActive === 1 ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          EDIT
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-95 min-w-[110px] border flex items-center justify-center gap-2 ${
                            item.isActive === 1
                              ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                              : "bg-alita-black text-alita-white border-alita-black hover:bg-alita-gray-800"
                          }`}
                          onClick={() => toggleStatus(item)}
                        >
                          {item.isActive === 1 ? (
                            <>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
                              </svg>
                              NONAKTIFKAN
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 6V12L16 14"/>
                              </svg>
                              AKTIFKAN
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{indexOfFirst + 1}</span> to{" "}
              <span className="text-alita-black">{Math.min(indexOfLast, filtered.length)}</span> of{" "}
              <span className="text-alita-black">{filtered.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                        ? "bg-alita-black text-alita-white"
                        : "bg-alita-white border border-alita-gray-200 text-alita-gray-400 hover:border-alita-black hover:text-alita-black"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
        title={modalMode === "create" ? "Add Project ID" : "Edit Project ID"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Project ID</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
              placeholder="Contoh: PRJ-001"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Project Name</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
              placeholder="Contoh: Proyek Infrastruktur Jawa Barat"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full mt-4 py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Memproses..." : modalMode === "create" ? "Tambah Project ID" : "Simpan Perubahan"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
