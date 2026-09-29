const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore database bot dari file backup .json.gz (Owner Only)')
    .addAttachmentOption(option =>
      option
        .setName('file')
        .setDescription('File backup .json.gz dari command /backup')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('URL download file backup .json.gz (alternatif jika tidak upload file)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Hanya Bot Owner yang bisa restore
    const isOwner = await isBotOwner(interaction, client);

    if (!isOwner) {
      return interaction.reply({
        content: '❌ Perintah ini **khusus untuk Bot Owner saja** demi keamanan data.',
        flags: MessageFlags.Ephemeral
      });
    }

    const attachment = interaction.options.getAttachment('file');
    const url = interaction.options.getString('url');

    if (!attachment && !url) {
      return interaction.reply({
        content: '❌ Kamu harus menyediakan **file attachment** atau **URL** dari backup.\n\n' +
          '**Cara pakai:**\n' +
          '• `/restore file:<upload file .json.gz>`\n' +
          '• `/restore url:<link download backup>`',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // 1. Download file backup
      const downloadUrl = attachment ? attachment.url : url;
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        return interaction.editReply({
          content: `❌ Gagal mendownload file backup. Status: ${response.status}`
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Decompress gzip
      let jsonStr;
      try {
        const decompressed = zlib.gunzipSync(buffer);
        jsonStr = decompressed.toString('utf8');
      } catch (gzipErr) {
        // Mungkin file tidak di-gzip, coba langsung parse sebagai JSON
        try {
          jsonStr = buffer.toString('utf8');
          JSON.parse(jsonStr); // Test parse
        } catch {
          return interaction.editReply({
            content: '❌ File tidak valid. Pastikan kamu upload file `.json.gz` dari command `/backup`.'
          });
        }
      }

      // 3. Parse JSON
      let bundle;
      try {
        bundle = JSON.parse(jsonStr);
      } catch (parseErr) {
        return interaction.editReply({
          content: '❌ File backup rusak — gagal parse JSON. Pastikan file dari command `/backup`.'
        });
      }

      // 4. Validasi: bundle harus berupa object dengan key berupa nama file .json
      const validFiles = [
        'cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
        'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json',
        'gallery.json', 'saweria_donations.json', 'season_data.json',
        'stardust_rain.json', 'throne_data.json', 'throne_duels.json'
      ];

      const keysInBackup = Object.keys(bundle);
      const validKeys = keysInBackup.filter(k => validFiles.includes(k));

      if (validKeys.length === 0) {
        return interaction.editReply({
          content: '❌ File backup tidak mengandung data yang valid. Pastikan file dari command `/backup`.'
        });
      }

      // 5. Buat backup data saat ini sebelum restore (safety net)
      const dataDir = path.join(process.cwd(), 'data');
      const backupDir = path.join(dataDir, '_pre_restore_backup');

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Backup file yang ada saat ini
      let backedUpCount = 0;
      for (const fileName of validKeys) {
        const currentFile = path.join(dataDir, fileName);
        if (fs.existsSync(currentFile)) {
          const backupFile = path.join(backupDir, fileName);
          fs.copyFileSync(currentFile, backupFile);
          backedUpCount++;
        }
      }

      // 6. Tulis data baru dari backup
      let restoredCount = 0;
      let skippedCount = 0;
      const restoredFiles = [];

      for (const fileName of validKeys) {
        try {
          const filePath = path.join(dataDir, fileName);
          const content = JSON.stringify(bundle[fileName], null, 2);
          fs.writeFileSync(filePath, content, 'utf8');
          restoredCount++;
          restoredFiles.push(fileName);
        } catch (writeErr) {
          console.error(`[Restore] Error menulis ${fileName}:`, writeErr.message);
          skippedCount++;
        }
      }

      // 7. Kirim hasil
      const sizeKb = (jsonStr.length / 1024).toFixed(1);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: `DATABASE RESTORE — ${interaction.guild?.name?.toUpperCase() || 'SERVER'}`,
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('✅ Restore Database Berhasil!')
        .setDescription(
          'Data dari file backup berhasil dipulihkan ke server.\n' +
          (backedUpCount > 0
            ? `\n📁 Data sebelumnya disimpan di \`data/_pre_restore_backup/\` untuk jaga-jaga.`
            : '')
        )
        .addFields(
          { name: 'File Dipulihkan', value: `${restoredCount} file`, inline: true },
          { name: 'Dilewati', value: `${skippedCount} file`, inline: true },
          { name: 'Ukuran Data', value: `${sizeKb} KB`, inline: true },
          {
            name: 'Detail File',
            value: restoredFiles.map(f => `✅ \`${f}\``).join('\n') || 'Tidak ada',
            inline: false
          }
        )
        .setFooter({ text: '⚠️ Restart bot jika diperlukan agar data terbaca dengan benar' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('[Restore Command Error]:', err);
      return interaction.editReply({
        content: `❌ Gagal melakukan restore: ${err.message}`
      });
    }
  }
};
