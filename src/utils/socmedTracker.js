const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const storage = require('./storage');
const { TikTokLiveConnection } = require('tiktok-live-connector');
const Parser = require('rss-parser');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  }
});

const DEFAULT_ROLE_ID = '1396396538686607410';

const YTDLP_PATH = process.platform === 'win32'
  ? path.resolve(__dirname, '../../bin/yt-dlp.exe')
  : path.resolve(__dirname, '../../bin/yt-dlp');

/**
 * Mengunduh snippet video Reels/TikTok agar dapat diputar langsung di Discord
 * @param {string} url 
 * @returns {Promise<string|null>} Path file sementara atau null jika gagal/bukan video
 */
async function downloadVideoSnippet(url) {
  if (!url || typeof url !== 'string') return null;
  const isVideoLink = url.includes('instagram.com/reel') ||
                      url.includes('instagram.com/p/') ||
                      url.includes('tiktok.com');
  if (!isVideoLink) return null;
  if (!fs.existsSync(YTDLP_PATH)) {
    console.warn('[Socmed] yt-dlp binary tidak ditemukan di:', YTDLP_PATH);
    return null;
  }

  const tempFilePath = path.join(os.tmpdir(), `socmed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp4`);
  const args = [
    '-f', 'best[ext=mp4]/best',
    '--max-filesize', '25M',
    '--socket-timeout', '10',
    '--no-playlist',
    '--no-warnings',
    '-o', tempFilePath,
    url
  ];

  return new Promise((resolve) => {
    execFile(YTDLP_PATH, args, { timeout: 25000 }, (error) => {
      if (error) {
        console.warn(`[Socmed] Gagal mengunduh video via yt-dlp: ${error.message}`);
        if (fs.existsSync(tempFilePath)) fs.unlink(tempFilePath, () => {});
        return resolve(null);
      }
      if (fs.existsSync(tempFilePath)) {
        try {
          const stats = fs.statSync(tempFilePath);
          if (stats.size > 1000 && stats.size <= 25 * 1024 * 1024) {
            return resolve(tempFilePath);
          }
        } catch (_) {}
        fs.unlink(tempFilePath, () => {});
      }
      resolve(null);
    });
  });
}

/**
 * Mengambil konfigurasi socmed untuk guild tertentu
 */
function getSocmedConfig(guildId) {
  const settings = storage.read('settings');
  const guildSettings = settings[guildId] || {};
  return guildSettings.socmed || {
    enabled: false,
    channelId: null,
    roleId: DEFAULT_ROLE_ID,
    tiktok: [],
    feeds: []
  };
}

/**
 * Menyimpan konfigurasi socmed untuk guild tertentu
 */
function saveSocmedConfig(guildId, config) {
  storage.saveGuildSetting(guildId, 'socmed', config);
}

/**
 * Mengirim notifikasi sosial media ke channel Discord sesuai layout yang diminta:
 * - Mention role murni (tanpa kalimat tambahan)
 * - Embed:
 *   - Top: Profil akun (nama, handle, icon/avatar, url)
 *   - Mid: Deskripsi konten (caption) + video/feed yang dapat diplay langsung di Discord
 *   - Bottom: Button link ke platform
 * 
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {Object} data
 * @param {'tiktok' | 'instagram'} data.platform
 * @param {'live' | 'post' | 'reels' | 'video'} data.type
 * @param {string} data.author
 * @param {string} data.handle
 * @param {string} [data.avatarUrl]
 * @param {string} [data.title]
 * @param {string} [data.caption]
 * @param {string} data.url
 * @param {string} [data.previewUrl]
 * @param {string} [data.extraInfo]
 * @returns {Promise<boolean>}
 */
async function sendSocmedNotification(client, guildId, data) {
  const config = getSocmedConfig(guildId);
  const isTikTok = data.platform.toLowerCase() === 'tiktok';
  const targetChannelId = isTikTok
    ? (config.tiktokChannelId || config.channelId)
    : (config.instagramChannelId || config.channelId);

  if (!targetChannelId) {
    console.warn(`[Socmed] Guild ${guildId} belum mengatur channel untuk platform ${data.platform}.`);
    return false;
  }

  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channel = guild.channels.cache.get(targetChannelId) || await guild.channels.fetch(targetChannelId).catch(() => null);
  if (!channel) {
    console.warn(`[Socmed] Channel ${targetChannelId} tidak ditemukan di guild ${guild.name}.`);
    return false;
  }

  const isLive = data.type?.toLowerCase() === 'live';

  // 1. Role mention murni (tanpa kalimat tambahan, sesuai revisi)
  const roleMention = config.roleId ? `<@&${config.roleId}>` : `<@&${DEFAULT_ROLE_ID}>`;
  const messageContent = roleMention;

  // 2. Bangun Embed Sesuai Permintaan:
  // - Top: Profil akun (nama, handle/username, avatar akun)
  // - Mid: Deskripsi konten (+ playable video Discord / preview)
  const embedColor = isTikTok
    ? (isLive ? 0xFE2C55 : 0x00F2FE)
    : (isLive ? 0xE1306C : 0x833AB4);

  const handleFormatted = data.handle
    ? (data.handle.startsWith('@') ? data.handle : `@${data.handle}`)
    : (isTikTok ? '@tiktok' : '@instagram');

  const authorDisplayName = data.author
    ? `${data.author} (${handleFormatted})`
    : handleFormatted;

  const defaultAvatar = isTikTok
    ? 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'
    : 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png';

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: authorDisplayName,
      iconURL: data.avatarUrl || defaultAvatar,
      url: data.authorUrl || data.url
    })
    .setTimestamp();

  // Mid: Deskripsi Konten (Caption)
  const captionText = data.caption || data.title || (isLive ? '🔴 Sedang siaran langsung! Klik tombol di bawah untuk bergabung.' : 'Konten video terbaru telah tayang! Tonton langsung di bawah.');
  embed.setDescription(captionText);

  // Cek apakah ada file video yang dapat diunduh untuk diputar langsung di Discord
  let downloadedVideoPath = null;
  if (!isLive && data.url) {
    downloadedVideoPath = await downloadVideoSnippet(data.url);
  }

  const files = [];
  if (downloadedVideoPath) {
    // Video reel / feed berhasil didownload -> lampirkan sebagai attachment Discord agar player video interaktif muncul langsung di pesan
    files.push(new AttachmentBuilder(downloadedVideoPath, { name: `${isTikTok ? 'tiktok' : 'instagram'}_feed.mp4` }));
  } else if (data.previewUrl) {
    // Jika bukan video atau gagal unduh, tampilkan preview gambar asli di embed
    embed.setImage(data.previewUrl);
  }

  // 3. Tombol Akses Langsung ke Postingan / Live (Bawah)
  const buttonLabel = isLive
    ? `Tonton Live di ${isTikTok ? 'TikTok' : 'Instagram'}`
    : `Tonton di ${isTikTok ? 'TikTok' : 'Instagram'}`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(buttonLabel)
      .setStyle(ButtonStyle.Link)
      .setURL(data.url)
  );

  const sendOptions = {
    content: messageContent,
    embeds: [embed],
    components: [row]
  };

  if (files.length > 0) {
    sendOptions.files = files;
  }

  try {
    await channel.send(sendOptions);
    console.log(`[Socmed] Notifikasi ${data.platform} (${data.type}) berhasil dikirim ke #${channel.name} (${guild.name})`);
    return true;
  } catch (err) {
    console.error(`[Socmed] Gagal mengirim pesan ke #${channel.name}:`, err.message);
    return false;
  } finally {
    // Hapus file video sementara setelah terkirim
    if (downloadedVideoPath && fs.existsSync(downloadedVideoPath)) {
      fs.unlink(downloadedVideoPath, () => {});
    }
  }
}

/**
 * Pengecekan TikTok Live otomatis untuk sebuah akun
 */
async function pollTikTokLive(client, guildId, account, config) {
  const username = account.username.replace(/^@/, '').trim();
  if (!username) return;

  try {
    const conn = new TikTokLiveConnection(username, {});
    const isLive = await conn.fetchIsLive().catch(() => false);

    if (isLive && !account.lastLive) {
      console.log(`[Socmed Tracker] @${username} terdeteksi SEDANG LIVE!`);
      let title = `Sesi Siaran Langsung @${username}`;
      let previewUrl = null;
      let avatarUrl = null;

      try {
        const roomInfo = await conn.fetchRoomInfo();
        if (roomInfo) {
          if (roomInfo.title) title = roomInfo.title;
          if (roomInfo.cover?.url_list?.[0]) previewUrl = roomInfo.cover.url_list[0];
          if (roomInfo.owner?.avatar_thumb?.url_list?.[0]) avatarUrl = roomInfo.owner.avatar_thumb.url_list[0];
        }
      } catch (_) {}

      await sendSocmedNotification(client, guildId, {
        platform: 'tiktok',
        type: 'live',
        author: username,
        handle: `@${username}`,
        avatarUrl: avatarUrl,
        title: title,
        caption: 'Sesi siaran langsung sedang berlangsung saat ini. Kehadiranmu dinantikan di ruang siaran.',
        url: `https://www.tiktok.com/@${username}/live`,
        previewUrl: previewUrl,
        extraInfo: 'Siaran Langsung • TikTok Live'
      });

      account.lastLive = true;
      saveSocmedConfig(guildId, config);
    } else if (!isLive && account.lastLive) {
      console.log(`[Socmed Tracker] @${username} siaran live telah berakhir.`);
      account.lastLive = false;
      saveSocmedConfig(guildId, config);
    }
  } catch (err) {
    // Non-intrusive logging untuk offline
  }
}

/**
 * Pengecekan RSS Feed (Instagram / TikTok) untuk postingan baru
 */
async function pollFeed(client, guildId, feedItem, config) {
  if (!feedItem.url) return;
  try {
    const feed = await rssParser.parseURL(feedItem.url);
    if (!feed?.items || feed.items.length === 0) return;

    const latest = feed.items[0];
    const postId = latest.guid || latest.link || latest.id || latest.title;

    if (!postId) return;

    // Jika ini adalah polling pertama kali akun didaftarkan, catat ID tanpa flood spam
    if (!feedItem.lastPostId) {
      feedItem.lastPostId = postId;
      saveSocmedConfig(guildId, config);
      return;
    }

    // Jika terdeteksi postingan baru yang berbeda dari rekaman terakhir
    if (feedItem.lastPostId !== postId) {
      console.log(`[Socmed Tracker] Konten baru terdeteksi di feed ${feedItem.name || feedItem.url}`);

      // Ekstraksi thumbnail dari enclosure atau HTML
      let previewUrl = latest.enclosure?.url || null;
      if (!previewUrl && latest.content) {
        const imgMatch = latest.content.match(/<img[^>]+src="([^">]+)"/i);
        if (imgMatch) previewUrl = imgMatch[1];
      }

      const platform = (feedItem.platform || 'instagram').toLowerCase();
      const isTikTok = platform === 'tiktok';

      await sendSocmedNotification(client, guildId, {
        platform: isTikTok ? 'tiktok' : 'instagram',
        type: 'post',
        author: feedItem.name || feed.title || (isTikTok ? 'TikTok Creator' : 'Instagram Creator'),
        handle: `@${feedItem.name || 'creator'}`,
        title: latest.title || 'Konten Baru',
        caption: latest.contentSnippet || latest.content?.replace(/<[^>]+>/g, '').slice(0, 200) || 'Simak karya visual terbaru hari ini.',
        url: latest.link || (isTikTok ? 'https://www.tiktok.com' : 'https://www.instagram.com'),
        previewUrl: previewUrl,
        extraInfo: 'Publikasi Baru • Video / Postingan'
      });

      feedItem.lastPostId = postId;
      saveSocmedConfig(guildId, config);
    }
  } catch (err) {
    // Abaikan error jaringan sementara
  }
}

/**
 * Menjalankan satu siklus pemeriksaan untuk semua server
 */
async function checkAllGuilds(client) {
  const settings = storage.read('settings');
  for (const [guildId, guildSettings] of Object.entries(settings)) {
    const config = guildSettings.socmed;
    if (!config || !config.enabled) continue;
    if (!config.channelId && !config.tiktokChannelId && !config.instagramChannelId) continue;

    // Cek TikTok Live
    if (Array.isArray(config.tiktok)) {
      for (const account of config.tiktok) {
        await pollTikTokLive(client, guildId, account, config);
      }
    }

    // Cek RSS Feeds
    if (Array.isArray(config.feeds)) {
      for (const feed of config.feeds) {
        await pollFeed(client, guildId, feed, config);
      }
    }
  }
}

/**
 * Inisialisasi scheduler otomatis background (berjalan setiap 3 menit)
 */
function initSocmedScheduler(client) {
  console.log('📡 [Socmed Tracker] Memulai pemantau otomatis sosial media (TikTok & Instagram)...');

  // Jalankan cek perdana 30 detik setelah bot nyala
  setTimeout(() => {
    checkAllGuilds(client).catch(err => console.error('[Socmed Tracker] Cek awal error:', err.message));
  }, 30000);

  // Interval rutin tiap 3 menit (180.000 ms)
  setInterval(() => {
    checkAllGuilds(client).catch(err => console.error('[Socmed Tracker] Interval error:', err.message));
  }, 3 * 60 * 1000);
}

module.exports = {
  getSocmedConfig,
  saveSocmedConfig,
  sendSocmedNotification,
  checkAllGuilds,
  initSocmedScheduler,
  DEFAULT_ROLE_ID
};