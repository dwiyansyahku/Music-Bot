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

    // Simpan channel di settings per-guild
    const guildId = interaction.guild.id;
    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};
    settings[guildId].cardResultChannel = channel.id;
    storage.write('settings', settings);

    // Kirim Panel Hub Card lengkap dengan tombol & form pop-up di channel tujuan
    try {
      const payload = createCardHubPayload(interaction.guild);
      await channel.send(payload);

      // Respon balasan ke Admin HANYA terlihat sendiri (ephemeral)
      await interaction.reply({
        content: `✅ Panel Card Member berhasil dikirim ke <#${channel.id}> dan channel telah dikonfigurasi.`,
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
