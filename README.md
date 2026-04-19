# Partner Team Onboarding System

Sistem Manajemen Onboarding Partner untuk **PT. Alita Praya Mitra**. Aplikasi ini dirancang untuk memfasilitasi proses pendaftaran, verifikasi, pelatihan, hingga penerbitan sertifikat bagi personil dari perusahaan partner secara digital, aman, dan terintegrasi.

## 🚀 Fitur Utama & Keunggulan

- **Manajemen Request For Partner (RFP)**: Alur pembuatan permintaan kebutuhan personil yang terstruktur berdasarkan area dan kualifikasi.
- **Ekspor Excel Premium**: Fitur ekspor data tim per penugasan yang mendukung penyisipan **Foto KTP dan Foto Selfie** secara langsung ke dalam baris Excel menggunakan `exceljs`.
- **Mesin Sertifikat PDF (Puppeteer)**: Penerbitan sertifikat kompetensi berbasis PDF yang dirender secara presisi menggunakan mesin Chromium, lengkap dengan QR Code validasi.
- **Smart Credential Issuance**: Logika penerbitan akses (Email & Password) yang cerdas; mencegah duplikasi file sertifikat saat pembaruan kredensial dilakukan.
- **Dokumentasi API Interaktif (Swagger)**: Portal dokumentasi teknis di `/api-docs` yang memungkinkan pengujian API secara langsung (*live testing*) bagi tim teknis Alita.
- **Standarisasi UI/UX Modern**: Antarmuka premium dengan sistem *badge* bergaya *rounded-pill* dan tombol aksi berbasis ikon SVG yang seragam di seluruh modul.
- **Dashboard Real-Time Berbasis Role**: 
  - **Internal Alita**: Prioritas tampilan permintaan dan mitra aktif.
  - **Partner**: Prioritas tampilan personil tersertifikasi.
  - **Akurasi Data**: Seluruh statistik secara otomatis memfilter hanya anggota tim yang berstatus aktif.

## 🛠️ Tumpukan Teknologi

- **Framework**: [Next.js 16.2.3](https://nextjs.org/) (App Router & Turbopack)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Frontend**: [React 19](https://react.dev/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [MySQL](https://www.mysql.com/)
- **Autentikasi**: [NextAuth.js](https://next-auth.js.org/)
- **PDF Engine**: [Puppeteer](https://pptr.dev/)
- **Excel Engine**: [ExcelJS](https://github.com/exceljs/exceljs)
- **API Documentation**: [Swagger (OpenAPI 3.0)](https://swagger.io/)

## 📦 Panduan Instalasi

### 1. Prasyarat
Pastikan Anda telah menginstal:
- Node.js v18.x atau lebih baru (v20+ direkomendasikan)
- MySQL Server 8.0+
- npm atau yarn

### 2. Kloning & Instalasi
```bash
git clone https://github.com/itappsalita/Partner-Team-Onboarding.git
cd Partner-Team-Onboarding
npm install
```

### 3. Konfigurasi Lokal
Lengkapi file `.env.local` di direktori root untuk pengembangan lokal:
```env
DATABASE_URL='mysql://user:password@localhost:3306/db_onboarding'
NEXTAUTH_URL='http://localhost:3000'
NEXTAUTH_SECRET='kunci-keamanan-anda'
```

### 🐳 Deployment & CI/CD (Otomatis)

Aplikasi ini mendukung deployment otomatis menggunakan **GitHub Actions** ke dua lingkungan (VM) terpisah:

| Environment | Domain | Branch | Port | Docker Compose |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | `dev.partner-onboarding.alita.id` | `develop` | 3001 | `docker-compose.dev.yml` |
| **Production** | `partner-onboarding.alita.id` | `main` | 3000 | `docker-compose.prod.yml` |

#### Alur Kerja Deployment
1. **Push ke `develop`**: Otomatis update di server Dev.
2. **Push ke `main`**: Otomatis update di server Prod.

#### Konfigurasi GitHub Secrets
Pastikan Anda telah menambahkan *Secrets* berikut di repositori GitHub:
- `DEV_SSH_HOST`, `DEV_SSH_USER`, `DEV_SSH_KEY`
- `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`

### 1. Persiapan Environment
Pilih file `.env` yang sesuai sebelum menjalankan Docker secara manual (jika diperlukan):
- Gunakan `.env.development` untuk Dev.
- Gunakan `.env.production` untuk Prod.

### 2. Build & Run Manual
Jika ingin menjalankan secara manual di server:
```bash
# Untuk Dev
docker compose -f docker-compose.dev.yml up -d --build

# Untuk Prod
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Manajemen Data (Persistensi)
Sangat penting untuk memastikan data unggahan personil tidak hilang. Konfigurasi volume berikut sudah terpasang secara default:
- **Media**: `./public/uploads` di-mount ke kontainer untuk menyimpan KTP, Selfie, dan Sertifikat.
- **Database**: Volume `mysql_data_dev` (Dev) atau `mysql_data_prod` (Prod) dikelola oleh Docker untuk menyimpan data relasional secara persisten.

### 4. Optimalisasi Performa
`Dockerfile` menggunakan metode **Multi-stage Build** dan **Standalone Output** dari Next.js untuk menghasilkan *image* yang ringan dan efisien untuk produksi.

## ⚠️ Catatan Operasional & Arsitektur

- **Sinkronisasi Status Proaktif**: Sistem menggunakan fungsi *cascading recalculation* di level database utilitas. Setiap perubahan pada anggota tim atau detail tim akan secara otomatis memperbarui status di level penugasan (`ASG`) hingga request (`REQ`) utama.
- **Veteran/Returning Personnel**: Sistem secara otomatis mendeteksi NIK yang pernah terdaftar (status `isActive=0`) untuk memulihkan data sertifikat dan kredensial lama, memfasilitasi penugasan ulang yang cepat.
- **Penyimpanan Media**: Dokumen teknis dan foto personil disimpan di `/public/uploads/`. Pastikan folder ini memiliki izin akses yang tepat pada lingkungan produksi.
- **Dokumentasi API (Swagger)**: Portal tersedia di `/api-docs`. Seluruh endpoint dilindungi oleh autentikasi untuk menjaga keamanan data operasional. Informasi teknis rute (`GET`, `POST`, `PUT`, `DELETE`) dan skema data dapat diuji langsung dari portal ini untuk mempercepat integrasi atau audit sistem.

---
© 2026 PT. Alita Praya Mitra. Developed with Focus on Efficiency & UX Excellence.
