const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Download salinan seluruh database bot sebagai file attachment (Owner Only)'),

  async execute(interaction, client) {
    if (!isBotOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Perintah ini khusus untuk Bot Owner.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const dataDir = path.join(process.cwd(), 'data');
    const attachments = [];

    const fileList = ['cards.json', 'settings.json', 'voiceStats.json', 'jail.json', 'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json'];

    for (const fileName of fileList) {
      const filePath = path.join(dataDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          attachments.push(new AttachmentBuilder(fileBuffer, { name: fileName }));
        } catch (err) {
          console.error(`[Backup] Gagal membaca ${fileName}:`, err.message);
        }
      }
    }

    if (attachments.length === 0) {
      return interaction.editReply({
        content: '⚠️ Tidak ada file database yang ditemukan di folder `data/`.'
      });
    }

    return interaction.editReply({
      content: `📦 **Backup Database Berhasil Dibuat!** (${attachments.length} File)\nSilakan unduh file-file di bawah ini untuk disimpan sebagai cadangan:`,
      files: attachments
    });
  }
};
