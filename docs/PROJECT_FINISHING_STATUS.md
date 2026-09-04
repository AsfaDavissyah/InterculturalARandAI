# Engora Project Finishing Status

Last updated: 2026-09-04

Dokumen ini menjadi catatan ringkas status implementasi Engora. Status dibagi menjadi fitur inti yang sudah selesai, keputusan scope yang dikunci, dan pekerjaan finishing sebelum uji klien atau rilis produksi.

## Keputusan Scope yang Dikunci

- [x] Nama produk menggunakan **Engora**.
- [x] Guided Topics dan Scenario Library memakai struktur skenario serta alur CRUD yang sama.
- [x] Guided Topics tetap memakai karakter sesuai setting yang telah ditentukan.
- [x] Seluruh Scenario Library memakai karakter **male**; karakter female bukan pekerjaan tertunda.
- [x] Modules dan QR dinonaktifkan sementara pada dashboard, mobile, dan backend.
- [x] Facial expression/lip-sync detail tidak termasuk scope rilis saat ini.
- [x] Career Fair sticker menggunakan aset `6.png` yang telah disetujui.

## Fitur Inti yang Sudah Selesai

### Dashboard dan Backend

- [x] Dashboard Admin dan Lecturer dengan navigasi serta batas akses per role.
- [x] Login dashboard dan akses akun admin telah diverifikasi.
- [x] Scenario CRUD telah disederhanakan dengan satu canonical scenario schema.
- [x] Draft dapat disimpan hanya dengan judul; validasi lengkap dilakukan saat submit/publish.
- [x] Lifecycle skenario: Draft, In Review, Published, Inactive, dan Archived.
- [x] Lecturer dapat membuat, menduplikasi, mengedit draft, dan mengirim skenario untuk review.
- [x] Admin dapat meminta revisi, menerbitkan, menonaktifkan, dan mengarsipkan skenario.
- [x] Category management dan proteksi archive untuk kategori yang masih dipakai.
- [x] Lecturer management termasuk aktivasi dan deaktivasi akun.
- [x] Practice Results, Overview, Profile, dan System Settings tersedia sesuai role.
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

### Verifikasi Otomatis Terakhir

- [x] Backend: 96/96 test lulus.
- [x] Dashboard unit test: 13/13 lulus.
- [x] Dashboard end-to-end test: 4/4 lulus.
- [x] Dashboard production build berhasil.
- [x] Mobile Flutter test: 36/36 lulus setelah penguncian male Scenario Library.
- [x] Sticker registry test: 7/7 lulus.

## Finishing Wajib Sebelum Uji Klien

- [x] Rapikan data dashboard: `Campuss` telah dibersihkan dari database, skor dibatasi maksimal dua desimal, dan status seperti `ended_manually` ditampilkan sebagai `Ended Manually`.
- [x] Review 16 skenario selesai: title, briefing, task, student role, AI partner, prompt, constraints, rubric, dan runtime data telah diverifikasi serta diselaraskan.
- [ ] Jalankan UAT Lecturer penuh: create/duplicate, save draft, submit, receive revision, edit, resubmit, dan publish oleh Admin.
- [ ] Jalankan UAT Admin penuh untuk scenario, category, lecturer, results, dan settings.
- [ ] Uji mobile pada perangkat Android fisik: camera/AR, microphone/STT, TTS, Tone Engine, Idle/Talking, latency, memory, suhu, dan recovery saat jaringan putus.
- [ ] Review enam sticker langsung di layar mobile; samakan gaya visual hanya bila perbedaannya terasa mengganggu.
- [ ] Konfigurasikan API staging/online beserta CORS dan environment variables agar pengujian tidak bergantung pada localhost.
- [ ] Buat APK uji terbaru dan lakukan install/smoke test dari perangkat bersih.

## Finishing Wajib Sebelum Rilis Produksi

- [ ] Finalisasi Terms of Service, Privacy Policy, Research Information Sheet, dan Research Consent.
- [ ] Konfigurasikan Android application ID, versioning, signing key, dan build AAB release.
- [ ] Deploy backend dan dashboard ke hosting produksi, lalu jalankan online smoke test.
- [ ] Pastikan secrets produksi tidak tersimpan di repository dan rotasi secret sementara bila diperlukan.
- [ ] Selesaikan device acceptance, client acceptance, serta dokumentasikan sign-off.
- [ ] Buat commit terstruktur, review diff, lalu push/sinkronkan branch yang disetujui.

## Pekerjaan yang Bisa Ditunda

- [ ] Halaman Audit Log khusus di dashboard. API audit sudah tersedia, sehingga halaman ini bukan blocker uji mobile.
- [ ] Penyempurnaan facial expression atau lip-sync karakter.
- [ ] Mengaktifkan kembali Modules dan QR setelah alur skenario utama stabil.
- [ ] Karakter female untuk Scenario Library.
- [ ] Penyatuan ulang seluruh gaya sticker jika enam aset saat ini sudah diterima pada uji klien.

## Ringkasan Gate

Fitur inti aplikasi sudah tersedia. Engora belum dianggap siap produksi sampai data skenario dirapikan, UAT kedua role selesai, alur AR diuji pada perangkat fisik, backend tersedia secara online, dokumen legal selesai, dan artefak Android release ditandatangani serta diuji.
