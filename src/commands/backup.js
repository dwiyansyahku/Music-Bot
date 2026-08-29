const { SlashCommandBuilder, AttachmentBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Download seluruh database bot sebagai file cadangan (Owner / Admin Only)'),

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

      const foundFiles = [];
      for (const fileName of fileList) {
        const filePath = path.join(dataDir, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          foundFiles.push({ name: fileName, path: filePath, size: stats.size });
        }
      }

      if (foundFiles.length === 0) {
        return interaction.editReply({
          content: '⚠️ Tidak ada file database yang ditemukan di folder `data/`.'
        });
      }

      // Kirim pesan awal
      const fileListStr = foundFiles.map(f => {
        const kb = (f.size / 1024).toFixed(1);
        return `• \`${f.name}\` (${kb} KB)`;
      }).join('\n');

      await interaction.editReply({
        content: `📦 **Backup Database — ${foundFiles.length} file ditemukan**\n${fileListStr}\n\n⏳ Mengirim file satu per satu...`
      });

      // Kirim setiap file satu per satu via followUp agar tidak kena limit
      let sentCount = 0;
      for (const file of foundFiles) {
        try {
          const buffer = fs.readFileSync(file.path);
          const attachment = new AttachmentBuilder(buffer, { name: file.name });

          await interaction.followUp({
            content: `📄 **${file.name}** (${(file.size / 1024).toFixed(1)} KB)`,
            files: [attachment],
            flags: MessageFlags.Ephemeral
          });
          sentCount++;

          // Delay kecil antar pengiriman agar tidak kena rate limit
          await new Promise(r => setTimeout(r, 1000));
        } catch (sendErr) {
          console.error(`[Backup] Gagal mengirim ${file.name}:`, sendErr.message);
          await interaction.followUp({
            content: `⚠️ Gagal mengirim \`${file.name}\`: ${sendErr.message}`,
            flags: MessageFlags.Ephemeral
          });
        }
      }

      await interaction.followUp({
        content: `✅ **Backup selesai!** ${sentCount}/${foundFiles.length} file berhasil dikirim.\nSilakan download semua file di atas untuk cadangan.`,
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      console.error('[Backup Command Error]:', err);
      return interaction.editReply({
        content: `❌ Gagal membuat backup: ${err.message}`
      });
    }
  }
};
