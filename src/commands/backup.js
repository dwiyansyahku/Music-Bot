const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Download seluruh database bot sebagai file cadangan via cloud link (Owner / Admin Only)'),

  async execute(interaction, client) {
    const isOwner = await isBotOwner(interaction, client);
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return interaction.reply({
        content: '❌ Perintah ini khusus untuk **Bot Owner** atau **Server Administrator**.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const dataDir = path.join(process.cwd(), 'data');
      const fileList = [
        'cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
        'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json'
      ];

      const bundle = {};
      let totalFiles = 0;

      for (const fileName of fileList) {
        const filePath = path.join(dataDir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            bundle[fileName] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            totalFiles++;
          } catch (readErr) {
            console.error(`[Backup] Error membaca ${fileName}:`, readErr.message);
          }
        }
      }

      if (totalFiles === 0) {
        return interaction.editReply({
          content: '⚠️ Tidak ada file database yang ditemukan di folder `data/`.'
        });
      }

      const jsonStr = JSON.stringify(bundle, null, 2);
      const compressed = zlib.gzipSync(Buffer.from(jsonStr));
      const sizeOriginalKb = (jsonStr.length / 1024).toFixed(1);
      const sizeCompressedKb = (compressed.length / 1024).toFixed(1);

      let downloadUrl = null;

      // 1. Upload ke tmpfiles.org
      try {
        const blob = new Blob([compressed], { type: 'application/gzip' });
        const formData = new FormData();
        formData.append('file', blob, 'qumpruy_database_backup.json.gz');

        const res = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data?.data?.url) {
          downloadUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        }
      } catch (uploadErr) {
        console.error('[Backup] tmpfiles error:', uploadErr.message);
      }

      // 2. Fallback ke catbox.moe
      if (!downloadUrl) {
        try {
          const blob = new Blob([compressed], { type: 'application/gzip' });
          const formData = new FormData();
          formData.append('reqtype', 'fileupload');
          formData.append('fileToUpload', blob, 'qumpruy_database_backup.json.gz');

          const res = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
          });
          const text = await res.text();
          if (text && text.startsWith('http')) {
            downloadUrl = text.trim();
          }
        } catch (catboxErr) {
          console.error('[Backup] catbox error:', catboxErr.message);
        }
      }

      if (!downloadUrl) {
        return interaction.editReply({
          content: '❌ Gagal mengunggah file backup ke layanan cloud.'
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `DATABASE BACKUP — ${interaction.guild?.name?.toUpperCase() || 'SERVER'}`,
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Cadangan Database Berhasil Dibuat')
        .setDescription('Seluruh data profil member card, konfigurasi sistem, data voice tracker, dan log berhasil dikemas dengan aman.')
        .addFields(
          { name: 'Tabel Database', value: `${totalFiles} File JSON`, inline: true },
          { name: 'Ukuran Asli', value: `${sizeOriginalKb} KB`, inline: true },
          { name: 'Ukuran Arsip', value: `${sizeCompressedKb} KB`, inline: true }
        )
        .setFooter({ text: 'Cadangan privat • Klik tautan untuk mengunduh arsip' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Unduh File Cadangan ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(downloadUrl)
      );

      return interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.error('[Backup Command Error]:', err);
      return interaction.editReply({
        content: `❌ Gagal membuat backup: ${err.message}`
      });
    }
  }
};
