const { SlashCommandBuilder, AttachmentBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Download seluruh database bot sebagai 1 file JSON cadangan (Owner / Admin Only)'),

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
      const backupBundle = {
        _meta: {
          exportedAt: new Date().toISOString(),
          guildId: interaction.guild?.id,
          guildName: interaction.guild?.name
        },
        data: {}
      };

      const fileList = [
        'cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
        'events.json', 'timecapsules.json', 'gacha_data.json', 'musicquiz_lb.json'
      ];

      let totalFiles = 0;

      for (const fileName of fileList) {
        const filePath = path.join(dataDir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            backupBundle.data[fileName] = JSON.parse(content);
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

      const jsonString = JSON.stringify(backupBundle, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');
      const attachment = new AttachmentBuilder(buffer, { name: 'qumpruy_database_backup.json' });

      return await interaction.editReply({
        content: `📦 **Backup Database Berhasil Dibuat!**\n` +
          `✅ Berhasil mengemas **${totalFiles} file database** ke dalam 1 file.\n` +
          `Silakan klik dan download file **\`qumpruy_database_backup.json\`** di bawah ini:`,
        files: [attachment]
      });
    } catch (err) {
      console.error('[Backup Command Error]:', err);
      return interaction.editReply({
        content: `❌ Gagal membuat backup: ${err.message}`
      });
    }
  }
};
