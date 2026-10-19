const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const storage = require('./storage');
const { getRandomPhrase } = require('./socmedPhrases');
const { renderSocmedCard } = require('./socmedCanvas');
const { TikTokLiveConnection } = require('tiktok-live-connector');
const Parser = require('rss-parser');

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  }
});

const DEFAULT_ROLE_ID = '1396396538686607410';

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
 * Mengirim notifikasi visual mewah (Canvas + Embed + Role Mention) ke channel yang diset
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
  if (!config.channelId) {
    console.warn(`[Socmed] Guild ${guildId} belum mengatur channelId socmed.`);
    return false;
  }

  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channel = guild.channels.cache.get(config.channelId) || await guild.channels.fetch(config.channelId).catch(() => null);
  if (!channel) {
    console.warn(`[Socmed] Channel ${config.channelId} tidak ditemukan di guild ${guild.name}.`);
    return false;
  }

  const isTikTok = data.platform.toLowerCase() === 'tiktok';
  const isLive = data.type.toLowerCase() === 'live';

  // 1. Pilih kalimat ajakan elegan secara acak (rotasi dinamis)
  const invitationPhrase = getRandomPhrase(isLive ? 'live' : 'post');
  const roleMention = config.roleId ? `<@&${config.roleId}>` : `<@&${DEFAULT_ROLE_ID}>`;
  const messageContent = `${roleMention}\n\n${invitationPhrase}`;

  // 2. Render Kartu Canvas Resolusi Tinggi (1200 x 630)
  let attachment = null;
  try {
    const cardBuffer = await renderSocmedCard({
      platform: data.platform,
      type: data.type,
      author: data.author,
      handle: data.handle,
      avatarUrl: data.avatarUrl,
      title: data.title,
      caption: data.caption,
      previewUrl: data.previewUrl,
      extraInfo: data.extraInfo || (isLive ? 'Siaran Langsung • Live Broadcast' : 'Publikasi Konten Baru')
    });
    attachment = new AttachmentBuilder(cardBuffer, { name: 'socmed-preview.png' });
  } catch (canvasErr) {
    console.error('[Socmed Canvas] Gagal render canvas:', canvasErr.message);
  }

  // 3. Bangun Embed yang Elegan dan Rapi
  const embedColor = isTikTok
    ? (isLive ? 0xFE2C55 : 0x00F2FE)
    : (isLive ? 0xE1306C : 0x833AB4);

  const cleanTitle = data.title || (isLive ? `Siaran Langsung dari ${data.author}` : `Konten Baru dari ${data.author}`);
  const cleanExcerpt = data.caption ? `> *${data.caption.replace(/\n+/g, ' ').slice(0, 300)}*` : '> *Simak cuplikan lengkap melalui tautan di bawah.*';

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: `${data.author} (${data.handle})`,
      iconURL: data.avatarUrl || undefined,
      url: data.url
    })
    .setTitle(cleanTitle)
    .setURL(data.url)
    .setDescription(
      `${cleanExcerpt}\n\n` +
      `**Platform:** \`${isTikTok ? 'TikTok' : 'Instagram'}\` • **Status:** \`${isLive ? 'Sedang Berlangsung' : 'Tersedia'}\``
    )
    .setFooter({
      text: `Qumpruy • ${isTikTok ? 'TikTok' : 'Instagram'} Notification`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();

  if (attachment) {
    embed.setImage('attachment://socmed-preview.png');
  } else if (data.previewUrl) {
    embed.setImage(data.previewUrl);
  }

  // 4. Tombol Akses Langsung
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(isLive ? `Masuk ke Live ${isTikTok ? 'TikTok' : 'Instagram'}` : `Tonton di ${isTikTok ? 'TikTok' : 'Instagram'}`)
      .setStyle(ButtonStyle.Link)
      .setURL(data.url)
  );

  // Kirim ke Discord
  const sendOptions = {
    content: messageContent,
    embeds: [embed],
    components: [row]
  };
  if (attachment) {
    sendOptions.files = [attachment];
  }

  await channel.send(sendOptions);
  console.log(`[Socmed] Notifikasi ${data.platform} (${data.type}) berhasil dikirim ke #${channel.name} (${guild.name})`);
  return true;
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
    if (!config || !config.enabled || !config.channelId) continue;

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
