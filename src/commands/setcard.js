const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const storage = require('../utils/storage');
const { createCardHubPayload } = require('../utils/cardHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcard')
    .setDescription('Atur channel tempat panel Card Member diterbitkan (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Text channel untuk menempatkan panel Card Member')
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
    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};

    // 🧹 SAPU BERSIH SELURUH PESAN PANEL LAMA DI CHANNEL TERSANGKUT
    try {
      const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (fetched) {
        const oldPanelMsgs = fetched.filter(m =>
          m.author.id === client.user.id &&
          m.embeds.some(e => e.title && e.title.includes('Kartu Identitas Member Server'))
        );
        for (const msg of oldPanelMsgs.values()) {
          await msg.delete().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[/setcard] Gagal membersihkan pesan panel lama:', e.message);
    }

    // Kirim 1 Panel Hub Card baru
    try {
      const payload = createCardHubPayload(interaction.guild);
      const sentMsg = await channel.send(payload);

      // Simpan channel ID & message ID terbaru ke settings per-guild
      settings[guildId].cardResultChannel = channel.id;
      settings[guildId].cardHubMessageId = sentMsg.id;
      storage.write('settings', settings);

      // Respon balasan ke Admin HANYA terlihat sendiri (ephemeral)
      await interaction.reply({
        content: `✅ Channel <#${channel.id}> berhasil dikonfigurasi! Semua panel lama telah dibersihkan dan dipasang 1 panel baru.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('[/setcard] Gagal mengirim panel ke channel:', err);
      await interaction.reply({
        content: `❌ Gagal mengirim panel ke <#${channel.id}>: ${err.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
