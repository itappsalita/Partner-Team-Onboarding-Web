"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || "Gagal mengirim permintaan. Silakan coba lagi.");
      }
    } catch {
      setError("Terjadi kesalahan teknis. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-alita-black relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-right-[20%] before:w-175 before:h-175 before:bg-[radial-gradient(circle,rgba(255,122,0,0.12)_0%,transparent_70%)] before:rounded-full before:pointer-events-none after:content-[''] after:absolute after:-bottom-[30%] after:left-[-10%] after:w-125 after:h-125 after:bg-[radial-gradient(circle,rgba(255,122,0,0.06)_0%,transparent_70%)] after:rounded-full after:pointer-events-none">
      <div className="bg-alita-white p-10 md:p-11 rounded-xl w-full max-w-105 shadow-[0_25px_60px_rgba(0,0,0,0.4)] relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-500 ease-out">
        <div className="w-13 h-13 bg-linear-to-br from-alita-orange to-alita-orange-dark rounded-lg flex items-center justify-center font-extrabold text-[1.35rem] text-alita-white mx-auto mb-6 shadow-[0_4px_16px_rgba(255,122,0,0.3)]">A</div>
        <h1 className="text-2xl font-bold text-alita-black text-center tracking-tight mb-1">Forgot Password</h1>
        <p className="text-alita-gray-500 text-center mb-8 text-sm px-4">Masukkan email Anda untuk menerima instruksi reset password.</p>

        {message && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm border border-green-200 shadow-sm leading-relaxed">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-600 p-3 rounded-md mb-5 text-[0.825rem] text-center border border-red-600/15 font-medium">{error}</div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-[0.8rem] font-semibold mb-1.5 text-alita-gray-600 tracking-wide">Email Address</label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 border border-alita-gray-200 rounded-md text-sm transition-all duration-150 bg-alita-gray-50 text-alita-black hover:border-alita-gray-300 focus:outline-none focus:border-alita-orange focus:bg-alita-white focus:ring-4 focus:ring-alita-orange-glow placeholder-alita-gray-400"
                placeholder="you@alita.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 inline-flex items-center justify-center gap-2 bg-linear-to-br from-alita-orange to-alita-orange-dark text-alita-white border-none rounded-md text-sm font-semibold cursor-pointer transition-all duration-150 shadow-[0_2px_4px_rgba(255,122,0,0.2)] hover:shadow-orange hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="text-alita-orange hover:text-alita-orange-dark text-[14px] font-semibold transition-colors">
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}
