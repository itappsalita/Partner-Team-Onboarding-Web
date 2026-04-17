# Panduan Operasional Docker Produksi

Panduan ini menjelaskan langkah-langkah detail untuk menjalankan aplikasi Anda di server produksi menggunakan infrastruktur Docker yang telah disiapkan.

## 1. Persiapan Variabel Lingkungan
Jangan mengandalkan file `.env` di dalam Docker untuk produksi. Sebagai gantinya, edit file `docker-compose.yml` pada bagian `environment` atau gunakan file external:

```yaml
environment:
  - DATABASE_URL=mysql://root:password_asli_anda@db:3306/db_onboarding
  - NEXTAUTH_URL=https://nama-domain-anda.com
  - NEXTAUTH_SECRET=rahasia_sangat_panjang_dan_aman
```

## 2. Menjalankan Kontainer
Gunakan perintah berikut untuk membangun dan menjalankan seluruh sistem:

```bash
docker compose up -d --build
```
- `-d`: Menjalankan di latar belakang (*detached mode*).
- `--build`: Memastikan image dibangun ulang jika ada perubahan kode.

## 3. Sinkronisasi Database (Penting!)
Setelah kontainer database berjalan, Anda perlu melakukan sinkronisasi skema Drizzle. Jalankan perintah ini dari komputer lokal yang terhubung ke server (atau dari dalam kontainer):

```bash
# Jika menjalankan dari host yang memiliki akses ke DB Docker
npx drizzle-kit push
```

## 4. Persistensi Data (Volumes)
Dua hal paling penting untuk di-backup secara rutin:
1.  **mysql_data**: Volume ini berisi seluruh data database. Secara default disimpan di folder internal Docker.
2.  **./public/uploads**: Folder ini berisi file-file fisik (KTP, Selfie). Folder ini dipetakan langsung ke folder di server Anda agar tidak hilang saat kontainer dihapus/diupdate.

## 5. Pemeliharaan
- **Melihat Log**: `docker compose logs -f app`
- **Menghentikan Sistem**: `docker compose down`
- **Update Kode**: `git pull` -> `docker compose up -d --build`

---
> [!CAUTION]
> **Keamanan Password**: Jangan biarkan `MYSQL_ROOT_PASSWORD` tetap `rootpassword`. Ubah menjadi password yang kuat sebelum dideploy ke server yang terhubung internet.
