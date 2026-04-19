# Step 00: Pre-Deployment & CICD Configuration 🛠️

Dokumen ini adalah **langkah wajib** sebelum Anda memulai proses deployment di [Step 09: Deployment](file:///Users/etikahsiregar/Development/Partner-Team-Onboarding/docs/step-09-deployment.md). Tanpa menyelesaikan konfigurasi di dokumen ini, fitur deployment otomatis tidak akan berfungsi.

---

## 📋 Checklist Pra-Deployment
Sebelum memulai, pastikan Anda sudah memiliki:
1. **Akses ke 2 VM (Dev & Prod)** dengan IP Publik.
2. **Akses Admin ke Repositori GitHub** (untuk memasukkan Secrets).
3. **Domain/Subdomain** yang sudah diarahkan ke IP Server (opsional, bisa diatur nanti).

---

## Bagian 1: Konfigurasi Keamanan (SSH Keys)
Tujuannya adalah agar GitHub bisa "masuk" ke server Anda secara otomatis tanpa menggunakan password.

### 1. Membuat SSH Key Baru
Jalankan perintah ini di terminal laptop Anda:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```
- Tekan `Enter` untuk lokasi default.
- Kosongkan passphrase (tekan `Enter` 2x) agar otomatisasi tidak terhambat.

**Hasil:**
- Kunci Privat: `~/.ssh/id_ed25519` (JANGAN SEBARKAN!)
- Kunci Publik: `~/.ssh/id_ed25519.pub`

### 2. Mendaftarkan Kunci Publik ke Server
Lakukan ini pada **kedua VM** (Dev & Prod):
1. Salin isi kunci publik: `cat ~/.ssh/id_ed25519.pub`.
2. Masuk ke server via SSH.
3. Tempelkan kunci tersebut ke dalam file authorized keys:
   ```bash
   mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys
   ```
4. Simpan dan Keluar.

---

## Bagian 2: Konfigurasi GitHub Secrets
Agar alur CICD di GitHub mengenali "kunci" dan "alamat" server Anda.

1. Buka repositori GitHub -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Klik **New repository secret** dan tambahkan variabel berikut:

| Nama Secret | Isi / Nilai |
| :--- | :--- |
| `DEV_SSH_KEY` | Isi dengan Kunci Privat dari laptop Anda. |
| `DEV_SSH_HOST` | IP Publik VM Development. |
| `DEV_SSH_USER` | `root` (atau username server Anda). |
| `PROD_SSH_KEY` | Isi dengan Kunci Privat yang sama (atau beda). |
| `PROD_SSH_HOST`| IP Publik VM Production. |
| `PROD_SSH_USER`| `root`. |

---

## Bagian 3: Verifikasi Alur CICD
Setelah semua diisi, setiap kali ada **Push/Merge** ke branch `develop` atau `main`, GitHub akan otomatis menjalankan:
1. **Lint Check**: Memastikan tidak ada salah tulis kode.
2. **Build Check**: Memastikan aplikasi bisa di-build dengan sukses.
3. **Deploy**: Mengirim kode terbaru ke server dan me-restart container.

> [!TIP]
> Status proses ini bisa dipantau secara real-time di tab **Actions** pada halaman GitHub Anda.
