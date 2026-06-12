# 🎵 Discord Music Bot

Bot musik Discord yang support **YouTube**, **Spotify**, **SoundCloudck**, dan banyak platform lain. Bisa berjalan **24/7** di server/VPS!

> **Projek ini dibuat dan dikembangkan oleh [Dwiyansyah Oktavyudi](https://github.com/dwiyansyahku) ([GitHub](https://github.com/dwiyansyahku) | [LinkedIn](https://www.linkedin.com/in/dwiyansyah/)).**

---

## ✨ Fitur

- 🔴 **YouTube** — Lagu, playlist, livestream
- 🟢 **Spotify** — Lagu, album, playlist (via YouTube)
- 🟠 **SoundCloud** — Lagu & playlist
- 🌐 **1000+ Platform** via yt-dlp (Twitch, Deezer, dll)
- 🎛️ Kontrol lengkap: pause, skip, seek, loop, shuffle, volume
- 📋 Queue management
- ⚡ Perintah berbasis teks (prefix `q`)

---

## 📋 Persyaratan

- **Node.js** v18 atau lebih baru
- **FFmpeg** (sudah termasuk via `ffmpeg-static`)
- **yt-dlp** terinstall di sistem (untuk platform selain YouTube)

### Install yt-dlp:
```bash
# Linux/Mac
pip install yt-dlp
# atau
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# Windows
winget install yt-dlp
```

---

## 🚀 Setup

### 1. Clone & Install

```bash
cd discord-music-bot
npm install
```

### 2. Buat Bot Discord

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **New Application** → beri nama
3. Pergi ke tab **Bot** → klik **Reset Token** → copy token
4. Di tab Bot, aktifkan:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
5. Pergi ke **OAuth2 > URL Generator**:
   - Scope: `bot` + `applications.commands`
   - Bot Permissions: `Send Messages`, `Connect`, `Speak`, `Use Voice Activity`, `Embed Links`, `Read Message History`
6. Copy URL yang dihasilkan → buka di browser → invite bot ke server kamu

### 3. Setup Spotify (Opsional)

1. Buka [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Klik **Create App**
3. Copy **Client ID** dan **Client Secret**

### 4. Konfigurasi .env

```bash
cp .env.example .env
```

Edit file `.env`:
```env
DISCORD_TOKEN=token_bot_discord_kamu
CLIENT_ID=client_id_bot_kamu
SPOTIFY_CLIENT_ID=spotify_client_id_kamu      # opsional
SPOTIFY_CLIENT_SECRET=spotify_client_secret   # opsional
```

> **Cara cari CLIENT_ID:** Di Developer Portal → Applications → pilih app → General Information → Application ID

### 5. Daftarkan Slash Commands (Opsional)

> **Catatan:** Bot sekarang menggunakan perintah berbasis pesan teks (prefix `q`), sehingga langkah ini tidak wajib. Namun jika Anda masih ingin mendaftarkan slash command lama:

```bash
node register-commands.js
```

### 6. Jalankan Bot

```bash
npm start
```

---

## 🖥️ Deploy 24/7

### Opsi A: PM2 (Direkomendasikan untuk VPS/Linux)

```bash
# Install PM2
npm install -g pm2

# Jalankan bot dengan PM2
pm2 start src/index.js --name "music-bot"

# Auto-start saat server reboot
pm2 startup
pm2 save

# Cek status
pm2 status

# Lihat logs
pm2 logs music-bot
```

### Opsi B: Railway.app (Gratis, mudah)

1. Buat akun di [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Tambah environment variables di dashboard
4. Deploy!

### Opsi C: Render.com (Gratis)

1. Buat akun di [render.com](https://render.com)
2. New → Background Worker
3. Connect GitHub repo
4. Set environment variables
5. Deploy!

### Opsi D: VPS (Paling stabil)

Gunakan PM2 seperti Opsi A di VPS Ubuntu/Debian:
```bash
sudo apt update && sudo apt install nodejs npm python3-pip -y
pip3 install yt-dlp
npm install
npm install -g pm2
pm2 start src/index.js --name music-bot
pm2 startup && pm2 save
```

---

## 🎮 Daftar Command (Prefix: `q`)

Semua perintah ditulis langsung di chat server menggunakan awalan `q` (tidak menggunakan slash `/`).

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `qp [query/url]` | Putar lagu dari YouTube, Spotify, SoundCloud, dll | `qp never gonna give you up` |
| `qnp` / `qnowplaying` | Info lagu yang sedang diputar | `qnp` |
| `qq` / `qqueue` `[halaman]` | Lihat antrian lagu | `qq 1` |
| `qpause` | Pause lagu | `qpause` |
| `qresume` | Lanjutkan lagu | `qresume` |
| `qs` / `qskip` | Skip ke lagu berikutnya | `qs` |
| `qstop` / `qleave` | Hentikan pemutaran musik dan keluarkan bot dari voice channel | `qstop` |
| `qseek [detik]` | Lompat ke waktu tertentu dalam lagu | `qseek 90` |
| `qvol` / `qvolume` `[0-100]` | Atur volume | `qvol 50` |
| `qloop [off/song/queue]` | Mode loop/repeat | `qloop song` |
| `qshuffle` | Acak urutan antrian | `qshuffle` |
| `qremove [nomor]` | Hapus lagu dari antrian | `qremove 2` |
| `qclear` / `qclearqueue` | Hapus semua antrian | `qclear` |
| `qhelp` | Tampilkan bantuan (deskripsi, pembuat, & daftar command) | `qhelp` |

---

## 🔧 Troubleshooting

**Bot tidak muncul di server?**
→ Pastikan sudah invite bot menggunakan URL dari OAuth2 Generator

**Perintah slash tidak muncul/tidak berfungsi?**
→ Bot saat ini beralih ke perintah teks menggunakan prefix `q` (seperti `qp`, `qhelp`, dst.). Ketik langsung perintahnya di chat server tanpa menggunakan slash `/`!

**Lagu tidak bisa diputar?**
→ Pastikan `yt-dlp` sudah terinstall dan terupdate: `yt-dlp -U`

**Spotify tidak berfungsi?**
→ Pastikan SPOTIFY_CLIENT_ID dan SPOTIFY_CLIENT_SECRET sudah benar di `.env`

**Error OPUS/FFmpeg?**
→ `npm install @discordjs/opus ffmpeg-static --save`

---

## 📝 Lisensi & Hak Cipta

Projek ini dideklarasikan di bawah **MIT License**. Hak cipta © 2026 **Dwiyansyah Oktavyudi**.

Hubungi pembuat via [GitHub](https://github.com/dwiyansyahku) | [LinkedIn](https://www.linkedin.com/in/dwiyansyah/).

Lihat file [LICENSE](LICENSE) untuk informasi selengkapnya.
