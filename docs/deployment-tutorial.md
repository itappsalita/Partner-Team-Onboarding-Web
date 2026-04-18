# Tutorial Deployment: Zero to Production 🚀

Panduan ini dirancang khusus bagi Anda yang belum pernah melakukan deployment aplikasi ke server. Kita akan menempuh 5 langkah sederhana untuk menghidupkan aplikasi **Partner Team Onboarding**.

---

## Bab 1: Masuk ke Dalam Server

Setelah Anda membeli server (misal di DigitalOcean atau Alibaba Cloud), Anda akan mendapatkan **IP Address** dan **Password**.

1.  **Buka Terminal** (di Mac/Linux) atau **Putty** (di Windows).
2.  Ketik perintah berikut (ganti `[IP_SERVER]` dengan angka IP Anda):
    ```bash
    ssh root@[IP_SERVER]
    ```
3.  Ketik `yes` jika muncul pertanyaan pertama kali, lalu masukkan password Anda.
4.  **Siapkan Server**: Jalankan perintah ini untuk memperbarui sistem keamanan Linux:
    ```bash
    apt update && apt upgrade -y
    ```

---

## Bab 2: Instalasi "Mesin" Docker

Aplikasi kita berjalan di dalam **Docker**. Ibarat kontainer pengiriman, Docker memastikan aplikasi berjalan sama persis di laptop saya dan di server Anda.

**Cara Tercepat:** Jalankan perintah otomatis ini untuk menginstal Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

---

## Bab 3: Mengambil Kode Aplikasi

Sekarang kita masukkan "isi" aplikasinya ke dalam server.

1.  Pindah ke folder rumah: `cd ~`
2.  Ambil kode dari GitHub:
    ```bash
    git clone https://github.com/itappsalita/Partner-Team-Onboarding.git
    ```
3.  Masuk ke folder proyek:
    ```bash
    cd Partner-Team-Onboarding
    ```

---

## Bab 4: Pengaturan & Menghidupkan Aplikasi

### 1. File Rahasia (.env)
Aplikasi butuh pengenal. Kita akan membuat file rahasia berisi password database dan kunci keamanan.
```bash
nano .env
```
Copy-paste isi berikut (dan ganti passwordnya agar aman!):
```env
DATABASE_URL='mysql://root:password_asli_anda@db:3306/db_onboarding'
NEXTAUTH_URL='http://[IP_SERVER_ANDA]:3000'
NEXTAUTH_SECRET='buat-kunci-acak-panjang'
```
*Tekan `Ctrl+O` lalu `Enter` untuk menyimpan, dan `Ctrl+X` untuk keluar.*

### 2. Mulai Menjalankan!
Cukup satu perintah untuk menghidupkan Aplikasi + Database:
```bash
docker compose up -d --build
```
Tunggu sekitar 2-5 menit. Setelah selesai, cek dengan: `docker compose ps`.

---

## Bab 5: Finalisasi & Database

Sesaat setelah aplikasi hidup, "perabot" database-nya harus kita tata. Jalankan perintah ini (dari server Anda):
```bash
npx drizzle-kit push
```

---

## Bab 6: Instalasi Nginx Proxy Manager (Akses HTTPS)

Agar aplikasi bisa diakses dengan domain profesional (misal: `https://onboarding.partner.id`), kita butuh **Nginx Proxy Manager (NPM)**. Alat ini memiliki antarmuka visual sehingga Anda tidak perlu mengedit file konfigurasi teks yang rumit.

### 1. Buat Folder & File Konfigurasi
Masuk ke server Anda, lalu jalankan:
```bash
cd ~
mkdir npm-proxy && cd npm-proxy
nano docker-compose.yml
```

### 2. Isi Kode Docker Compose NPM
Salin kode berikut ke dalam jendela `nano`:
```yaml
version: '3.8'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'    # Jalur HTTP
      - '81:81'    # Panel Kontrol (Browser)
      - '443:443'  # Jalur HTTPS (Aman)
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```
*Simpan: `Ctrl+O`, `Enter`. Keluar: `Ctrl+X`.*

### 3. Hidupkan Panel Kontrol
```bash
docker compose up -d
```

### 4. Setup Awal di Browser
1. Buka browser, akses: `http://[IP_SERVER_ANDA]:81`.
2. Login dengan data bawaan:
   - Email: `admin@example.com`
   - Password: `changeme`
3. **Wajib**: Segera ganti Email dan Password Anda sesuai petunjuk layar.

### 5. Memasangkan Domain ke Aplikasi
1. Klik menu **"Proxy Hosts"** -> **"Add Proxy Host"**.
2. **Domain Names**: Isi domain Anda (misal: `onboarding.alita.id`).
3. **Scheme**: Pilih `http`.
4. **Forward Hostname / IP**: Isi dengan **IP Publik Server Anda**.
5. **Forward Port**: Isi dengan `3000` (Port aplikasi kita).
6. Centang **"Block Common Exploits"**.

### 6. Aktivasi Gembok Hijau (SSL)
1. Pindah ke tab **"SSL"** di atas.
2. Pilih **"Request a New SSL Certificate"**.
3. Centang **"Force SSL"** (Agar pengunjung otomatis masuk ke jalur aman).
4. Klik **Save**.

Tunggu sekitar 30 detik. Jika berhasil, domain Anda sekarang sudah memiliki ikon gembok aman (HTTPS).

---

## Bab 7: Verifikasi Dokumentasi API

Selangkah lagi! Setelah aplikasi dapat diakses, sangat disarankan untuk memeriksa portal dokumentasi teknis:

1.  Akses URL: `https://domain-anda.id/api-docs`
2.  **Gunakan Akun Admin** untuk login.
3.  Pastikan Anda melihat daftar API seperti **Assignments**, **Teams**, dan **Members**. Jika halaman ini muncul, berarti seluruh mesin backend (`Next.js`), database (`MySQL`), dan dokumentasi (`Swagger`) berjalan dengan sempurna.

---

## Bab 8: Pemeliharaan & Persistensi Data (Sangat Penting)

Aplikasi ini mengelola dokumen fisik yang krusial. Pastikan Anda memahami cara Docker menyimpan data Anda:

1.  **./public/uploads**: Folder ini menyimpan seluruh foto **KTP, Selfie, dan Sertifikat PDF**. Folder ini wajib di-backup secara rutin ke penyimpanan eksternal.
2.  **mysql_data**: Volume ini menyimpan seluruh catatan transaksi database Anda.
3.  **Memori (RAM)**: Untuk fitur **Penerbitan Sertifikat PDF**, server disarankan memiliki minimal **1GB RAM** yang tersedia agar mesin Chromium (Puppeteer) dapat beroperasi dengan lancar.

---

## 🆘 Troubleshooting: Apa yang Harus Dilakukan Jika Error?
Jika aplikasi tidak mau jalan setelah `docker compose up`, gunakan bantuan perintah berikut:

```bash
# 1. Cek apakah kontainer sudah jalan atau berhenti (Exited)
docker compose ps

# 2. Melihat keluhan aplikasi secara real-time (Log)
docker compose logs -f app

# 3. Merestart aplikasi tanpa menghapus data
docker compose restart app
```

Baca baris paling bawah pada log. Biasanya ada petunjuk jelas jika password database salah atau port sedang dipakai aplikasi lain.

---
© 2026 PT. Alita Praya Mitra. Developed for Success.
