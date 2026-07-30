const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcard')
    .setDescription('Atur channel hasil penampilan /card (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Text channel untuk menampilkan hasil card member')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased() || channel.isThread()) {
      return interaction.reply({
        content: 'Pilih text channel biasa (bukan thread/forum).',
        ephemeral: true
      });
    }

    const botPerms = channel.permissionsFor(interaction.guild.members.me);
    if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
      return interaction.reply({
        content: `Bot tidak memiliki izin Send Messages / Embed Links di <#${channel.id}>.`,
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const settings = storage.read('settings');
    if (!settings[guildId]) settings[guildId] = {};
    settings[guildId].cardResultChannel = channel.id;
    storage.write('settings', settings);

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Channel Card Berhasil Diatur')
      .setDescription(`Hasil perintah \`/card\` member selanjutnya akan dikirim ke <#${channel.id}>.`)
      .setFooter({ text: `Diatur oleh ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
