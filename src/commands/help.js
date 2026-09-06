const {
  SlashCommandBuilder, ChannelType, MessageFlags,
  EmbedBuilder,
} = require('discord.js');
const { buildHelpEmbed, createHelpGuidePanelPayload } = require('../events/helpEmbeds');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Pusat panduan, direktori fitur, dan daftar perintah bot')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Buka menu panduan & daftar perintah bot (Privat / Ephemeral)')
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Pasang Panel Direktori Panduan Lengkap di channel tertentu (Staff/Admin Only)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tempat panel panduan akan dipasang')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('refresh')
        .setDescription('Perbarui otomatis isi pesan panel panduan yang terpasang di server (Staff Only)')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand(false) || 'view';
    const guild = interaction.guild;

    // === 1. SUBCOMMAND: PANEL (Admin Only) ===
    if (sub === 'panel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return replyNoAccessMod(interaction);
      }

      const targetChannel = interaction.options.getChannel('channel');
      const payload = createHelpGuidePanelPayload(guild);
      const settings = storage.read('settings');
      if (!settings[guild.id]) settings[guild.id] = {};

      let panelMsg = null;
      // Jika sebelumnya sudah pernah ada panel di channel yang sama, coba edit
      if (settings[guild.id].helpPanelChannelId === targetChannel.id && settings[guild.id].helpPanelMessageId) {
        try {
          const oldMsg = await targetChannel.messages.fetch(settings[guild.id].helpPanelMessageId).catch(() => null);
          if (oldMsg) {
            await oldMsg.edit(payload);
            panelMsg = oldMsg;
          }
        } catch (_) {}
      }

      if (!panelMsg) {
        panelMsg = await targetChannel.send(payload);
      }

      settings[guild.id].helpPanelChannelId = targetChannel.id;
      settings[guild.id].helpPanelMessageId = panelMsg.id;
      storage.write('settings', settings);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('Direktori Panduan Berhasil Dipasang')
            .setDescription(
              `Panel direktori panduan bot aktif di <#${targetChannel.id}>.\n` +
              `Pesan ini akan **otomatis tersinkronisasi dan ter-update** setiap kali ada pembaruan fitur bot.`
            )
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // === 2. SUBCOMMAND: REFRESH (Admin Only) ===
    if (sub === 'refresh') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return replyNoAccessMod(interaction);
      }

      const settings = storage.read('settings');
      const guildSettings = settings[guild.id];
      if (!guildSettings?.helpPanelChannelId || !guildSettings?.helpPanelMessageId) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('Panel Belum Terdaftar')
              .setDescription('Gunakan `/help panel channel:#channel` terlebih dahulu untuk mendaftarkan channel panduan.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = await guild.channels.fetch(guildSettings.helpPanelChannelId).catch(() => null);
      if (!channel) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('Channel Tidak Ditemukan')
              .setDescription('Channel panduan sebelumnya sudah tidak ada. Silakan pasang ulang dengan `/help panel`.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const msg = await channel.messages.fetch(guildSettings.helpPanelMessageId).catch(() => null);
      if (!msg) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('Pesan Panel Tidak Ditemukan')
              .setDescription('Pesan panel panduan sebelumnya telah dihapus. Silakan pasang ulang dengan `/help panel`.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const payload = createHelpGuidePanelPayload(guild);
      await msg.edit(payload);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('Direktori Panduan Diperbarui')
            .setDescription(`Pesan panel di <#${channel.id}> berhasil diperbarui ke versi terbaru.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // === 3. SUBCOMMAND: VIEW (Default) ===
    const payload = createHelpGuidePanelPayload(guild);

    return interaction.reply({
      embeds: payload.embeds,
      components: payload.components,
      flags: MessageFlags.Ephemeral
    });
  },
};
