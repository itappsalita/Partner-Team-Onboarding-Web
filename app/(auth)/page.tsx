"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function LoginPage() {
  const { data: status } = useSession() as { data: string | null };
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = [
    { src: "/images/campaign-trust.png", alt: "Campaign Trust" },
    { src: "/images/campaign-pdp.png", alt: "Campaign PDP" },
  ];

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (isPaused) return;
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, slides.length]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="w-8 h-8 border-2 border-alita-gray-200 border-t-alita-orange rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email atau password salah. Silakan coba lagi.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f4]">
      {/* Top nav bar */}
      <nav className="h-14 bg-white border-b border-[#ebebeb] flex items-center px-6 shrink-0 z-10 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Alita Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
          <span className="text-alita-orange font-bold text-[1.05rem] tracking-tight leading-none self-end mb-0.1">
            Partner Onboarding
          </span>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Campaign Panel - kiri (carousel) */}
        <div
          className="hidden lg:flex flex-1 flex-col relative overflow-hidden bg-[#f0f0f0]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Slides */}
          <div className="relative flex-1">
            {slides.map((slide, i) => (
              <div
                key={slide.src}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  i === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  className="object-contain object-center p-10"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>

          {/* Dot navigation */}
          <div className="flex items-center justify-center gap-2 pb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentSlide(i);
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  setIsPaused(false);
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "w-6 h-2 bg-alita-orange"
                    : "w-2 h-2 bg-alita-gray-300 hover:bg-alita-gray-400"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-alita-gray-200">
            <div
              key={currentSlide}
              className={`h-full bg-alita-orange ${isPaused ? "" : "animate-[progress_4s_linear_forwards]"}`}
            />
          </div>
        </div>

        {/* Login Panel - kanan */}
        <div className="w-full lg:w-120 lg:shrink-0 bg-white flex flex-col justify-center px-12 py-14 animate-in fade-in slide-in-from-right-4 duration-400 ease-out">
          <h1 className="text-3xl font-bold text-[#2d2d2d] mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-alita-gray-400 mb-9 leading-relaxed">
            Masuk dengan akun kamu untuk melanjutkan.
          </p>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-[0.8rem] text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#555] mb-1.5 tracking-wide uppercase">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-[#f7f8fa] border border-[#e8e8e8] rounded-xl px-4 py-3 transition-all duration-150 focus-within:border-alita-orange focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(255,122,0,0.08)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-alita-gray-400 shrink-0"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  type="email"
                  className="flex-1 bg-transparent text-sm text-[#2d2d2d] focus:outline-none placeholder-alita-gray-300"
                  placeholder="you@alita.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#555] tracking-wide uppercase">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-alita-orange hover:text-alita-orange-dark transition-colors font-medium"
                >
                  Lupa Password?
                </Link>
              </div>
              <div className="flex items-center gap-3 bg-[#f7f8fa] border border-[#e8e8e8] rounded-xl px-4 py-3 transition-all duration-150 focus-within:border-alita-orange focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(255,122,0,0.08)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-alita-gray-400 shrink-0"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  className="flex-1 bg-transparent text-sm text-[#2d2d2d] focus:outline-none placeholder-alita-gray-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="text-alita-gray-300 hover:text-alita-gray-500 select-none transition-colors"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full mt-7 py-3.5 rounded-xl bg-linear-to-r from-alita-orange to-alita-orange-dark text-white text-sm font-semibold shadow-[0_4px_14px_rgba(255,122,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,122,0,0.45)] hover:-translate-y-px active:translate-y-0 active:brightness-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Social links */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#ebebeb]" />
              <span className="text-xs text-alita-gray-300 whitespace-nowrap">
                Atau kunjungi kami di
              </span>
              <div className="flex-1 h-px bg-[#ebebeb]" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://www.instagram.com/alitaindonesia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-linear-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="0.5"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
              <a
                href="https://id.linkedin.com/company/pt.-alita-praya-mitra"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-full bg-[#0077b5] flex items-center justify-center text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://alita.id"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                className="w-10 h-10 rounded-full bg-alita-orange flex items-center justify-center text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="mt-auto pt-10 text-xs text-alita-gray-300 text-center">
            PT. Alita Praya Mitra &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
