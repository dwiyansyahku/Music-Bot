const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod } = require('../utils/helpers');
const { sendModLog } = require('../utils/modlog');

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_DAILY_SUBMISSIONS = 5;

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
 * Build Gallery Information Panel Payload
 */
function createGalleryPanelPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `KOMUNITAS GALERI & KARYA — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle('📸 Saluran Resmi Galeri Foto & Karya Seni')
    .setDescription(
      `Selamat datang di **Galeri Server**!\n\n` +
      `Saluran ini didedikasikan khusus untuk memajang karya seni, fotografi, tangkapan layar game, dan momen terbaik seluruh member.\n\n` +
      `**Aturan Pengiriman Gambar:**\n` +
      `• Seluruh gambar wajib dikirimkan **melalui bot** agar tampilan galeri tetap bersih dan rapi.\n` +
      `• Format yang didukung: **PNG, JPG, JPEG, GIF, WEBP** (maksimal 8MB).\n` +
      `• Batas pengiriman: **Maksimal ${MAX_DAILY_SUBMISSIONS} gambar per hari** per member.\n` +
      `• Dilarang keras mengirimkan konten NSFW, gore, atau gambar yang melanggar ketentuan server!\n\n` +
      `**Cara Mengirim Gambar:**\n` +
      `Ketik perintah \`/gallery submit\` lalu lampirkan gambar dan caption pilihanmu.`
    )
    .setFooter({ text: `${guild.name} • Galeri Bot Terkurasi` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('gallery_btn_submit')
      .setLabel('Kirim Gambar ke Galeri')
      .setEmoji('📸')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('gallery_btn_rules')
      .setLabel('Panduan & Ketentuan')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gallery')
    .setDescription('Sistem Saluran Galeri Gambar Terkurasi Bot')
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
        .setDescription('Atur channel target untuk posting galeri gambar (Admin only)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Pilih channel teks untuk galeri')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    // Subcommand: config (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Lihat status konfigurasi dan statistik saluran galeri')
    )
    // Subcommand: panel (Admin only)
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Pasang panel galeri interaktif permanen di channel ini (Admin only)')
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

  createGalleryPanelPayload,

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const settings = storage.read('settings') || {};
    const guildSettings = settings[guildId] || {};

    // ==========================================
    // 1. SUBCOMMAND: SUBMIT (Semua Member)
    // ==========================================
    if (sub === 'submit') {
      const galleryChannelId = guildSettings.galleryChannel;
      if (!galleryChannelId) {
        return interaction.reply({
          content: '❌ Saluran Galeri belum dikonfigurasi di server ini. Harap minta Admin untuk mengatur saluran dengan `/gallery setchannel`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const galleryChannel = interaction.guild.channels.cache.get(galleryChannelId) ||
        await interaction.guild.channels.fetch(galleryChannelId).catch(() => null);

      if (!galleryChannel) {
        return interaction.reply({
          content: '❌ Saluran galeri yang dikonfigurasi tidak dapat ditemukan. Hubungi Administrator.',
          flags: MessageFlags.Ephemeral
        });
      }

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

      // Validasi Limit Harian (Anti-Spam)
      const galleryData = storage.read('gallery') || {};
      if (!galleryData[guildId]) {
        galleryData[guildId] = {
          submissions: [],
          dailyUsage: {}
        };
      }

      const todayStr = getWIBDateString();
      const userDayKey = `${interaction.user.id}_${todayStr}`;
      const userTodayCount = galleryData[guildId].dailyUsage?.[userDayKey] || 0;

      if (userTodayCount >= MAX_DAILY_SUBMISSIONS) {
        return interaction.reply({
          content: `❌ Kamu telah mencapai batas harian pengiriman galeri (**${MAX_DAILY_SUBMISSIONS}/${MAX_DAILY_SUBMISSIONS} Gambar** hari ini). Silakan kirimkan kembali besok!`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Generate Submission ID
      const submissionId = 'GAL_' + Date.now().toString(36).toUpperCase();

      // Buat Embed Galeri Rapi
      const postEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: interaction.member?.displayName || interaction.user.username,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setImage(attachment.url)
        .setFooter({
          text: `Galeri Server • Submission ID: ${submissionId}`
        })
        .setTimestamp();

      if (caption) {
        postEmbed.setDescription(caption);
      }

      // Kirim postingan ke galeri channel
      let postedMsg = null;
      try {
        postedMsg = await galleryChannel.send({ embeds: [postEmbed] });
        // Tambahkan reaksi apresiasi default
        await postedMsg.react('❤️').catch(() => {});
        await postedMsg.react('🔥').catch(() => {});
      } catch (postErr) {
        console.error('[Gallery Send Error]:', postErr.message);
        return interaction.editReply({
          content: `❌ Gagal mengirim gambar ke saluran <#${galleryChannelId}>: ${postErr.message}`
        });
      }

      // Simpan ke storage
      galleryData[guildId].dailyUsage[userDayKey] = userTodayCount + 1;
      galleryData[guildId].submissions.push({
        id: submissionId,
        messageId: postedMsg.id,
        channelId: galleryChannel.id,
        userId: interaction.user.id,
        imageUrl: attachment.url,
        caption: caption || null,
        createdAt: Date.now()
      });
      storage.write('gallery', galleryData);

      // Audit Log
      await sendModLog(interaction.guild, client, {
        action: 'GALLERY_POST',
        moderator: interaction.user,
        details: `Gambar berhasil diposting ke <#${galleryChannel.id}>.\n` +
          `• ID Pesan: \`${postedMsg.id}\`\n` +
          `• Sisa Kuota Hari Ini: **${MAX_DAILY_SUBMISSIONS - (userTodayCount + 1)}/${MAX_DAILY_SUBMISSIONS}**\n` +
          (caption ? `• Caption: *${caption}*` : '')
      });

      const jumpUrl = `https://discord.com/channels/${guildId}/${galleryChannel.id}/${postedMsg.id}`;
      const replyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Lihat Postingan')
          .setStyle(ButtonStyle.Link)
          .setURL(jumpUrl)
      );

      return interaction.editReply({
        content: `✅ Gambar karyamu berhasil dipajang di <#${galleryChannel.id}>!\nSisa kuota submit hari ini: **${MAX_DAILY_SUBMISSIONS - (userTodayCount + 1)}/${MAX_DAILY_SUBMISSIONS}**`,
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

      const targetChannel = interaction.options.getChannel('channel');
      if (!settings[guildId]) settings[guildId] = {};
      settings[guildId].galleryChannel = targetChannel.id;
      storage.write('settings', settings);

      await sendModLog(interaction.guild, client, {
        action: 'SETCHANNEL',
        moderator: interaction.user,
        details: `Saluran Galeri dikonfigurasi ke <#${targetChannel.id}>`
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Konfigurasi Saluran Galeri Berhasil')
        .setDescription(
          `Saluran resmi galeri server telah diatur ke <#${targetChannel.id}>.\n\n` +
          `• Seluruh kiriman melalui \`/gallery submit\` akan dipajang di saluran tersebut secara rapi.\n` +
          `• Gunakan \`/gallery panel\` jika ingin memasang panel interaktif di saluran tertentu.`
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
        .setTitle('Konfigurasi & Statistik Saluran Galeri')
        .addFields(
          {
            name: 'Saluran Galeri',
            value: galleryChannelId ? `<#${galleryChannelId}>` : '_Belum dikonfigurasi (`/gallery setchannel`)_',
            inline: true
          },
          {
            name: 'Batas Harian / Member',
            value: `**${MAX_DAILY_SUBMISSIONS} Gambar / Hari**`,
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
    // 4. SUBCOMMAND: PANEL (Admin Only)
    // ==========================================
    if (sub === 'panel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Perintah ini hanya dapat dijalankan oleh **Administrator** atau **Moderator**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const payload = createGalleryPanelPayload(interaction.guild);
      await interaction.channel.send(payload);

      return interaction.reply({
        content: `✅ Panel galeri interaktif berhasil dipasang di <#${interaction.channelId}>.`,
        flags: MessageFlags.Ephemeral
      });
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
          content: '❌ Saluran galeri tidak ditemukan.',
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
