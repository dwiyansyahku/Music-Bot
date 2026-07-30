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

    // 🧹 CEK & PEMBERSIHAN MULTI-INSTANCE (Cegah duplikat meski ada 2 proses bot yang aktif)
    try {
      const fetched = await channel.messages.fetch({ limit: 25 }).catch(() => null);
      if (fetched) {
        const existingPanels = [...fetched.values()].filter(m =>
          m.author.id === client.user.id &&
          m.embeds.some(e => e.title && e.title.includes('Kartu Identitas Member Server'))
        );

        // Jika sudah ada panel yang baru saja dikirim oleh instance lain (<10 detik lalu), batalkan pengiriman duplikat
        const recentPanel = existingPanels.find(m => (now - m.createdTimestamp) < 10000);
        if (recentPanel) {
          console.log('[/setcard] 🔒 Panel baru saja terbit (<10s). Menghindari duplikasi.');
          // Hapus sisa panel tua jika ada
          for (const msg of existingPanels) {
            if (msg.id !== recentPanel.id) {
              await msg.delete().catch(() => {});
            }
          }
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `✅ Channel <#${channel.id}> telah dikonfigurasi!`,
              flags: MessageFlags.Ephemeral
            }).catch(() => {});
          }
          return;
        }

        // Hapus semua panel lama sebelum mengirim yang baru
        for (const msg of existingPanels) {
          await msg.delete().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[/setcard] Error saat memeriksa pesan lama:', e.message);
    }

    // Kirim TEPAT 1 Panel Hub Card baru
    try {
      const payload = createCardHubPayload(interaction.guild);
      const sentMsg = await channel.send(payload);

      // Simpan channel ID & message ID terbaru ke settings per-guild
      const settings = storage.read('settings');
      if (!settings[guildId]) settings[guildId] = {};
      settings[guildId].cardResultChannel = channel.id;
      settings[guildId].cardHubMessageId = sentMsg.id;
      storage.write('settings', settings);

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
