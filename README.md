# Aplikasi Perum Guwosari Blok 6B — Starter Kit v1.0

Paket ini adalah **tahap pertama coding (fondasi aplikasi)** berdasarkan Blueprint 1.9:
- Frontend: HTML, CSS, JavaScript (Netlify)
- Backend: Google Apps Script
- Database: Google Sheets
- Komunikasi: WhatsApp Share (akan diaktifkan pada modul berikutnya)

## Isi paket
- `index.html`, `styles.css`, `app.js`: antarmuka login dan dashboard awal.
- `netlify/functions/api.js`: proxy Netlify agar rahasia API tidak ditaruh di browser.
- `apps-script/Code.gs`: backend Apps Script, pembuatan database, login, sesi, identitas aplikasi.
- `apps-script/appsscript.json`: manifest Apps Script.

## Catatan penting
Paket ini **belum merupakan aplikasi produksi lengkap**. Tahap pertama mengerjakan fondasi: database, akun, autentikasi, identitas editable, dan dashboard awal. Modul entri jimpitan, penguncian satu entri per tanggal, presensi, setoran, kewajiban, cicilan, WhatsApp, penerimaan kas, distribusi, pengeluaran, dan laporan akan dibangun bertahap setelah fondasi diuji.

## A. Siapkan Google Sheets dan Apps Script
1. Buka https://script.google.com lalu buat project baru.
2. Salin isi `apps-script/Code.gs` ke file `Code.gs`.
3. Buka Project Settings > Script Properties, tambahkan:
   - `APP_SECRET` = buat string acak panjang (minimal 32 karakter).
4. Jalankan fungsi `setupDatabase()` dari editor Apps Script dan izinkan akses.
5. Buka Execution log untuk mendapatkan URL Google Sheets database yang dibuat. ID spreadsheet tersimpan di Script Properties sebagai `SPREADSHEET_ID`.
6. Jalankan fungsi `createAdminUser("6b-01", "GANTI_PASSWORD_KUAT", "Bendahara")` dengan password pilihan Bos.
7. Deploy > New deployment > Web app:
   - Execute as: Me
   - Who has access: Anyone
8. Salin URL Web App yang berakhiran `/exec`.

## B. Siapkan Netlify
1. Unggah folder proyek (isi folder `guwosari6b_app`) ke repository GitHub.
2. Hubungkan repository ke Netlify.
3. Build command: kosongkan.
4. Publish directory: `.` (root proyek).
5. Tambahkan Environment Variables di Netlify:
   - `GAS_WEB_APP_URL` = URL Web App Apps Script `/exec`
   - `APP_SECRET` = nilai yang sama dengan Script Property `APP_SECRET`
6. Deploy ulang.

## C. Keamanan
- Jangan masukkan `APP_SECRET` ke `app.js` atau file frontend.
- Jangan bagikan spreadsheet kepada warga.
- Gunakan password kuat dan ganti password awal.
- Batasi akses Google Sheets hanya untuk pengelola tepercaya.
- URL Apps Script boleh publik karena setiap permintaan melalui proxy Netlify wajib membawa secret server-side.
- Sebelum dipakai warga sungguhan, lakukan pengujian akun, backup, dan pemeriksaan akses.

## D. Keputusan default sementara
Agar fondasi bisa dibangun:
- Saldo awal: dimasukkan manual per kantong oleh bendahara saat aktivasi.
- Pembayaran kewajiban: dapat dicatat lunas/sebagian; pembukuan penerimaan kas tetap transaksi terpisah agar tidak double count.
- Pembulatan distribusi: sisa rupiah pembulatan dimasukkan ke Kas Besar.
Ketiga aturan ini dapat diubah jika Bos memilih keputusan lain.

## E. Status modul
- [x] Fondasi database dan sheet
- [x] Login dan sesi pengguna
- [x] Identitas aplikasi editable
- [x] Dashboard awal berbasis ringkasan database
- [ ] Data warga lengkap dan pengelolaan akun
- [ ] Jadwal ronda dan arsip per periode
- [ ] Entri jimpitan + satu entri per tanggal + pengunci backend
- [ ] Presensi dan pembentukan kewajiban
- [ ] Hari tanpa entri dan libur ronda
- [ ] Setoran pembawa lintas periode + validasi
- [ ] Akumulasi kewajiban + pembayaran sebagian
- [ ] WhatsApp pribadi dan grup
- [ ] Penerimaan fisik + distribusi enam kantong
- [ ] Pengeluaran, pendapatan lain, aset, laporan
