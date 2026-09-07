# Engora Project Finishing Status

Last updated: 2026-09-07

Dokumen ini menjadi catatan ringkas status implementasi Engora. Status dibagi menjadi fitur inti yang sudah selesai, keputusan scope yang dikunci, dan pekerjaan finishing sebelum uji klien atau rilis produksi.

## Keputusan Scope yang Dikunci

- [x] Nama produk menggunakan **Engora**.
- [x] Guided Settings dipisahkan dari Scenario Library; enam setting tidak tampil pada daftar Scenarios.
- [x] Scenario Library tetap dikelola melalui CRUD skenario, sedangkan Guided Settings memakai katalog tetap sesuai tiga kategorinya.
- [x] Guided Topics tetap memakai karakter sesuai setting yang telah ditentukan.
- [x] Seluruh Scenario Library memakai karakter **male**; karakter female bukan pekerjaan tertunda.
- [x] Modules dan QR dinonaktifkan sementara pada dashboard, mobile, dan backend.
- [x] Facial expression/lip-sync detail tidak termasuk scope rilis saat ini.
- [x] Career Fair sticker menggunakan aset `6.png` yang telah disetujui.
- [x] Sticker setting tampil sebagai latar di belakang karakter pada layar AR, bukan sebagai ikon topic.
- [x] Lecturer bersifat read-only terhadap skenario; pembuatan dan pengelolaan skenario hanya dilakukan Admin.

## Fitur Inti yang Sudah Selesai

### Dashboard dan Backend

- [x] Dashboard Admin dan Lecturer dengan navigasi serta batas akses per role.
- [x] Login dashboard dan akses akun admin telah diverifikasi.
- [x] Scenario CRUD telah disederhanakan dengan satu canonical scenario schema.
- [x] Draft dapat disimpan hanya dengan judul; validasi lengkap dilakukan saat submit/publish.
- [x] Lifecycle skenario: Draft, In Review, Published, Inactive, dan Archived.
- [x] Lecturer dapat melihat Scenario Library dan hasil praktik tanpa akses membuat, menduplikasi, mengedit, atau submit skenario.
- [x] Admin dapat membuat, menduplikasi, mengedit, menerbitkan, menonaktifkan, dan mengarsipkan skenario.
- [x] Category management dan proteksi archive untuk kategori yang masih dipakai.
- [x] Lecturer management termasuk aktivasi dan deaktivasi akun.
- [x] Regenerate kode dosen mempertahankan relasi seluruh akun mahasiswa yang telah terhubung.
- [x] Practice Results, Overview, Profile, dan System Settings tersedia sesuai role.
- [x] Profile mendukung nama, email, gender, password, serta menampilkan role dan status akun.
- [x] Audit events disimpan dan tersedia melalui API.
- [x] Error boundary, loading/empty/error states, deep link, dan hash routing tersedia.
- [x] Respons API HTML/error lama tidak lagi ditampilkan mentah di dashboard.
- [x] Modules dan QR mengembalikan `403 FEATURE_DISABLED` dari backend.
- [x] Migrasi database dan backup sebelum migrasi sudah dibuat.
- [x] Database berisi 16 skenario unik: 8 Scenario Library aktif, 6 Guided Topics aktif, dan 2 duplikat lama inactive.

### Mobile

- [x] Branding Engora, onboarding, login, registration, dan home baru.
- [x] Guided Topics, Scenario Library, setting selection, briefing, dan AR practice flow.
- [x] Practice History, empty history, Practice Result, dan Practice Detail.
- [x] Tombol Back to Home pada Practice Result dibuat sticky.
- [x] Profile serta navigasi mobile yang telah diselaraskan dengan UI baru.
- [x] Tone Engine dan pemetaan gender TTS.
- [x] Modules dan QR disembunyikan/dinonaktifkan.
- [x] Model `male_char.glb` dengan animasi `Idle` dan `Talking` untuk seluruh Scenario Library.
- [x] Registry avatar memaksa Scenario Library memakai male meskipun data lama berisi avatar key lain.
- [x] Enam sticker setting telah dipasang: Lecturer Office, After Class, London Restaurant, Melbourne Cafe, Interview Room, dan Career Fair.
- [x] Enam sticker hanya digunakan sebagai latar layar AR dan tidak lagi ditampilkan sebagai ikon topic atau preview briefing.
- [x] Alamat API mobile dikunci melalui konfigurasi build ke `https://api.202-10-37-3.sslip.io`; input URL API telah dihapus dari Login dan Profile.

### Verifikasi Otomatis Terakhir

- [x] Backend pasca-UAT Batch 1: alur sesi 20/20 dan pemetaan suara/Tone Engine 16/16 lulus; full suite 103/107, dengan 4 kegagalan integrasi hanya akibat DNS MongoDB Atlas lokal timeout.
- [x] Dashboard unit test: 16/16 lulus.
- [x] Dashboard production build berhasil.
- [x] Mobile Flutter test: 35/35 lulus setelah revisi Guided Settings, sticker AR, profile, dan konfigurasi API.
- [x] Flutter analyze lulus tanpa issue.
- [x] Sticker registry test: 7/7 lulus.

## Perbaikan Pasca-UAT Klien

- [x] Batch 1 - Conversation engine: respons mengikuti maksud terbaru mahasiswa, fallback tidak memaksa urutan objektif, dan riwayat prompt diperpanjang untuk menjaga konteks.
- [x] Batch 1 - Objective completion: jumlah turn hanya menjadi statistik; objektif lengkap menghasilkan `completion_eligible` tanpa menutup percakapan otomatis.
- [x] Batch 1 - Objective memory: ID objektif yang sudah selesai diterima dan digabung secara kumulatif pada endpoint chat.
- [x] Batch 1 - Safety guard: batas internal 30 respons tersedia tanpa mengubah sesi menjadi completed.
- [x] Batch 2 - Mobile completion UX: tampilkan progres/badge objektif, kirim progres kumulatif, dan buka tombol penyelesaian khusus ketika seluruh objektif selesai.
- [ ] Batch 3 - Speech recognition recovery: tangani salah dengar seperti `both` menjadi `boat` melalui konfirmasi, alternatif transkrip, dan retry yang jelas.
- [ ] Batch 4 - Uji perangkat fisik ulang untuk latency, respons berulang, kualitas suara, penyelesaian objektif, dan koneksi terputus.

## Finishing Wajib Sebelum Uji Klien

- [x] Rapikan data dashboard: `Campuss` telah dibersihkan dari database, skor dibatasi maksimal dua desimal, dan status seperti `ended_manually` ditampilkan sebagai `Ended Manually`.
- [x] Review 16 skenario selesai: title, briefing, task, student role, AI partner, prompt, constraints, rubric, dan runtime data telah diverifikasi serta diselaraskan.
- [ ] Jalankan UAT Lecturer penuh: login, overview, Scenario Library read-only, results, profile, dan regenerate kode tanpa kehilangan mahasiswa terhubung.
- [ ] Jalankan UAT Admin penuh untuk scenario, category, lecturer, results, dan settings.
- [ ] Uji mobile pada perangkat Android fisik: camera/AR, microphone/STT, TTS, Tone Engine, Idle/Talking, latency, memory, suhu, dan recovery saat jaringan putus.
- [ ] Review enam sticker langsung di layar mobile; samakan gaya visual hanya bila perbedaannya terasa mengganggu.
- [x] API online dikonfigurasi pada VPS melalui Nginx, HTTPS, PM2, CORS, dan environment variables sehingga pengujian tidak bergantung pada localhost.
- [x] APK release terbaru berhasil dibuat untuk ARM64, ARM32, dan x86_64.
- [ ] Instal APK ARM64 terbaru dan lakukan smoke test dari perangkat Android bersih.

## Finishing Wajib Sebelum Rilis Produksi

- [ ] Finalisasi Terms of Service, Privacy Policy, Research Information Sheet, dan Research Consent.
- [x] Android application ID `com.asfadavissyah.engora`, version `1.0.0+2`, release signing key, dan AAB release telah dikonfigurasi serta diverifikasi.
- [x] Backend VPS dan dashboard Vercel telah dideploy; endpoint status serta Scenario Library memberikan HTTP 200 pada online smoke test.
- [ ] Pastikan secrets produksi tidak tersimpan di repository dan rotasi secret sementara bila diperlukan.
- [ ] Selesaikan device acceptance, client acceptance, serta dokumentasikan sign-off.
- [x] Baseline release telah direview, di-commit, dan dipush ke branch `main`; revisi pasca-UAT dilacak per batch sebelum deployment berikutnya.

## Pekerjaan yang Bisa Ditunda

- [ ] Halaman Audit Log khusus di dashboard. API audit sudah tersedia, sehingga halaman ini bukan blocker uji mobile.
- [ ] Penyempurnaan facial expression atau lip-sync karakter.
- [ ] Mengaktifkan kembali Modules dan QR setelah alur skenario utama stabil.
- [ ] Karakter female untuk Scenario Library.
- [ ] Penyatuan ulang seluruh gaya sticker jika enam aset saat ini sudah diterima pada uji klien.

## Ringkasan Gate

Fitur inti aplikasi dan layanan online sudah tersedia. Engora belum dianggap siap produksi sampai UAT kedua role selesai, alur AR diuji pada perangkat fisik, enam sticker diterima pada layar mobile, dokumen legal selesai, dan artefak Android release ditandatangani serta diuji.
