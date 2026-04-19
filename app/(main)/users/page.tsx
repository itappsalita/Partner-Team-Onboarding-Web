"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "../../../components/Modal";

const ROLES = ['SUPERADMIN', 'PARTNER', 'PMO_OPS', 'PROCUREMENT', 'QA', 'PEOPLE_CULTURE'];

export default function UsersPage() {
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "PARTNER",
    companyName: ""
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ name: "", email: "", password: "", role: "PARTNER", companyName: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      password: "", // Leave blank for password reset
      role: user.role,
      companyName: user.companyName || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/users";
      const method = modalMode === 'create' ? "POST" : "PUT";
      const body = modalMode === 'create' 
        ? formData 
        : { ...formData, id: selectedUser.id };

      // If editing and password is empty, don't send it to prevent hashing empty string
      if (modalMode === 'edit' && !formData.password) {
        delete (body as any).password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        // If the updated user is the current logged-in user, update the session
        if (modalMode === 'edit' && selectedUser?.id?.toString() === (session?.user as any)?.id?.toString()) {
          console.log("Updating session for current user...");
          await update({ name: formData.name });
        }

        setIsModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal memproses data user");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: user.isActive === 1 ? 0 : 1 })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengubah status user.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const filteredUsers = users.filter(user => {
    // 1. Search Name / Email
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = user.name?.toLowerCase().includes(q);
      const matchEmail = user.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    // 2. Filter Role
    if (filterRole && user.role !== filterRole) return false;

    return true;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="animate-in fade-in transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-alita-black tracking-tight leading-none mb-2">User Settings</h1>
          <p className="text-alita-gray-500 text-sm font-medium">Kelola akun pengguna, peran, dan akses sistem.</p>
        </div>
        <button 
          className="bg-alita-black text-alita-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-alita-gray-800 transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-2" 
          onClick={handleOpenCreate}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          Register New User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full max-w-4xl">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Cari Nama atau Email..." 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div className="relative group">
            <select 
              className="w-full pl-10 pr-4 py-3 bg-alita-white border border-alita-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow transition-all shadow-sm appearance-none"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">Semua Role (Kategori)</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-alita-gray-300 group-focus-within:text-alita-orange transition-colors italic">🔑</span>
          </div>
        </div>

        {(searchQuery || filterRole) && (
          <button 
            onClick={() => {
              setSearchQuery("");
              setFilterRole("");
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Perusahaan / Partner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">PIC Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Email Address</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-alita-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-alita-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-8" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-28" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-24" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-4 w-36" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-5"><div className="skeleton h-6 w-16" /></td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <svg className="w-12 h-12 text-alita-gray-200 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <div className="text-sm font-bold text-alita-gray-400">Tidak ada user ditemukan</div>
                  <div className="text-xs text-alita-gray-300 mt-1">Coba ubah filter atau daftarkan user baru</div>
                </td></tr>
              ) : (
                currentItems.map((user) => (
                  <tr key={user.id} className="hover:bg-orange-50/30 transition-all duration-200 table-row-hover">
                    <td className="px-6 py-5 text-sm font-bold text-alita-gray-400">#{user.displayId}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight">{user.companyName || "-"}</div>
                      <div className="text-[10px] font-black text-alita-gray-400 uppercase tracking-widest mt-0.5">{user.role === 'PARTNER' ? 'PARTNER' : 'INTERNAL'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-alita-black tracking-tight">{user.name}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-alita-gray-600 font-medium">{user.email}</td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-alita-gray-50 border border-alita-gray-200 rounded-full text-[9px] font-black uppercase text-alita-gray-500 tracking-wider shadow-sm">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition-colors ${
                        user.isActive === 1 
                          ? "text-green-700 bg-green-50 border-green-100" 
                          : "text-red-600 bg-red-50 border-red-100"
                      }`}>
                        {user.isActive === 1 ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button 
                          className="px-3 py-1.5 bg-alita-white border border-alita-gray-200 rounded-lg text-[11px] font-bold text-alita-gray-600 hover:bg-alita-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2" 
                          onClick={() => handleOpenEdit(user)}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          EDIT
                        </button>
                        <button 
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-95 min-w-[120px] border flex items-center justify-center gap-2 ${
                            user.isActive === 1 
                              ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                              : "bg-alita-black text-alita-white border-alita-black hover:bg-alita-gray-800"
                          }`}
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.isActive === 1 ? (
                            <>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                              DEACTIVATE
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"></path><path d="M12 6V12L16 14"></path></svg>
                              ACTIVATE
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

        {/* Pagination Footer */}
        {!loading && filteredUsers.length > 0 && (
          <div className="px-6 py-4 bg-alita-gray-50 border-t border-alita-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-alita-gray-400">
              Showing <span className="text-alita-black">{indexOfFirstItem + 1}</span> to <span className="text-alita-black">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="text-alita-black">{filteredUsers.length}</span> results
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
        title={modalMode === 'create' ? "Register New Account" : "Edit User Account"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Nama PIC Partner</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all" 
              placeholder="PIC Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          {formData.role === 'PARTNER' && (
            <div className={`flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300 ${modalMode === 'edit' ? 'opacity-70' : ''}`}>
              <label className="text-xs font-bold uppercase tracking-wider text-alita-orange flex items-center gap-2">
                Nama Perusahaan Partner
                {modalMode === 'edit' && <span className="text-[9px] bg-alita-orange/10 px-1.5 py-0.5 rounded text-alita-orange">LOCKED</span>}
              </label>
              <input 
                type="text" 
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-bold focus:outline-none transition-all shadow-sm ${
                  modalMode === 'edit' 
                    ? "bg-alita-gray-100 border-alita-gray-200 text-alita-gray-400 cursor-not-allowed" 
                    : "bg-alita-white border-alita-orange/30 text-alita-black focus:border-alita-orange focus:ring-4 focus:ring-alita-orange-glow"
                }`} 
                placeholder="Contoh: PT. Alita Praya Mitra"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
                disabled={modalMode === 'edit'}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">Email Address</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
              placeholder="user@alita.id"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className={`flex flex-col gap-1.5 ${modalMode === 'edit' ? 'opacity-70' : ''}`}>
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500 flex items-center gap-2">
              User Role
              {modalMode === 'edit' && <span className="text-[9px] bg-alita-gray-200 px-1.5 py-0.5 rounded text-alita-gray-500">LOCKED</span>}
            </label>
            <select 
              className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition-all shadow-sm ${
                modalMode === 'edit'
                  ? "bg-alita-gray-100 border-alita-gray-200 text-alita-gray-400 cursor-not-allowed appearance-none"
                  : "bg-alita-gray-50 border-alita-gray-200 text-alita-black focus:border-alita-orange focus:bg-alita-white"
              }`}
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              required
              disabled={modalMode === 'edit'}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-alita-gray-500">
              {modalMode === 'create' ? "Password" : "Reset Password"}
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-3 bg-alita-gray-50 border border-alita-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required={modalMode === 'create'}
            />
            {modalMode === 'edit' && <p className="text-[10px] font-medium text-alita-gray-400 mt-1 italic">* Kosongkan jika tidak ingin mengubah password.</p>}
          </div>

          <button 
            type="submit" 
            className="w-full mt-4 py-4 bg-gradient-to-br from-alita-orange to-alita-orange-dark text-alita-white rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-lg hover:shadow-orange hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Processing..." : (modalMode === 'create' ? "Register User" : "Update User Account")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
