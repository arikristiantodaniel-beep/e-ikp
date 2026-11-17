# E-IKP

Portal pelaporan Insiden Keselamatan Pasien dengan Next.js, Supabase Auth, Postgres, dan private Storage. Akun yang saat ini didukung hanya Pelapor; investigasi dan akses PMKP belum dibuka.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Menyiapkan Supabase

1. Pastikan project Supabase sudah dibuat dan `.env.local` memiliki `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Jangan commit file tersebut.
2. Di **SQL Editor**, jalankan `supabase/migrations/202611170001_initial_schema.sql` jika skema awal belum diterapkan.
3. Periksa di **Table Editor** bahwa `incident_reports` dan `ikp_investigations` sudah ada.
4. Jalankan `supabase/migrations/202611170002_reporter_auth_policies.sql` di SQL Editor. Migration ini membuat profil akun, policy akses Pelapor, dan private Storage bucket `ikp-attachments`. RLS tetap aktif; investigasi belum diberi akses.
5. Untuk uji coba saja, tambahkan variabel berikut secara lokal ke `.env.local`:

   ```dotenv
   SUPABASE_SERVICE_ROLE_KEY=isi_secret_key_dari_supabase
   EIKP_TEST_SHARED_PASSWORD=password_uji_coba_minimal_12_karakter
   ```

   Ambil `service_role`/secret key dari pengaturan API Supabase. Variabel ini hanya untuk provisioning dan **tidak boleh** memakai awalan `NEXT_PUBLIC_`, masuk ke Vercel frontend, GitHub, atau chat.
6. Jalankan `npm run provision:test-users`. Script membuat akun Supabase Auth dan profil `pelapor` untuk setiap unit pada dropdown. Username adalah nama unit; script mengubahnya menjadi alias internal `@eikp.invalid`, sedangkan password sama untuk seluruh akun.
7. Login melalui dropdown unit. Buat hanya laporan sintetis saat menguji penyimpanan, pembacaan, dan lampiran.

Jalankan ulang `npm run dev` setelah mengubah environment. Konfigurasi Vercel untuk deployment normal hanya memerlukan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Keamanan dan batas penggunaan

- Project saat ini ditandai Production. Jangan provision akun ber-password bersama atau memasukkan data pasien nyata. Password bersama menghilangkan akuntabilitas per orang; akun ini hanya untuk uji coba dengan data sintetis.
- Sebelum migration atau provisioning di project Production, pastikan persetujuan pemilik project dan backup tersedia. Migration kedua membuka akses terbatas bagi akun Pelapor yang memiliki profil, tetapi bukan pengganti tinjauan keamanan/privasi rumah sakit.
- Publishable key memang dipakai browser; perlindungan data bergantung pada RLS. Jangan menonaktifkan RLS atau membuat policy terbuka seperti `using (true)`.
- Jangan pernah menaruh `service_role`/secret key dalam browser, variabel `NEXT_PUBLIC_*`, GitHub, atau deployment frontend.
- Lampiran disimpan pada bucket privat dan aksesnya dibatasi ke folder UID pengguna. Tabel menyimpan object path, bukan URL publik.
- Kebijakan saat ini membatasi Pelapor untuk membuat dan membaca laporannya sendiri. Tidak ada policy update/delete pada laporan dan belum ada akses investigasi untuk Kepala Ruangan/PMKP.

## Skrip

- `npm run lint` menjalankan pemeriksaan TypeScript.
- `npm run build` membuat build Next.js untuk deployment.
- `npm run provision:test-users` membuat akun uji dan memerlukan secret lokal.
