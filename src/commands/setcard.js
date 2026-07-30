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
    const payload = createCardHubPayload(interaction.guild);

    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};

    const savedChannelId = settings[guildId].cardResultChannel;
    const savedMsgId = settings[guildId].cardHubMessageId;

    // 1. Cek apakah sudah ada pesan panel yang tercatat di database & channel
    if (savedChannelId === channel.id && savedMsgId) {
      const existingMsg = await channel.messages.fetch(savedMsgId).catch(() => null);
      if (existingMsg) {
        // EDIT pesan yang sudah ada (TIDAK buat pesan baru)
        await existingMsg.edit(payload).catch(() => {});
        return interaction.reply({
          content: `✅ Panel Card Member di <#${channel.id}> berhasil diperbarui!`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // 2. Cari semua pesan panel lama milik bot di channel ini
    const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    let targetMsg = null;

    if (fetched) {
      const oldPanels = [...fetched.values()].filter(m =>
        m.author.id === client.user.id &&
        m.embeds.some(e => e.title && e.title.includes('Kartu Identitas Member Server'))
      );

      if (oldPanels.length > 0) {
        // Gunakan pesan panel pertama, hapus sisanya jika ada duplikat
        targetMsg = oldPanels[0];
        for (let i = 1; i < oldPanels.length; i++) {
          await oldPanels[i].delete().catch(() => {});
        }
      }
    }

    try {
      if (targetMsg) {
        // Edit pesan panel yang sudah ditemukan
        await targetMsg.edit(payload);
        settings[guildId].cardResultChannel = channel.id;
        settings[guildId].cardHubMessageId = targetMsg.id;
        storage.write('settings', settings);
      } else {
        // Buat 1 pesan panel baru jika benar-benar belum ada
        const sentMsg = await channel.send(payload);
        settings[guildId].cardResultChannel = channel.id;
        settings[guildId].cardHubMessageId = sentMsg.id;
        storage.write('settings', settings);
      }

      await interaction.reply({
        content: `✅ Channel <#${channel.id}> berhasil dikonfigurasi! Tepat 1 panel dipasang.`,
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
