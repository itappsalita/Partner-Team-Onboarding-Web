# Strategi Backup & Disaster Recovery

Dokumen ini menjelaskan prosedur pencadangan (backup) data untuk sistem **Partner Team Onboarding** guna menjamin keberlangsungan operasional jika terjadi kegagalan sistem atau kehilangan data.

## 1. Komponen Backup

| Komponen | Lokasi | Format |
| :--- | :--- | :--- |
| **Database** | Docker Container: `onboarding-db` | `.sql` (SQL Dump) |
| **Media Files** | Host Path: `./public/uploads` | `.tar.gz` (Archive) |

## 2. Kebijakan Retensi (Retention)

Backup disimpan dalam folder `/backups` di server dengan aturan penghapusan otomatis:
- **Harian**: Disimpan selama 7 hari.
- **Mingguan**: Disimpan selama 4 minggu.
- **Bulanan**: Disimpan selama 3 bulan.

## 3. Script Otomatisasi

Kami telah menyediakan script `scripts/backup.sh` yang dapat didaftarkan pada **Cron Job** server.

### Cara Penggunaan Manual:
```bash
# Memberikan izin eksekusi
chmod +x scripts/backup.sh

# Menjalankan backup sekarang
./scripts/backup.sh
```

### Cara Setup Cron Job (Otomatis):
Untuk menjalankan backup setiap hari pada pukul 02:00 dini hari:
1. Jalankan `crontab -e`.
2. Tambahkan baris berikut:
   ```cron
   0 2 * * * /path/to/project/scripts/backup.sh >> /path/to/project/backups/backup.log 2>&1
   ```

## 4. Prosedur Restorasi (Pemulihan)

> [!CAUTION]
> Selalu lakukan uji coba restorasi di server staging sebelum melakukannya di server produksi.

### Memulihkan Database:
```bash
cat backups/backup_db_YYYY-MM-DD.sql | docker exec -i onboarding-db mysql -u root -p[password] db_onboarding
```

### Memulihkan File Media:
```bash
tar -xzf backups/backup_files_YYYY-MM-DD.tar.gz -C ./public/uploads
```

---
© 2026 PT. Alita Praya Mitra. Data Integrity first.
