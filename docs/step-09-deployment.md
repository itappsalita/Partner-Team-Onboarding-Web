# Tutorial Deployment: Automated CI/CD & Multi-Environment 🚀

Panduan ini dirancang untuk mendahului Anda dari nol hingga memiliki sistem deployment otomatis yang profesional menggunakan **GitHub Actions** ke dua lingkungan terpisah (**Dev** dan **Prod**) di dua VM yang berbeda.

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
**Tujuan**: Memberikan Anda akses kendali jarak jauh ke server.
Buka terminal laptop Anda dan masuk menggunakan SSH:
```bash
ssh root@[IP_SERVER_ANDA]
```
Jalankan pembaruan sistem keamanan:
```bash
apt update && apt upgrade -y
```

### 2. Instalasi Docker (Mesin Aplikasi)
**Tujuan**: Menginstal mesin penggerak kontainer agar aplikasi bisa berjalan stabil.
Jalankan perintah otomatis ini:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

### 3. Mengambil Kode Aplikasi (Git Synchronization)
**Tujuan**: Menyiapkan folder proyek yang akan di-update otomatis oleh GitHub.
Masuk ke direktori home server dan kloning repositori:
```bash
cd ~
git clone https://github.com/itappsalita/Partner-Team-Onboarding-Web.git
cd Partner-Team-Onboarding-Web
```

---

## Bab 2: Konfigurasi Keamanan (SSH Keys)

Setelah server siap, kita harus membuat "kunci" agar GitHub bisa masuk ke server secara otomatis tanpa menggunakan password.

### 1. Membuat SSH Key Baru
Lakukan perintah ini di **terminal laptop Anda**:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```
- Tekan `Enter` untuk lokasi default.
- Kosongkan passphrase (tekan `Enter` 2x) agar otomatisasi tidak terhambat.

**Hasil:**
- Kunci Privat: `~/.ssh/id_ed25519`
- Kunci Publik: `~/.ssh/id_ed25519.pub`

### 2. Mendaftarkan Kunci Publik ke Server
Lakukan ini pada **kedua VM** (Dev & Prod):
1. Salin isi kunci publik dari laptop Anda: `cat ~/.ssh/id_ed25519.pub`.
2. Masuk ke server via SSH (Bab 1).
3. Tempelkan kunci tersebut ke dalam file authorized keys server:
   ```bash
   mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys
   ```
4. Simpan (`Ctrl+O`, `Enter`) dan Keluar (`Ctrl+X`).

---

## Bab 3: Konfigurasi GitHub Secrets

Agar alur CI/CD di GitHub mengenali "kunci" dan "alamat" server Anda.

1. Buka repositori GitHub Anda -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Klik **New repository secret** dan tambahkan variabel berikut:

| Nama Secret | Isi / Nilai |
| :--- | :--- |
| `DEV_SSH_KEY` | Isi dengan Kunci Privat dari laptop Anda (`cat ~/.ssh/id_ed25519`). |
| `DEV_SSH_HOST` | IP Publik VM Development. |
| `DEV_SSH_USER` | `root` (atau username server Anda). |
| `PROD_SSH_KEY` | Isi dengan Kunci Privat yang sama (atau beda). |
| `PROD_SSH_HOST`| IP Publik VM Production. |
| `PROD_SSH_USER`| `root`. |

---

## Bab 4: Pengaturan File Rahasia (.env)

Buat file variabel lingkungan di masing-masing server secara manual untuk pertama kali agar aplikasi tahu URL dan database yang digunakan:

*   **Di VM Dev**: `nano ~/Partner-Team-Onboarding-Web/.env.development`
*   **Di VM Prod**: `nano ~/Partner-Team-Onboarding-Web/.env.production`

*Isi file disesuaikan dengan domain dan password database masing-masing.*

---

## Bab 5: Menjalankan Deployment

### Opsi A: Jalur Otomatis (Rekomendasi)
Cukup lakukan Push atau Merge ke branch yang sesuai dari laptop Anda:
-   Push ke branch `develop` -> GitHub Actions akan men-deploy ke **VM Dev**.
-   Push ke branch `main` -> GitHub Actions akan men-deploy ke **VM Prod**.

### Opsi B: Jalur Manual (Darurat)
Jika terjadi kendala pada GitHub, login ke server dan jalankan:
```bash
# Di VM Dev
docker compose -f docker-compose.dev.yml up -d --build

# Di VM Prod
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Bab 6: Konfigurasi Domain & HTTPS (Nginx)

### Opsi 1: Nginx Proxy Manager (GUI - Mudah)
Jika Anda menggunakan tampilan visual:
1.  Akses port `81` di browser IP server Anda.
2.  Tambahkan **Proxy Host**:
    -   Domain: `dev.partner-onboarding.alita.id` -> Forward ke Port: `3001`.
    -   Domain: `partner-onboarding.alita.id` -> Forward ke Port: `3000`.
3.  Aktifkan SSL (Let's Encrypt) di tab SSL.

### Opsi 2: Nginx Manual (Teks - Stabil)
Gunakan template konfigurasi yang tersedia di folder `nginx/conf.d/app.conf` pada proyek ini sebagai referensi untuk dipasang di `/etc/nginx/conf.d/` server.

---

## Bab 7: Pemeliharaan Data & Troubleshooting

### 1. Inisialisasi Database
Saat pertama kali berjalan, sinkronkan struktur database:
```bash
npx drizzle-kit push
```

### 2. Backup Rutin
Wajib backup folder `./public/uploads` dan volume `mysql_data_dev/prod` karena berisi file fisik (KTP, Selfie, Sertifikat).

### 3. Log Error
```bash
docker compose logs -f app
```

---

## Bab 8: Verifikasi Akhir
Setelah semua jalan, pastikan akses portal dokumentasi API:
-   URL: `https://[DOMAIN_ANDA]/api-docs`

---
© 2026 PT. Alita Praya Mitra. Seluruh konfigurasi deployment telah siap dan otomatis.
