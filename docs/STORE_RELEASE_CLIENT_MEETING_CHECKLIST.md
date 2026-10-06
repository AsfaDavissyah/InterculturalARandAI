# Engora Store Release - Client Meeting Checklist

Dokumen ini dipakai saat pertemuan bersama client. Tujuannya adalah membuat akun dan keputusan penting langsung atas nama institusi/client, bukan atas nama developer pribadi.

## 1. Yang Harus Dibawa Client

- Nama legal institusi/perusahaan dan alamat resminya.
- Nama, jabatan, email kantor, dan nomor telepon orang yang berwenang mengikat institusi.
- Domain dan situs web institusi yang aktif.
- Nomor D-U-N-S institusi untuk pendaftaran Apple sebagai organisasi, jika sudah tersedia.
- Akun Google dan Apple milik institusi yang dapat memakai autentikasi dua faktor.
- Perangkat yang menerima kode OTP akun tersebut.
- Metode pembayaran milik institusi untuk biaya pendaftaran dan layanan produksi.
- Email publik untuk dukungan pengguna dan email khusus permintaan privasi/penghapusan akun.
- Logo resmi Engora/institusi dan persetujuan penggunaan nama serta merek.

Client sebaiknya mengetik sendiri password, OTP, data identitas, dan data pembayaran. Developer tidak perlu menyimpan atau memotret data tersebut.

## 2. Keputusan yang Harus Disepakati

- **Pemilik aplikasi:** nama legal pihak yang menjadi publisher dan pengendali data.
- **Nama publik:** `Engora` atau nama final lain yang disetujui.
- **Android application ID:** rekomendasi `id.<domain-client>.engora` atau `com.<organisasi>.engora`.
- **iOS bundle ID:** gunakan nilai yang konsisten dengan Android.
- **Negara distribusi:** Indonesia saja atau negara lain.
- **Target pengguna dan usia minimum:** mahasiswa/dewasa atau rentang lain.
- **Jenis distribusi:** publik, unlisted, closed testing, atau internal institusi.
- **Retensi data penelitian:** berapa lama transkrip, skor, dan metadata sesi disimpan.
- **Prosedur penghapusan akun dan data:** siapa yang menyetujui dan siapa yang mengeksekusi.
- **Penggunaan data untuk penelitian:** pisahkan persetujuan penelitian dari syarat penggunaan aplikasi.
- **Batas biaya OpenAI:** anggaran bulanan, notifikasi penggunaan, dan pihak yang menyetujui kenaikan.
- **Penanggung jawab operasional:** support, server, database, AI billing, dan store review.

## 3. Akun yang Dibuat atau Dialihkan

1. **Google Play Console** atas nama client/institusi.
2. **Apple Developer Program** sebagai organisasi, bukan akun developer pribadi.
3. **GitHub organization/repository** milik client dengan developer sebagai collaborator.
4. **OpenAI API project** milik client; API key hanya berada di backend server.
5. **MongoDB Atlas organization/project** milik client.
6. **Vercel team/project** milik client untuk dashboard.
7. **VPS dan domain/subdomain API** milik client.
8. **Email support dan privacy** pada domain client.

Untuk setiap layanan, client harus menjadi `Owner` atau pemilik billing. Developer mendapat role minimum yang diperlukan untuk migrasi dan pemeliharaan.

## 4. Hasil Minimum Pertemuan

- Identitas publisher dan application/bundle ID sudah diputuskan.
- Akun Play Console dan Apple Developer sudah diajukan atau dibuat.
- Client telah mengundang developer ke akun yang diperlukan.
- Kepemilikan billing dan layanan produksi telah ditetapkan.
- Email support, privacy, dan URL situs web telah tersedia.
- Kebijakan retensi serta penghapusan akun/data telah disetujui.
- Jadwal closed testing Android dan TestFlight iOS telah ditentukan.

## 5. Aturan Keamanan Saat Pendampingan

- Jangan mengirim API key, password, private signing key, atau OTP melalui chat.
- Jangan memasukkan OpenAI API key ke aplikasi Flutter atau dashboard.
- Simpan Android keystore dan kredensial iOS di penyimpanan client yang terenkripsi.
- Setelah migrasi, rotasi API key, password database, JWT secret, dan token deployment.
- Aktifkan autentikasi dua faktor pada semua akun pemilik.
- Catat recovery contact dan minimal dua administrator institusi.

## 6. Yang Tidak Perlu Dipaksakan Besok

- Publikasi final ke Play Store dan App Store tidak harus selesai dalam satu pertemuan.
- Apple dapat memerlukan verifikasi organisasi dan D-U-N-S.
- Google Play dapat mewajibkan closed test sebelum akses produksi, tergantung jenis akun.
- Build iOS tetap harus dilakukan dan diuji di macOS/Xcode serta perangkat iPhone nyata.

## Referensi Resmi

- Google Play: [app setup and release preparation](https://support.google.com/googleplay/android-developer/answer/9859152)
- Google Play: [testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- Apple: [organization enrollment requirements](https://developer.apple.com/help/account/membership/program-enrollment)
- Apple: [membership options and fees](https://developer.apple.com/support/compare-memberships/)

