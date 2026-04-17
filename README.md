# Partner Team Onboarding System

Sistem Manajemen Onboarding Partner untuk **PT. Alita Praya Mitra**. Aplikasi ini dirancang untuk memfasilitasi proses pendaftaran, verifikasi, pelatihan, hingga penerbitan sertifikat bagi personil dari perusahaan partner secara digital dan terintegrasi.

## 🚀 Fitur Utama

- **Manajemen Request For Partner (RFP)**: Pembuatan permintaan kebutuhan personil oleh PMO Ops berdasarkan area dan spesialisasi.
- **Pendaftaran Tim & Personil**: Penginputan data tim oleh Admin Partner dengan fitur validasi otomatis.
- **Smart OCR Integration**: Ekstraksi data KTP secara otomatis menggunakan AI untuk mempercepat proses input dan verifikasi identitas.
- **Evaluasi QA & Training**: Manajemen jadwal pelatihan dan penilaian kelayakan personil oleh tim QA.
- **Penerbitan Sertifikat Otomatis**: Pembuatan sertifikat kompetensi berbasis template docx secara instan bagi personil yang lulus evaluasi.
- **Dashboard Eksekutif**: Ringkasan statistik pendaftaran dan status onboarding secara real-time.

## 🛠️ Tumpukan Teknologi

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router & Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [MySQL](https://www.mysql.com/)
- **Autentikasi**: [NextAuth.js](https://next-auth.js.org/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)

## 📦 Panduan Instalasi

### 1. Prasyarat
Pastikan Anda telah menginstal:
- Node.js v18.x atau lebih baru
- MySQL Server (versi 8.0 direkomendasikan)
- npm atau yarn

### 2. Kloning Repositori
```bash
git clone https://github.com/itappsalita/Partner-Team-Onboarding.git
cd Partner-Team-Onboarding
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Variabel Lingkungan
Buat file bernama `.env` di direktori root dan sesuaikan konfigurasinya:
```env
DATABASE_URL='mysql://user:password@localhost:3306/db_onboarding'
NEXTAUTH_URL='http://localhost:3000'
NEXTAUTH_SECRET='buat-kunci-acak-anda-disini'
```

### 5. Setup Database
Sinkronkan skema database menggunakan Drizzle:
```bash
npx drizzle-kit push
```

### 6. Menjalankan Aplikasi
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

## 🐳 Deployment dengan Docker (Produksi)

Aplikasi ini sudah dioptimalkan untuk berjalan di dalam kontainer menggunakan Docker.

1.  **Build & Run**:
    ```bash
    docker compose up -d --build
    ```
2.  **Detail Operasional**: Silakan baca panduan lengkap di [docs/docker-guide.md](./docs/docker-guide.md) untuk informasi mengenai manejemen variabel lingkungan, volume data, dan sinkronisasi database.

## ⚠️ Catatan Penting

- **Arsitektur Identitas**: Aplikasi ini menggunakan kombinasi **UUID v7** untuk kunci internal (mendukung performa indexing tinggi) dan **Display ID** (seperti `USR-00001`, `REQ-00001`) untuk navigasi pengguna yang human-readable.
- **Penyimpanan Media**: Seluruh file yang diunggah (KTP, Selfie, Sertifikat) disimpan di direktori `public/uploads/`. Pastikan direktori ini memiliki izin tulis (*write permission*).
- **Keamanan**: Password dienkripsi menggunakan `bcrypt` versi 10 putaran. Semua rute dilindungi oleh sesi autentikasi berdasarkan peran (*role-based access control*).

---
© 2026 PT. Alita Praya Mitra. Developed for internal onboarding efficiency.
