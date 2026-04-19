# Step 4: Code Generation (ACTUAL)

Fase ini mencatat implementasi modul-modul fungsional utama yang telah dibangun dan diuji dalam sistem.

## 1. Modul Manajemen RFP & Penugasan
- **Logika Penugasan**: Implementasi sistem kuota tim per RFP.
- **Data Team Partners**: Penghubung antara Request (Alita) dan Eksekutor (Partner).

## 2. Modul Registrasi Anggota (Smart Registration)
- **NIK Validation**: Deteksi duplikasi data antar tim.
- **Returning Member Detection**: Logika pemulihan data untuk anggota bersertifikat yang mendaftar ulang.
- **Media Processing**: Penanganan upload KTP dan Selfie secara otomatis ke sistem file lokal.

## 3. Modul Quality Assurance (QA) & Training
- **Training Attendance**: Pencatatan kehadiran dan hasil evaluasi (Lulus/Tidak) per personil.
- **Sync Status**: Perubahan status tim secara otomatis menjadi `VERIFICATION` setelah training selesai.

## 4. Modul Sertifikat & Ekspor Premium
Ini adalah salah satu fitur paling kompleks yang telah diimplementasikan:
- **PDF Generation (Puppeteer)**: Pembuatan sertifikat teknis berbasis PDF secara otomatis dengan mesin Chromium. Sertifikat mencakup nama, NIK, peran, dan QR Code dinamis.
- **Ekspor Excel (ExcelJS)**: Penggabungan data tim ke dalam file Excel yang secara otomatis menyisipkan **Foto KTP dan Foto Selfie** setiap anggota ke dalam baris yang sesuai (bukan sekadar link).

## 5. Dashboard Real-Time & KPI
- **KPI Metrics**: Kalkulasi personil tersertifikasi, pipeline tim dalam training, dan status pemenuhan RFP.
- **Akurasi**: Statistik secara proaktif hanya menghitung personil dengan status `isActive = 1`.

## 6. Sistem Notifikasi & Navigasi Terintegrasi
Modul ini menghubungkan seluruh DASHBOARD melalui alur kerja yang ACTIONABLE:
- **Pusat Notifikasi Premium**: Antarmuka real-time dengan polling jaringan 30 detik dan ticker waktu UI 10 detik. Dilengkapi sistem pembersihan zona waktu otomatis untuk menjamin akurasi label waktu di lingkungan desktop lokal.
- **Contextual Intelligence**: Identifikasi cepat tipe notifikasi (Sertifikat, Training, Penugasan) menggunakan ikon SVG yang unik dan indikator visual untuk pesan yang belum dibaca.
- **Smart Deep-Linking & Alur Dashboard**: 
    - Implementasi logika `Suspense` untuk penanganan parameter URL secara dinamis.
    - Fitur **Auto-Tab Switching**: Berpindah otomatis antara tab *Ongoing/Completed* berdasarkan status record yang dituju.
    - Fitur **Scroll-to-View & Amber Flash**: Navigasi otomatis ke baris data yang relevan dengan animasi visual yang mencolok.
- **UX & Aksesibilitas**: Implementasi penutupan modal universal melalui tombol **Escape** dan deteksi **Click-outside** pada seluruh overlay manajemen tim.
