const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const storage = require('../utils/storage');
const { createCardHubPayload } = require('../utils/cardHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcard')
    .setDescription('Atur channel tempat panel tombol Card Member dipasang (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Text channel untuk menempatkan panel Card Member (misal: #create-card)')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased() || channel.isThread()) {
      return interaction.reply({
        content: '❌ Pilih text channel biasa (bukan thread/forum).',
        flags: MessageFlags.Ephemeral
      });
    }

    const botPerms = channel.permissionsFor(interaction.guild.members.me);
    if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
      return interaction.reply({
        content: `❌ Bot tidak memiliki izin **Send Messages** atau **Embed Links** di <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const guildId = interaction.guild.id;
    const payload = createCardHubPayload(interaction.guild);

    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};

    // 🧹 PURGE EXTRA BOT MESSAGES: Ambil 100 pesan terakhir di channel panel, hapus pesan bot lama & sisakan TEPAT 1 panel
    try {
      const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (fetched) {
        const botMessages = [...fetched.values()]
          .filter(m => m.author.id === client.user.id)
          .sort((a, b) => b.createdTimestamp - a.createdTimestamp); // Urutkan dari yang terbaru

        if (botMessages.length > 0) {
          // Gunakan pesan bot terbaru (botMessages[0]), HAPUS SEMUA PESAN BOT LAINNYA
          const latestMsg = botMessages[0];
          await latestMsg.edit(payload).catch(() => {});

          for (let i = 1; i < botMessages.length; i++) {
            await botMessages[i].delete().catch(() => {});
          }

          // Simpan ID channel & pesan panel
          settings[guildId].cardHubChannelId = channel.id;
          settings[guildId].cardHubMessageId = latestMsg.id;
          // Pastikan cardResultChannel tetap mengarah ke #card-gallery
          settings[guildId].cardResultChannel = '1532290934396555354';
          storage.write('settings', settings);

          return interaction.reply({
            content: `✅ Berhasil memasang panel tombol Card Member di <#${channel.id}>! Tepat 1 panel dipasang.`,
            flags: MessageFlags.Ephemeral
          });
        }
      }
    } catch (e) {
      console.warn('[/setcard] Error purging extra bot messages:', e.message);
    }

    // Jika belum ada pesan bot sama sekali di channel ini, kirim 1 baru
    try {
      const sentMsg = await channel.send(payload);
      settings[guildId].cardHubChannelId = channel.id;
      settings[guildId].cardHubMessageId = sentMsg.id;
      settings[guildId].cardResultChannel = '1532290934396555354';
      storage.write('settings', settings);

      await interaction.reply({
        content: `✅ Panel Card Member berhasil dipasang di <#${channel.id}>! Tepat 1 panel dipasang.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('[/setcard] Error:', err);
      await interaction.reply({
        content: `❌ Gagal mengatur panel di <#${channel.id}>: ${err.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
