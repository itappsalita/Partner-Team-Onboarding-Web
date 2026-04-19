# Tutorial Deployment: Automated CI/CD & Multi-Environment 🚀

Panduan ini dirancang untuk mendampingi Anda dari nol hingga memiliki sistem deployment otomatis yang profesional menggunakan **GitHub Actions** ke dua lingkungan terpisah (**Dev** dan **Prod**) di dua VM yang berbeda.

---

## 🏗️ Arsitektur Sistem

Aplikasi **Partner Team Onboarding** dijalankan pada dua server terpisah untuk menjaga stabilitas produksi:

| Komponen | Development (Uji Coba) | Production (Asli) |
| :--- | :--- | :--- |
| **Domain** | `dev.partner-onboarding.alita.id` | `partner-onboarding.alita.id` |
| **Branch GitHub** | `develop` | `main` |
| **Internal Port** | `3001` | `3000` |
| **Docker Compose** | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| **Automasi** | Auto-deploy via Push | Auto-deploy via Push |

---

## 📋 Rekomendasi Spesifikasi Server

Sangat disarankan untuk mengikuti spesifikasi berikut agar proses berat seperti **Penerbitan Sertifikat PDF** dan **Ekspor Excel Bermedia** berjalan lancar.

| Komponen | VM Development | VM Production |
| :--- | :--- | :--- |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **CPU** | 1-2 vCPU | 2-4 vCPU |
| **RAM** | 2 GB | 4 GB - 8 GB (Aman untuk Chromium) |
| **Storage** | 20 GB | 40 GB - 80 GB |
| **Docker** | 20.10+ | 20.10+ |

---

## Bab 1: Persiapan Dasar Server

Langkah-langkah berikut adalah **setup awal (sekali saja)** yang dilakukan pada **KEDUA VM** (Dev dan Prod) agar server siap menerima kode aplikasi.

### 1. Masuk ke Dalam Server (SSH Access)
**Tujuan**: Memberikan Anda akses kendali jarak jauh ke "komputer" server dari laptop Anda.
Buka terminal dan masuk menggunakan SSH:
```bash
ssh root@[IP_SERVER_ANDA]
```
Jalankan pembaruan sistem keamanan untuk memastikan server memiliki *patch* terbaru:
```bash
apt update && apt upgrade -y
```

### 2. Instalasi Docker (Mesin Aplikasi)
**Tujuan**: Menginstal "mesin penggerak". Aplikasi ini dibungkus dalam kontainer Docker agar bisa berjalan di mana saja dengan stabil, tanpa perlu menginstal Node.js atau MySQL secara manual di server.
Jalankan perintah otomatis ini untuk menginstal Docker Engine & Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

### 3. Mengambil Kode Aplikasi (Git Synchronization)
**Tujuan**: Membawa "isi" aplikasi (source code) dari GitHub ke dalam server. Folder yang dihasilkan akan menjadi lokasi utama di mana sistem otomatis (GitHub Actions) bekerja.
Masuk ke direktori home dan kloning repositori:
```bash
cd ~
git clone https://github.com/itappsalita/Partner-Team-Onboarding.git
cd Partner-Team-Onboarding
```

---

## Bab 2: Konfigurasi Otomatisasi (CI/CD)

Ini adalah langkah krusial agar setiap ada perubahan kode, server otomatis ter-update tanpa perlu login manual.

### 1. Daftarkan GitHub Secrets
Buka repositori Anda di GitHub, lalu ke **Settings** -> **Secrets and variables** -> **Actions**. Tambahkan:

- **Untuk Dev**:
  * `DEV_SSH_HOST`: IP VM Dev.
  * `DEV_SSH_USER`: Username (biasanya `root`).
  * `DEV_SSH_KEY`: Private SSH Key Anda.
- **Untuk Prod**:
  * `PROD_SSH_HOST`: IP VM Prod.
  * `PROD_SSH_USER`: Username.
  * `PROD_SSH_KEY`: Private SSH Key.

### 2. Pengaturan File Rahasia (.env)
Buat file rahasia di masing-masing server secara manual untuk pertama kali:
*   **Di VM Dev**: `nano .env.development`
*   **Di VM Prod**: `nano .env.production`

Isi sesuai dengan database dan URL masing-masing lingkungan.

---

## Bab 3: Menjalankan Aplikasi

### Opsi A: Jalur Otomatis (Rekomendasi)
Cukup lakukan Push atau Merge ke branch yang sesuai:
-   Push ke branch `develop` -> GitHub Actions akan men-deploy ke **VM Dev**.
-   Push ke branch `main` -> GitHub Actions akan men-deploy ke **VM Prod**.

### Opsi B: Jalur Manual (Darurat)
Jika terjadi kendala pada internet atau GitHub:
```bash
# Di VM Dev
docker compose -f docker-compose.dev.yml up -d --build

# Di VM Prod
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Bab 4: Konfigurasi Domain (Nginx)

Anda memiliki dua pilihan untuk mengatur domain agar bisa diakses via HTTPS (Gembok Hijau).

### Opsi 1: Nginx Proxy Manager (GUI - Sangat Mudah)
Jika Anda lebih suka tampilan visual:
1.  Buat folder: `mkdir ~/npm-proxy && cd ~/npm-proxy`.
2.  Buat `docker-compose.yml` berisi image `jc21/nginx-proxy-manager`.
3.  Akses port `81` di browser.
4.  Tambahkan **Proxy Host**:
    -   Domain: `dev.partner-onboarding.alita.id` -> Forward ke IP:Localhost Port: `3001`.
    -   Domain: `partner-onboarding.alita.id` -> Forward ke IP:Localhost Port: `3000`.
5.  Gunakan tab **SSL** untuk mengaktifkan "Request a New SSL Certificate".

### Opsi 2: Nginx Manual (Teks - Lebih Stabil)
Gunakan template konfigurasi yang tersedia di folder `nginx/conf.d/app.conf` pada proyek ini sebagai referensi untuk dipasang di `/etc/nginx/conf.d/` server Anda.

---

## Bab 5: Finalisasi & Pemeliharaan Data

### 1. Inisialisasi Database
Saat pertama kali aplikasi berjalan, tata struktur database-nya:
```bash
# Jalankan dari dalam folder proyek di server
npx drizzle-kit push
```

### 2. Persistensi Data (Sangat Penting)
Pastikan folder berikut di-backup secara rutin karena menyimpan dokumen fisik:
-   `./public/uploads`: Foto KTP, Selfie, dan Sertifikat PDF.
-   Volume `mysql_data_dev` / `mysql_data_prod`: Seluruh data transaksi.

### 3. Troubleshooting
Gunakan perintah berikut jika aplikasi terasa lambat atau tidak bisa diakses:
```bash
# Cek apakah container berjalan
docker compose ps

# Intip log error aplikasi
docker compose logs -f app

# Bersihkan image lama yang tidak terpakai (menghemat disk)
docker image prune -f
```

---

## Bab 6: Verifikasi Akhir
Setelah semua jalan, pastikan akses portal dokumentasi API untuk memastikan backend sinkron:
-   URL: `https://[DOMAIN_ANDA]/api-docs`
-   Pastikan list API muncul dan bisa dicoba.

---
© 2026 PT. Alita Praya Mitra. Developed for Success with Focus on Automation & Reliability.
