# Engora Store Release Readiness

Status ini membedakan pekerjaan yang sudah siap, yang dapat dikerjakan developer, dan yang menunggu keputusan client.

## Ringkasan Status

| Area | Status | Catatan |
| --- | --- | --- |
| Fitur inti Android | Siap uji | Guided Topic, Scenario Library, Free Conversation, dan Realtime tersedia. |
| Perbaikan audio Realtime terbaru | Siap verifikasi | Batas respons dan sinkronisasi akhir audio telah diperbaiki; masih perlu uji perangkat. |
| Target Android API | Siap | Project mengikuti target SDK Flutter yang terpasang. |
| Keamanan trafik Android | Diperketat | Build produksi menolak cleartext HTTP; endpoint produksi harus HTTPS. |
| Android application ID | Menunggu client | Saat ini masih memakai identitas developer dan wajib diganti sebelum rilis resmi. |
| Android release signing | Belum siap | Keystore produksi harus dibuat dan dimiliki client. Build tidak boleh memakai debug signing. |
| Listing Play Store | Draf | Deskripsi dapat disiapkan, tetapi kategori, usia, negara, dan kontak harus disetujui client. |
| Privacy policy dan terms | Draf awal | Harus diulas dan diterbitkan pada domain client. |
| Penghapusan akun/data | Diimplementasikan | Tersedia dari profil dengan verifikasi password dan penghapusan data sesi terkait; permintaan publik juga tersedia. |
| Pelaporan respons AI | Diimplementasikan | Respons AI pada riwayat dapat dilaporkan dengan konteks sesi, skenario, dan turn; endpoint review tersedia untuk admin/dosen berwenang. |
| Privacy, terms, AI notice, support | Draf terpasang | Halaman publik dan tautan dalam aplikasi tersedia; identitas legal dan email client wajib diisi sebelum publikasi. |
| Project iOS | Ada | Nama aplikasi telah disesuaikan menjadi Engora. |
| Bundle ID dan signing iOS | Menunggu client | Membutuhkan Apple Developer Team client. |
| Uji iOS | Belum diverifikasi | Wajib build dengan macOS/Xcode, CocoaPods, dan iPhone nyata. |
| Migrasi layanan produksi | Belum dimulai | Dilakukan setelah akun client tersedia. |

## Yang Bisa Diselesaikan Sebelum Akun Client Tersedia

- Menstabilkan Android dan menyelesaikan regression test.
- Menyiapkan draf privacy policy, terms, listing, dan store asset checklist.
- Menyusun inventaris data serta arus data pihak ketiga.
- Menetapkan prosedur backup, restore, monitoring, dan incident response.
- Memverifikasi account deletion dan pelaporan respons AI pada staging.
- Menyiapkan migration register tanpa menyalin secret ke dokumentasi.

## Yang Harus Menunggu Client

- Penetapan nama legal publisher dan data controller.
- Pemilihan application ID dan bundle ID final.
- Pembuatan akun organisasi Google dan Apple.
- Pembuatan signing key/certificate produksi.
- Penetapan metode pembayaran dan batas biaya.
- Persetujuan privacy policy, terms, retensi data, dan consent penelitian.
- Pemindahan layanan serta rotasi seluruh secret produksi.

## Urutan Rilis yang Direkomendasikan

1. Bekukan fitur dan selesaikan bug kritis.
2. Tetapkan kepemilikan serta identitas aplikasi bersama client.
3. Buat akun organisasi dan undang developer.
4. Implementasikan penghapusan akun/data serta pelaporan respons AI.
5. Ganti application ID/bundle ID dan konfigurasi signing.
6. Migrasikan GitHub, OpenAI, MongoDB, Vercel, VPS, dan domain.
7. Rotasi secret, lakukan backup, lalu jalankan staging verification.
8. Rilis Android melalui internal/closed testing.
9. Build iOS di Mac, uji melalui TestFlight, lalu perbaiki kompatibilitas.
10. Ajukan production release setelah hasil pengujian dan dokumen legal disetujui.

## Release Gate

Aplikasi tidak dinyatakan siap produksi sebelum semua kondisi berikut terpenuhi:

- Tidak ada debug signing pada artefak store.
- Tidak ada secret di source code atau aplikasi client.
- Login, consent, percakapan, penilaian, fallback, dan penghapusan data lolos uji.
- Privacy policy dapat diakses publik.
- Backup dan restore sudah diuji.
- Monitoring biaya dan error aktif.
- Client memiliki akses owner ke seluruh layanan.
- APK/AAB dan IPA/TestFlight diuji pada perangkat nyata.

## Verifikasi Kandidat 1.0.5+15

- `flutter analyze`: lulus tanpa temuan.
- Flutter regression: 62/62 test lulus.
- Backend regression: 127/131 test lulus tanpa `MONGODB_URI`; empat test database lama memerlukan koneksi database test/staging.
- Test terarah account deletion, AI response report, dan Realtime: 7/7 lulus.
- Release security audit: 0 critical; empat warning kepemilikan/signing dicatat sebagai blocker client.
- Uji perangkat nyata Android dan uji iOS melalui macOS/Xcode tetap menjadi release gate.

## Referensi Resmi

- Android: [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- Google Play: [user data and account deletion requirements](https://support.google.com/googleplay/android-developer/answer/18258653)
- Google Play: [generative AI content policy](https://support.google.com/googleplay/android-developer/answer/13985936)
- Apple: [offering account deletion in the app](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- Apple: [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- Apple: [App Store privacy information](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)

