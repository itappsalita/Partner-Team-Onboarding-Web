# Panduan Setup Lokal (Non-Docker) 🚀

Panduan ini ditujukan bagi anggota tim yang ingin menjalankan aplikasi **Partner Team Onboarding** secara langsung di sistem operasi tanpa menggunakan Docker.

## 🛠️ Prasyarat (Prerequisites)

Pastikan komponen berikut sudah terinstal di komputer Anda:
1.  **Node.js** (v20+ direkomendasikan).
2.  **MySQL Server** (v8.0+).
3.  **Git**.

---

## 🏗️ Langkah-langkah Instalasi

### 1. Persiapan Database MySQL
Karena tidak menggunakan kontainer, Anda harus menyiapkan database sebagai service lokal:

1.  Jalankan MySQL Service di komputer Anda.
2.  Buka Terminal/CMD dan masuk ke MySQL:
    ```bash
    mysql -u root -p
    ```
3.  Buat database baru untuk proyek ini:
    ```sql
    CREATE DATABASE partner_onboarding_db;
    ```
4.  (Opsional) Pastikan user `root` memiliki akses penuh atau buat user khusus.

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Buka `.env.local` dan sesuaikan `DATABASE_URL`:
```env
# Gunakan localhost dan sesuaikan password MySQL Anda
DATABASE_URL="mysql://root:PASSWORD_ANDA@localhost:3306/partner_onboarding_db"
```

### 3. Instal Dependensi & Push Schema
Jalankan perintah berikut di root folder proyek:
```bash
# 1. Instal package
npm install

# 2. Push struktur tabel ke MySQL lokal
# Jika muncul error terkait .env, tambahkan flag --env-path=.env.local
npx drizzle-kit push --env-path=.env.local
```

### 4. Menjalankan Aplikasi
Setelah database siap, Anda bisa menjalankan aplikasi dalam mode development:
```bash
npm run dev
```
Aplikasi akan dapat diakses di [http://localhost:3000](http://localhost:3000).

### 5. Melihat Isi Database (Visual CLI)
Jika Anda ingin melihat isi tabel secara visual (seperti phpMyAdmin), jalankan:
```bash
npm run db:studio
```
Lalu buka browser Anda ke alamat **https://local.drizzle.studio**.

---

## 🛠️ Troubleshooting (Kendala Sering Terjadi)

### 1. Error: "DATABASE_URL is undefined"
Drizzle Kit terkadang tidak membaca file `.env.local` secara otomatis.
**Solusi:** Jalankan dengan flag eksplisit:
`npx drizzle-kit push --env-path=.env.local`

### 2. Error: "Client does not support authentication protocol"
MySQL versi 8+ menggunakan plugin keamanan baru yang terkadang tidak didukung driver Node.js lama.
**Solusi:** Ubah plugin password user MySQL Anda ke mode legacy di terminal MySQL:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'PASSWORD_ANDA';
FLUSH PRIVILEGES;
```

### 3. Database Tidak Ditemukan
Drizzle tidak membuat database secara otomatis, ia hanya membuat tabel.
**Solusi:** Pastikan Anda sudah menjalankan `CREATE DATABASE partner_onboarding_db;` sebelum melakukan push.

---

## ⚠️ Perbedaan Utama dengan Docker
| Fitur | Docker | Non-Docker (Manual) |
| :--- | :--- | :--- |
| **Database** | Otomatis dibuat oleh kontainer | Harus dibuat manual di MySQL lokal |
| **Hostname** | Menggunakan `db` | Menggunakan `localhost` |
| **Port** | Diarahkan via Docker (3306:3306) | Langsung menggunakan port sistem (3306) |
| **Isolasi** | Terisolasi di dalam container | Berjalan langsung di host machine |

---
© 2026 PT. Alita Praya Mitra.
