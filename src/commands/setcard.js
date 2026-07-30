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
    const now = Date.now();

    // 🔒 DEDUPLICATION LOCK: Cegah 2 instance bot (misal: bot di laptop & bot di Railway)
    // yang menyala bersamaan dengan token yang sama mengirim 2 pesan sekaligus.
    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};

    const lastTime = settings[guildId].lastSetcardTimestamp || 0;
    if (now - lastTime < 4000) {
      console.warn('[/setcard] 🔒 Deduplication lock dipicu (dua instance bot berjalan bersamaan). Melewati pemrosesan kedua.');
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: `✅ Channel <#${channel.id}> telah dikonfigurasi!`,
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
      }
      return;
    }

    // Catat timestamp eksekusi sekarang
    settings[guildId].lastSetcardTimestamp = now;
    storage.write('settings', settings);

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

    // Kirim TEPAT 1 Panel Hub Card baru
    try {
      const payload = createCardHubPayload(interaction.guild);
      const sentMsg = await channel.send(payload);

      // Simpan channel ID & message ID terbaru ke settings per-guild
      const updatedSettings = storage.read('settings');
      if (!updatedSettings[guildId]) updatedSettings[guildId] = {};
      updatedSettings[guildId].cardResultChannel = channel.id;
      updatedSettings[guildId].cardHubMessageId = sentMsg.id;
      storage.write('settings', updatedSettings);

      // Respon balasan ke Admin HANYA terlihat sendiri (ephemeral)
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `✅ Channel <#${channel.id}> berhasil dikonfigurasi! Tepat 1 panel dipasang.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (err) {
      console.error('[/setcard] Gagal mengirim panel ke channel:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ Gagal mengirim panel ke <#${channel.id}>: ${err.message}`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
