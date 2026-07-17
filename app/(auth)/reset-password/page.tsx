"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password minimal harus 6 karakter.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setError(data.error || "Gagal memperbarui password. Link mungkin kedaluwarsa.");
      }
    } catch {
      setError("Terjadi kesalahan teknis. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alita-black relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-right-[20%] before:w-175 before:h-175 before:bg-[radial-gradient(circle,rgba(255,122,0,0.12)_0%,transparent_70%)] before:rounded-full before:pointer-events-none after:content-[''] after:absolute after:-bottom-[30%] after:left-[-10%] after:w-125 after:h-125 after:bg-[radial-gradient(circle,rgba(255,122,0,0.06)_0%,transparent_70%)] after:rounded-full after:pointer-events-none">
        <div className="bg-alita-white p-10 md:p-11 rounded-xl w-full max-w-105 shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-500 ease-out">
          <div className="w-13 h-13 bg-red-500 rounded-lg flex items-center justify-center font-extrabold text-[1.5rem] text-alita-white mx-auto mb-6 shadow-lg shadow-red-500/20">!</div>
          <h1 className="text-2xl font-bold text-alita-black text-center tracking-tight mb-2">Invalid Link</h1>
          <p className="text-alita-gray-500 text-center mb-8 text-sm leading-relaxed px-4">Link reset password tidak valid atau tidak lengkap.</p>
          <div className="text-center">
            <Link href="/" className="text-alita-orange hover:text-alita-orange-dark text-[14px] font-semibold transition-colors">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-alita-black relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-right-[20%] before:w-175 before:h-175 before:bg-[radial-gradient(circle,rgba(255,122,0,0.12)_0%,transparent_70%)] before:rounded-full before:pointer-events-none after:content-[''] after:absolute after:-bottom-[30%] after:left-[-10%] after:w-125 after:h-125 after:bg-[radial-gradient(circle,rgba(255,122,0,0.06)_0%,transparent_70%)] after:rounded-full after:pointer-events-none">
      <div className="bg-alita-white p-10 md:p-11 rounded-xl w-full max-w-105 shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-500 ease-out">
        <div className="w-13 h-13 bg-linear-to-br from-alita-orange to-alita-orange-dark rounded-lg flex items-center justify-center font-extrabold text-[1.35rem] text-alita-white mx-auto mb-6 shadow-[0_4px_16px_rgba(255,122,0,0.3)]">A</div>
        <h1 className="text-2xl font-bold text-alita-black text-center tracking-tight mb-1">Reset Password</h1>
        <p className="text-alita-gray-500 text-center mb-8 text-sm">Silakan masukkan password baru Anda.</p>

        {message && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm border border-green-200 shadow-sm leading-relaxed">
            {message} Anda akan dialihkan ke halaman login dalam sekejap...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-600 p-3 rounded-md mb-5 text-[0.825rem] text-center border border-red-600/15 font-medium">{error}</div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[0.8rem] font-semibold mb-1.5 text-alita-gray-600 tracking-wide">New Password</label>
              <input
                type="password"
                className="w-full px-3.5 py-2.5 border border-alita-gray-200 rounded-md text-sm transition-all duration-150 bg-alita-gray-50 text-alita-black hover:border-alita-gray-300 focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow placeholder-alita-gray-400"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-[0.8rem] font-semibold mb-1.5 text-alita-gray-600 tracking-wide">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-3.5 py-2.5 border border-alita-gray-200 rounded-md text-sm transition-all duration-150 bg-alita-gray-50 text-alita-black hover:border-alita-gray-300 focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow placeholder-alita-gray-400"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 inline-flex items-center justify-center gap-2 bg-linear-to-br from-alita-orange to-alita-orange-dark text-alita-white border-none rounded-md text-sm font-semibold cursor-pointer transition-all duration-150 shadow-[0_2px_4px_rgba(255,122,0,0.2)] hover:shadow-orange hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              disabled={loading}
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-alita-black"><div className="w-10 h-10 border-4 border-alita-orange/10 border-l-alita-orange rounded-full animate-spin" /></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
