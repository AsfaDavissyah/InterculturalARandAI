# Engora Production Ownership and Migration Register

Isi register ini saat migrasi. Jangan pernah menulis password, API key, recovery code, private key, atau OTP di dokumen ini.

## Identitas Rilis

| Item | Nilai Final | Disetujui Oleh | Tanggal |
| --- | --- | --- | --- |
| Legal publisher | `TBD` | `TBD` | `TBD` |
| Public app name | `Engora` | `TBD` | `TBD` |
| Android application ID | `TBD` | `TBD` | `TBD` |
| iOS bundle ID | `TBD` | `TBD` | `TBD` |
| Support email | `TBD` | `TBD` | `TBD` |
| Privacy email | `TBD` | `TBD` | `TBD` |
| Website | `TBD` | `TBD` | `TBD` |
| Privacy policy URL | `TBD` | `TBD` | `TBD` |
| Account deletion URL | `TBD` | `TBD` | `TBD` |

## Register Layanan

| Layanan | Pemilik Saat Ini | Pemilik Target | Client Owner Aktif | Billing Client | Data/Config Dimigrasikan | Secret Dirotasi | Verifikasi | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub repository | Developer | Client | No | N/A | No | N/A | Pending | Not started |
| Google Play Console | N/A | Client | No | No | N/A | N/A | Pending | Not started |
| Apple Developer / App Store Connect | N/A | Client | No | No | N/A | N/A | Pending | Not started |
| OpenAI API project | Developer | Client | No | No | No | No | Pending | Not started |
| MongoDB Atlas | Developer | Client | No | No | No | No | Pending | Not started |
| Vercel dashboard project | Developer | Client | No | No | No | No | Pending | Not started |
| VPS backend | Developer | Client | No | No | No | No | Pending | Not started |
| API domain and TLS | Developer | Client | No | No | No | No | Pending | Not started |
| Support/privacy mailbox | N/A | Client | No | No | N/A | N/A | Pending | Not started |

## Checklist Migrasi Data dan Konfigurasi

- [ ] Buat backup database terenkripsi sebelum migrasi.
- [ ] Uji pemulihan backup pada lingkungan terpisah.
- [ ] Catat collection, index, retention rule, dan kapasitas database.
- [ ] Migrasikan environment variables melalui secret manager, bukan Git.
- [ ] Rotasi OpenAI API key setelah project client aktif.
- [ ] Rotasi database credential dan batasi IP/network access.
- [ ] Rotasi JWT secret serta invalidate token lama bila diperlukan.
- [ ] Rotasi Vercel token dan deployment credential.
- [ ] Rotasi VPS SSH key; hapus akses yang tidak diperlukan.
- [ ] Pasang TLS pada domain API milik client.
- [ ] Verifikasi CORS, rate limiting, `trust proxy`, dan log redaction.
- [ ] Uji API health, login, Realtime, history, assessment, dan dashboard.
- [ ] Pastikan client dapat melihat billing, logs, backup, dan alert.

## Serah Terima Source Code

Source code sebaiknya diberikan melalui repository milik client, bukan ZIP sebagai satu-satunya salinan. Serah terima minimal mencakup:

- source backend, dashboard, Flutter Android/iOS, test, dan dokumentasi;
- branch utama yang bersih dan release tag;
- daftar versi runtime/dependency;
- contoh environment variable tanpa secret;
- prosedur build, deploy, rollback, backup, dan restore;
- release artifact beserta checksum;
- daftar known issues dan pekerjaan lanjutan;
- bukti bahwa client sudah menjadi owner pada layanan produksi.

## Persetujuan Akhir

| Peran | Nama | Tanggal | Status |
| --- | --- | --- | --- |
| Client/Product Owner | `TBD` | `TBD` | Pending |
| Data/Research Owner | `TBD` | `TBD` | Pending |
| Developer | `TBD` | `TBD` | Pending |

