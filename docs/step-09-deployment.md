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
Tujuannya adalah menempelkan "tanda pengenal" laptop Anda ke dalam "buku daftar tamu" di server yang bernama `authorized_keys`.

Lakukan langkah ini pada **kedua VM** (Dev & Prod):

**Langkah A: Ambil Kunci dari Laptop Anda**
1. Buka terminal di **laptop Mac** Anda.
2. Tampilkan isi kunci publik Anda dengan perintah:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Akan muncul teks panjang yang diawali dengan `ssh-ed25519 AAAAC3Nza...`. **Salin (Copy)** seluruh teks tersebut.

**Langkah B: Masukkan Kunci ke dalam Server**
1. Masuk ke server Anda via SSH (seperti di Bab 1).
2. Buat folder SSH di server (jika belum ada):
   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ```
3. Buka (atau buat) file pendataan kunci dengan editor teks `nano`:
   ```bash
   nano ~/.ssh/authorized_keys
   ```
4. **Tempelkan (Paste)** teks kunci yang tadi Anda salin ke dalam file tersebut.
   - Pastikan kunci berada dalam **satu baris** yang utuh.
   - Jika sudah ada kunci lain di sana, tempelkan di baris paling bawah.
5. Simpan dan Keluar:
   - Tekan `Ctrl + O` lalu `Enter` (untuk menyimpan).
   - Tekan `Ctrl + X` (untuk keluar dari editor).
6. Atur izin akses agar aman:
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   ```

**Langkah C: Verifikasi (Uji Coba)**
Coba keluar dari server (`exit`) lalu masuk kembali. Jika berhasil, server tidak akan meminta password lagi:
```bash
ssh [username]@[IP_SERVER]
```

---

## Bab 3: Konfigurasi GitHub Secrets

Agar alur CI/CD di GitHub mengenali "kunci" dan "alamat" server Anda.

1. Buka repositori GitHub Anda -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Klik **New repository secret** dan tambahkan variabel berikut:

| Nama Secret | Isi / Nilai |
| :--- | :--- |
| **`VPN_CONFIG`** | Isi seluruh teks dari file `.ovpn` Anda. |
| `DEV_SSH_KEY` | Isi dengan Kunci Privat dari laptop Anda (`cat ~/.ssh/id_ed25519`). |
| `DEV_SSH_HOST` | **IP Lokal** VM Development (misal: `10.0.x.x`). |
| `DEV_SSH_USER` | `root` (atau username server Anda). |
| `PROD_SSH_KEY` | Isi dengan Kunci Privat yang sama (atau beda). |
| `PROD_SSH_HOST`| **IP Lokal** VM Production (misal: `10.0.x.x`). |
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

## Bab 6: Konfigurasi Domain & Wildcard SSL (Nginx)

Karena Anda memiliki sertifikat SSL Wildcard sendiri (`alita.id`), ikuti langkah berikut untuk memasangnya secara manual di server.

### 1. Persiapan File Sertifikat
Siapkan dua file sertifikat Anda (misal: `star_alita_id.crt` dan `star_alita_id.key`) dan upload ke server di folder khusus agar aman.
```bash
# Buat folder sertifikat di server
mkdir -p /etc/nginx/ssl/alita
# Upload atau copy file sertifikat ke sana
# /etc/nginx/ssl/alita/star_alita_id.crt
# /etc/nginx/ssl/alita/star_alita_id.key
```

### 2. Konfigurasi Nginx Manual (Teks - Direkomendasikan)
Buat file konfigurasi di `/etc/nginx/conf.d/partner_onboarding.conf` dan gunakan template berikut:

```nginx
server {
    listen 443 ssl;
    server_name partner-onboarding.alita.id dev.partner-onboarding.alita.id;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/alita/star_alita_id.crt;
    ssl_certificate_key /etc/nginx/ssl/alita/star_alita_id.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        # Jika akses domain utama, arahkan ke Prod (Port 3000)
        # Jika akses domain dev, arahkan ke Dev (Port 3001)
        # Gunakan variabel atau buat dua blok server jika ingin memisahkan port
        proxy_pass http://localhost:3000; 
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name partner-onboarding.alita.id dev.partner-onboarding.alita.id;
    return 301 https://$host$request_uri;
}
```

### 3. Implementasi via Nginx Proxy Manager (GUI)
Jika Anda menggunakan Nginx Proxy Manager:
1.  Klik menu **Custom SSL** -> **Add SSL Certificate**.
2.  Upload file `.crt` dan `.key` wildcard Anda. Beri nama "Wildcard Alita".
3.  Saat membuat **Proxy Host**, pilih sertifikat "Wildcard Alita" pada tab SSL.

---

## Bab 7: Pemeliharaan Data & Troubleshooting

### 1. Inisialisasi Database
Saat pertama kali berjalan, kita harus menyinkronkan struktur database dan membuat akun awal. Karena kita menggunakan Docker Production, kita akan menggunakan service khusus bernama `migration`:

**Sinkronkan Struktur Tabel:**
```bash
docker compose -f docker-compose.prod.yml run --rm migration npm run db:push
```

**Buat Akun Superadmin Awal:**
```bash
docker compose -f docker-compose.prod.yml run --rm migration npm run seed:user
```
*(Kontainer `migration` akan otomatis dihapus setelah perintah selesai dijalankan).*

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
