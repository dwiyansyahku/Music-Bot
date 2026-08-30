const {
  SlashCommandBuilder, ChannelType, MessageFlags,
  ActionRowBuilder, StringSelectMenuBuilder,
} = require('discord.js');
const { buildHelpEmbed, createHelpGuidePanelPayload } = require('../events/helpEmbeds');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');

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

      await targetChannel.send(payload);

      return interaction.reply({
        content: `✅ **Panel Direktori Panduan Bot Berhasil Dipasang di <#${targetChannel.id}>!**\nSemua member sekarang dapat memilih fitur pada menu dropdown panel tersebut untuk membaca penjelasan & tutorial lengkap secara mandiri.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === 2. SUBCOMMAND: VIEW (Default) ===
    const payload = createHelpGuidePanelPayload(guild);

    return interaction.reply({
      embeds: payload.embeds,
      components: payload.components,
      flags: MessageFlags.Ephemeral
    });
  },
};
