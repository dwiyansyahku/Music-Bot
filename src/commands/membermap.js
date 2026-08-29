const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const {
  getMemberMapData,
  buildMemberMapEmbed,
  buildMemberMapComponents,
  createMemberMapPanelPayload
} = require('../utils/memberMapHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membermap')
    .setDescription('Peta sebaran daerah & kota asal member server')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Buka jendela peta member interaktif pribadimu (Privat / Ephemeral)')
    )
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Pasang Panel Publik Peta Member permanen di channel tertentu (Admin Only)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tempat panel akan dipasang')
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
      const payload = createMemberMapPanelPayload(guild);

      await targetChannel.send(payload);

      return interaction.reply({
        content: `✅ **Panel Peta Member Berhasil Dipasang di <#${targetChannel.id}>!**\nSemua member sekarang dapat mengklik tombol pada panel tersebut untuk membuka peta interaktif mereka sendiri.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === 2. SUBCOMMAND: VIEW (Default) ===
    const data = getMemberMapData(guild);
    const embed = buildMemberMapEmbed(guild, 0);
    const components = buildMemberMapComponents(0, data.totalPages, guild);

    return interaction.reply({
      embeds: [embed],
      components,
      flags: MessageFlags.Ephemeral
    });
  }
};
