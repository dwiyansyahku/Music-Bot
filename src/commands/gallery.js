const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
  AttachmentBuilder
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod } = require('../utils/helpers');
const { sendModLog } = require('../utils/modlog');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

/**
 * Get date string in YYYY-MM-DD for WIB
 */
function getWIBDateString() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (7 * 3600000));
  return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`;
}



/**
 * Unduh dan verifikasi file gambar dari URL (Mendukung link direct gambar, Imgur, Pinterest, OpenGraph og:image, dll.)
 */
async function resolveAndDownloadImage(inputUrl) {
  let targetUrl = (inputUrl || '').trim();

  if (!/^https?:\/\/.+/i.test(targetUrl)) {
    throw new Error('Tautan tidak valid! Tautan harus diawali dengan http:// atau https://');
  }

  // 1. Tangani tautan Google Images redirect (https://www.google.com/imgres?imgurl=...)
  if (targetUrl.includes('google.com/imgres') || targetUrl.includes('google.com/url')) {
    try {
      const u = new URL(targetUrl);
      const realUrl = u.searchParams.get('imgurl') || u.searchParams.get('url');
      if (realUrl && /^https?:\/\//i.test(realUrl)) targetUrl = realUrl;
    } catch (_) {}
  }

  // 2. Tangani tautan Imgur page (https://imgur.com/xyz -> https://i.imgur.com/xyz.png)
  const imgurMatch = targetUrl.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurMatch && !['gallery', 'a', 't', 'upload'].includes(imgurMatch[1])) {
    targetUrl = `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
  };

  let res = null;
  try {
    res = await fetch(targetUrl, {
      headers: defaultHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
  } catch (netErr) {
    throw new Error(`Koneksi ke situs gagal (${netErr.message || 'Timeout / Server menolak koneksi'})`);
  }

  if (!res.ok) {
    throw new Error(`Situs menolak akses gambar (HTTP ${res.status}: ${res.statusText || 'Forbidden'})`);
  }

  let contentType = (res.headers.get('content-type') || '').toLowerCase();

  // 3. Jika URL mengembalikan halaman HTML (bukan file gambar langsung), ambil OpenGraph / Twitter Image
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
                    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i) ||
                    html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      let resolvedUrl = ogMatch[1].replace(/&amp;/g, '&');
      if (resolvedUrl.startsWith('//')) {
        resolvedUrl = 'https:' + resolvedUrl;
      } else if (resolvedUrl.startsWith('/')) {
        const u = new URL(targetUrl);
        resolvedUrl = `${u.origin}${resolvedUrl}`;
      }

      try {
        res = await fetch(resolvedUrl, {
          headers: defaultHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(30000)
        });
      } catch (ogErr) {
        throw new Error(`Gagal mengunduh gambar pratinjau situs (${ogErr.message})`);
      }

      if (!res.ok) {
        throw new Error(`Situs memblokir pratinjau gambar (HTTP ${res.status})`);
      }
      contentType = (res.headers.get('content-type') || '').toLowerCase();
    } else {
      throw new Error('Tautan tersebut adalah tautan halaman web (bukan gambar langsung) dan tidak memiliki gambar pratinjau.');
    }
  }

  if (!contentType.includes('image/')) {
    throw new Error(`Tautan tersebut bukan file gambar (Tipe: ${contentType || 'tidak diketahui'}). Gunakan link langsung berakhiran .png, .jpg, atau upload file.`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_FILE_SIZE) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new Error(`Ukuran gambar terlalu besar (${sizeMb}MB). Batas maksimal adalah 8MB.`);
  }

  // Tentukan ekstensi
  let ext = 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
  else if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('gif')) ext = 'gif';

  return {
    buffer,
    contentType,
    ext,
    size: buffer.length
  };
}

/**
 * Kompresi dan optimasi ukuran buffer gambar sebelum di-upload ke Discord API
 * Mencegah timeout, socket hangup, atau error "This operation was aborted" / "other side closed"
 * @param {Buffer} buffer - Buffer gambar asli
 * @param {string} originalExt - Ekstensi asli (png, jpg, webp, gif)
 * @param {boolean} isMulti - True jika gambar ini bagian dari upload multi-image (kompresi lebih agresif)
 */
/**
 * Kompresi dan optimasi ukuran buffer gambar sebelum di-upload ke Discord API
 * Mencegah timeout, socket hangup, atau error "other side closed"
 * @param {Buffer} buffer - Buffer gambar asli
 * @param {string} originalExt - Ekstensi asli (png, jpg, webp, gif)
 * @param {boolean} isMulti - True jika gambar ini bagian dari upload multi-image (kompresi agresif)
 */
async function optimizeImageBuffer(buffer, originalExt, isMulti = false) {
  // GIF tidak dikompresi (animasi rusak)
  if (originalExt === 'gif') {
    return { buffer, ext: originalExt };
  }

  // Multi-image: kompresi jika > 150KB agar total payload 3-4 foto sangat kecil (< 400KB)
  // Single image: kompresi jika > 1MB
  const sizeThreshold = isMulti ? 150 * 1024 : 1024 * 1024;
  if (buffer.length <= sizeThreshold) {
    return { buffer, ext: originalExt };
  }

  try {
    const img = await loadImage(buffer);
    const maxDim = isMulti ? 1200 : 1920; // 1200px sangat tajam untuk preview grid & fullscreen
    const quality = isMulti ? 75 : 85;     // 75% JPEG sangat ringan (~70-120KB per foto)
    let width = img.width;
    let height = img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const optimizedBuffer = canvas.toBuffer('image/jpeg', quality);
    if (optimizedBuffer.length < buffer.length) {
      console.log(`[Gallery] Optimized image: ${(buffer.length / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB`);
      return { buffer: optimizedBuffer, ext: 'jpg' };
    }
  } catch (optErr) {
    console.warn('[Gallery] Image optimization fallback to original:', optErr.message);
  }

  return { buffer, ext: originalExt };
}

/**
 * Cek apakah URL berasal dari Discord CDN (attachment yang sudah ada di server Discord)
 */
function isDiscordCdnUrl(url) {
  return /^https?:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//i.test(url);
}

/**
 * Fungsi utama untuk mempublikasikan 1 atau banyak gambar ke Saluran Output Galeri.
 * TAMPILAN:
 * - 1 Foto: Dikirim sebagai Embed elegan dengan author, caption & footer.
 * - Multi Foto (>= 2): Dikirim sebagai file lampiran langsung (Native Discord Mosaic Grid).
 *   Discord otomatis merender kolase mosaic (1 besar + 2 kecil, atau 2x2) seperti di Gambar 2,
 *   dan saat diklik oleh user bisa dilihat & di-slide satu per satu full screen!
 */
async function publishGalleryPost(guild, user, member, inputUrls, caption, client) {
  const guildId = guild.id;
  const settings = storage.read('settings') || {};
  const guildSettings = settings[guildId] || {};
  const galleryChannelId = guildSettings.galleryChannel;

  if (!galleryChannelId) {
    return {
      success: false,
      error: 'Saluran Galeri Output belum dikonfigurasi. Hubungi Admin untuk mengatur dengan `/gallery setchannel`.'
    };
  }

  const galleryChannel = (guild.channels?.cache ? guild.channels.cache.get(galleryChannelId) : null) ||
    await guild.channels?.fetch?.(galleryChannelId).catch(() => null) ||
    await client?.channels?.fetch?.(galleryChannelId).catch(() => null);

  if (!galleryChannel) {
    return {
      success: false,
      error: 'Saluran Galeri Output tidak ditemukan. Hubungi Admin.'
    };
  }

  const urlList = (Array.isArray(inputUrls) ? inputUrls : [inputUrls]).filter(u => typeof u === 'string' && u.trim().length > 0);
  if (urlList.length === 0) {
    return {
      success: false,
      error: 'Tidak ada gambar yang valid untuk diposting ke galeri.'
    };
  }

  // Batasi maksimal 10 foto per pesan
  const targetUrls = urlList.slice(0, 10);

  // Generate Submission ID
  const submissionId = 'GAL_' + Date.now().toString(36).toUpperCase();
  const displayName = member?.displayName || user.username;
  const avatarUrl = user.displayAvatarURL({ dynamic: true });
  const imageCount = targetUrls.length;

  let postedMsg = null;
  let sendError = null;

  // ============================================================
  // STRATEGI UTAMA: URL-based Embed Mosaic (Same URL trick)
  // - 0% transfer file (0 bytes upload), 0% timeout, anti 'other side closed'
  // - Discord otomatis menggabungkan embeds dengan URL sama jadi 1 layout MOSAIC GRID
  // - Saat diklik oleh user, modal viewer/carousel Discord terbuka dan bisa di-slide satu per satu
  // ============================================================
  try {
    if (imageCount === 1) {
      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: displayName, iconURL: avatarUrl })
        .setImage(targetUrls[0])
        .setFooter({ text: `Galeri Server • ${submissionId}` })
        .setTimestamp();

      if (caption) embed.setDescription(caption);

      postedMsg = await galleryChannel.send({ embeds: [embed] });

    } else {
      // Multi-image: Gunakan URL pengait bersama yang sama di semua embed (Same URL trick)
      // Ini memberitahu Discord untuk merender gambar-gambar tersebut ke dalam 1 kotak Mosaic Grid!
      const embeds = [];

      // Discord menggabungkan per grup 4 embed dengan shared URL yang sama
      for (let i = 0; i < targetUrls.length; i++) {
        // Kelompokkan per 4 gambar: grup 0 (indeks 0-3), grup 1 (indeks 4-7)
        const groupIndex = Math.floor(i / 4);
        const sharedGroupUrl = targetUrls[groupIndex * 4];

        const embed = new EmbedBuilder()
          .setURL(sharedGroupUrl)
          .setImage(targetUrls[i]);

        // HANYA embed pertama yang memiliki metadata (author, deskripsi, footer, warna)
        // Embed berikutnya HANYA berisi URL dan Gambar agar Discord menggabungkannya
        if (i === 0) {
          embed.setColor(0x2B2D31)
            .setAuthor({ name: displayName, iconURL: avatarUrl })
            .setFooter({ text: `Galeri Server • ${submissionId} • ${imageCount} Foto` })
            .setTimestamp();

          if (caption) embed.setDescription(caption);
        }

        embeds.push(embed);
      }

      postedMsg = await galleryChannel.send({ embeds });
    }

    console.log(`[Gallery] URL-based Embed Mosaic berhasil diposting (${imageCount} foto).`);

  } catch (urlErr) {
    console.warn(`[Gallery] URL-based gagal (${urlErr.message}), mencoba fallback upload file...`);
    sendError = urlErr;
    postedMsg = null;
  }

  // ============================================================
  // FALLBACK: Download + Upload (hanya jika URL embed gagal)
  // ============================================================
  if (!postedMsg) {
    try {
      const downloadedFiles = [];
      for (let idx = 0; idx < Math.min(imageCount, 4); idx++) {
        try {
          const dl = await resolveAndDownloadImage(targetUrls[idx]);
          const opt = await optimizeImageBuffer(dl.buffer, dl.ext, true);
          const fileName = `gallery_${submissionId}_${idx + 1}.${opt.ext}`;
          downloadedFiles.push({
            attachment: new AttachmentBuilder(opt.buffer, { name: fileName }),
            fileName
          });
        } catch (dlErr) {
          console.warn(`[Gallery] Gagal fallback download #${idx + 1}:`, dlErr.message);
        }
      }

      if (downloadedFiles.length > 0) {
        const attachments = downloadedFiles.map(df => df.attachment);
        const contentText = caption
          ? `📸 **${displayName}** membagikan ${downloadedFiles.length} foto:\n> ${caption}\n*ID: \`${submissionId}\`*`
          : `📸 **${displayName}** membagikan ${downloadedFiles.length} foto ke galeri • *ID: \`${submissionId}\`*`;

        postedMsg = await galleryChannel.send({
          content: contentText,
          files: attachments
        });
        sendError = null;
        console.log(`[Gallery] File upload fallback berhasil (${downloadedFiles.length} foto).`);
      }
    } catch (uploadErr) {
      console.error('[Gallery] File upload fallback juga gagal:', uploadErr.message);
      sendError = uploadErr;
      postedMsg = null;
    }
  }

  if (!postedMsg) {
    console.error('[Gallery Send Error]:', sendError?.message);
    return {
      success: false,
      error: `Gagal mengirim gambar ke saluran <#${galleryChannelId}>: ${sendError?.message || 'Network Timeout'}`
    };
  }

  // Berikan 2 reaksi apresiasi acak
  const RANDOM_EMOJIS = ['❤️', '🔥', '✨', '👏', '🎨', '⭐', '💖'];
  const chosenEmojis = [...RANDOM_EMOJIS].sort(() => 0.5 - Math.random()).slice(0, 2);
  for (const em of chosenEmojis) {
    await postedMsg.react(em).catch(() => {});
  }

  // Pencatatan Statistik Harian & Simpan ke Storage
  const galleryData = storage.read('gallery') || {};
  if (!galleryData[guildId]) {
    galleryData[guildId] = {
      submissions: [],
      dailyUsage: {}
    };
  }

  const todayStr = getWIBDateString();
  const userDayKey = `${user.id}_${todayStr}`;
  const userTodayCount = galleryData[guildId].dailyUsage?.[userDayKey] || 0;
  galleryData[guildId].dailyUsage[userDayKey] = userTodayCount + imageCount;

  const finalAttachments = postedMsg.attachments ? Array.from(postedMsg.attachments.values()) : [];
  const primaryImageUrl = finalAttachments[0]?.url || targetUrls[0];
  const allImageUrls = finalAttachments.length > 0 ? finalAttachments.map(a => a.url) : targetUrls;

  galleryData[guildId].submissions.push({
    id: submissionId,
    messageId: postedMsg.id,
    channelId: galleryChannel.id,
    userId: user.id,
    imageUrl: primaryImageUrl,
    imageUrls: allImageUrls,
    imageCount: imageCount,
    caption: caption || null,
    createdAt: Date.now()
  });
  storage.write('gallery', galleryData);

  // Mod Log
  await sendModLog(guild, client, {
    action: 'GALLERY_POST',
    moderator: user,
    details: `Gambar (${imageCount} foto) berhasil diposting ke <#${galleryChannel.id}>.\n` +
      `• ID Pesan: \`${postedMsg.id}\`\n` +
      `• Total Kiriman Hari Ini: **${userTodayCount + imageCount} Foto**\n` +
      (caption ? `• Caption: *${caption}*` : '')
  });

  const jumpUrl = `https://discord.com/channels/${guildId}/${galleryChannel.id}/${postedMsg.id}`;
  return {
    success: true,
    messageId: postedMsg.id,
    channelId: galleryChannel.id,
    jumpUrl,
    photoCount: imageCount,
    remaining: null
  };
}

// Wrapper untuk kompatibilitas ke belakang
async function publishGalleryItem(guild, user, member, imageUrl, caption, client) {
  return publishGalleryPost(guild, user, member, imageUrl, caption, client);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gallery')
    .setDescription('Sistem Saluran Galeri Gambar Terkurasi Bot (2-Saluran: Upload & Output)')
    // Subcommand: submit
    .addSubcommand(sub =>
      sub
        .setName('submit')
        .setDescription('Kirim gambar/foto/karya ke saluran galeri server')
        .addAttachmentOption(opt =>
          opt
            .setName('image')
            .setDescription('File gambar yang ingin dipajang (PNG, JPG, GIF, WEBP)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('caption')
            .setDescription('Judul atau caption pelengkap gambar')
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    // Subcommand: setchannel (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur konfigurasi 2-saluran galeri (Channel 1: Upload & Channel 2: Output)')
        .addChannelOption(opt =>
          opt
            .setName('output')
            .setDescription('Channel 2: Saluran output pameran foto (anti-chat langsung, hanya reaksi)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt
            .setName('upload')
            .setDescription('Channel 1: Saluran upload gambar (bebas chat, bot otomatis mendeteksi & memindahkan gambar)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    // Subcommand: config (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Lihat status konfigurasi 2-saluran dan statistik galeri')
    )
    // Subcommand: delete (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Hapus kiriman gambar dari galeri berdasarkan ID pesan (Admin only)')
        .addStringOption(opt =>
          opt
            .setName('message_id')
            .setDescription('ID pesan Discord gambar galeri yang ingin dihapus')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('alasan')
            .setDescription('Alasan penghapusan gambar')
            .setRequired(false)
        )
    ),

  publishGalleryPost,
  publishGalleryItem,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const settings = storage.read('settings') || {};
    const guildSettings = settings[guildId] || {};

    // ==========================================
    // 1. SUBCOMMAND: SUBMIT (Semua Member)
    // ==========================================
    if (sub === 'submit') {
      const attachment = interaction.options.getAttachment('image');
      const caption = interaction.options.getString('caption')?.trim() || '';

      // Validasi Ekstensi / Format File
      const fileExt = (attachment.name?.split('.').pop() || '').toLowerCase();
      const contentType = attachment.contentType || '';
      const isImage = ALLOWED_EXTENSIONS.includes(fileExt) || contentType.startsWith('image/');

      if (!isImage) {
        return interaction.reply({
          content: `❌ Format file tidak didukung! Harap unggah file gambar dengan format: \`${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Validasi Ukuran File
      if (attachment.size > MAX_FILE_SIZE) {
        return interaction.reply({
          content: `❌ Ukuran gambar terlalu besar (${(attachment.size / (1024 * 1024)).toFixed(1)}MB)! Batas maksimal adalah **8MB**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const res = await publishGalleryItem(
        interaction.guild,
        interaction.user,
        interaction.member,
        attachment.url,
        caption,
        client
      );

      if (!res.success) {
        return interaction.editReply({ content: `❌ ${res.error}` });
      }

      const replyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Lihat Postingan')
          .setStyle(ButtonStyle.Link)
          .setURL(res.jumpUrl)
      );

      return interaction.editReply({
        content: `✨ Gambar karyamu berhasil dipajang di <#${res.channelId}>!`,
        components: [replyRow]
      });
    }

    // ==========================================
    // 2. SUBCOMMAND: SETCHANNEL (Admin Only)
    // ==========================================
    if (sub === 'setchannel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Perintah ini hanya dapat dijalankan oleh **Administrator** atau **Moderator**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const outputChannel = interaction.options.getChannel('output') || interaction.options.getChannel('channel');
      const uploadChannel = interaction.options.getChannel('upload') || interaction.options.getChannel('panel');

      if (!settings[guildId]) settings[guildId] = {};
      if (outputChannel) settings[guildId].galleryChannel = outputChannel.id;
      if (uploadChannel) {
        settings[guildId].galleryUploadChannel = uploadChannel.id;
        settings[guildId].galleryPanelChannel = uploadChannel.id;
      }
      storage.write('settings', settings);

      let detailsText = `Channel 2 (Output Galeri): <#${outputChannel?.id || settings[guildId].galleryChannel}>`;
      if (uploadChannel) {
        detailsText += `\nChannel 1 (Upload Gambar): <#${uploadChannel.id}>`;
      }

      await sendModLog(interaction.guild, client, {
        action: 'SETCHANNEL',
        moderator: interaction.user,
        details: detailsText
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Konfigurasi 2-Saluran Galeri Berhasil')
        .setDescription(
          `Pengaturan saluran galeri server telah berhasil diperbarui:\n\n` +
          `• **Channel 1 (Upload Gambar)**: ${uploadChannel?.id || settings[guildId].galleryUploadChannel || settings[guildId].galleryPanelChannel ? `<#${uploadChannel?.id || settings[guildId].galleryUploadChannel || settings[guildId].galleryPanelChannel}>` : '_Belum diatur_'}\n` +
          `  *(Member bebas chat di sini. Bot hanya mendeteksi gambar dan otomatis meneruskannya ke Channel 2)*\n\n` +
          `• **Channel 2 (Output Galeri)**: <#${outputChannel?.id || settings[guildId].galleryChannel}>\n` +
          `  *(Saluran pameran foto terkurasi. Anti-chat langsung, khusus pameran foto & reaksi)*\n\n` +
          `💡 **Tips**: Member cukup mengirimkan file foto di Channel 1, dan foto akan langsung dipajang secara otomatis di Channel 2!`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ==========================================
    // 3. SUBCOMMAND: CONFIG (Admin Only)
    // ==========================================
    if (sub === 'config') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Perintah ini hanya dapat dijalankan oleh **Administrator** atau **Moderator**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const galleryChannelId = guildSettings.galleryChannel;
      const uploadChannelId = guildSettings.galleryUploadChannel || guildSettings.galleryPanelChannel;
      const galleryData = storage.read('gallery') || {};
      const guildGallery = galleryData[guildId] || { submissions: [], dailyUsage: {} };

      const totalSubmissions = guildGallery.submissions?.length || 0;
      const todayStr = getWIBDateString();
      let todayCount = 0;
      for (const [key, count] of Object.entries(guildGallery.dailyUsage || {})) {
        if (key.endsWith(`_${todayStr}`)) {
          todayCount += count;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Konfigurasi 2-Saluran & Statistik Galeri')
        .addFields(
          {
            name: 'Channel 1 (Upload Gambar)',
            value: uploadChannelId ? `<#${uploadChannelId}>\n_(Bebas chat, bot mendeteksi gambar)_` : '_Belum diatur (`/gallery setchannel upload:#channel`)_',
            inline: false
          },
          {
            name: 'Channel 2 (Output Galeri)',
            value: galleryChannelId ? `<#${galleryChannelId}>\n_(Terkurasi, anti-chat, hanya reaksi)_` : '_Belum dikonfigurasi (`/gallery setchannel output:#channel`)_',
            inline: false
          },
          {
            name: 'Batas Harian / Member',
            value: '**Tanpa Batas Kuota (Unlimited)**',
            inline: true
          },
          {
            name: 'Batas Ukuran File',
            value: `**8MB (PNG, JPG, GIF, WEBP)**`,
            inline: true
          },
          {
            name: 'Total Gambar Dipajang',
            value: `**${totalSubmissions.toLocaleString()} Gambar**`,
            inline: true
          },
          {
            name: 'Kiriman Hari Ini (WIB)',
            value: `**${todayCount.toLocaleString()} Gambar**`,
            inline: true
          }
        )
        .setFooter({ text: `${interaction.guild.name} • Gallery Management` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }



    // ==========================================
    // 5. SUBCOMMAND: DELETE (Admin Only)
    // ==========================================
    if (sub === 'delete') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Perintah ini hanya dapat dijalankan oleh **Administrator** atau **Moderator**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const messageId = interaction.options.getString('message_id').trim();
      const alasan = interaction.options.getString('alasan') || 'Dihapus oleh Moderator';

      const galleryChannelId = guildSettings.galleryChannel;
      const targetChannel = galleryChannelId
        ? (interaction.guild.channels.cache.get(galleryChannelId) || await interaction.guild.channels.fetch(galleryChannelId).catch(() => null))
        : interaction.channel;

      if (!targetChannel) {
        return interaction.reply({
          content: '❌ Saluran galeri output tidak ditemukan.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const msgToDelete = await targetChannel.messages.fetch(messageId).catch(() => null);
        if (!msgToDelete) {
          return interaction.editReply({
            content: `❌ Pesan dengan ID \`${messageId}\` tidak ditemukan di saluran <#${targetChannel.id}>.`
          });
        }

        await msgToDelete.delete();

        // Hapus dari data gallery jika tercatat
        const galleryData = storage.read('gallery') || {};
        if (galleryData[guildId]?.submissions) {
          const idx = galleryData[guildId].submissions.findIndex(s => s.messageId === messageId);
          if (idx !== -1) {
            galleryData[guildId].submissions.splice(idx, 1);
            storage.write('gallery', galleryData);
          }
        }

        await sendModLog(interaction.guild, client, {
          action: 'GALLERY_DELETE',
          moderator: interaction.user,
          reason: alasan,
          details: `Gambar di <#${targetChannel.id}> dengan ID Pesan \`${messageId}\` telah dihapus.`
        });

        return interaction.editReply({
          content: `✅ Postingan gambar dengan ID \`${messageId}\` berhasil dihapus dari galeri.`
        });
      } catch (err) {
        return interaction.editReply({
          content: `❌ Gagal menghapus gambar: ${err.message}`
        });
      }
    }
  }
};
