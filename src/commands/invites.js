const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInviterStats } = require('../utils/inviteTracker');

const invitesCommand = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Cek jumlah orang yang telah kamu atau member lain undang ke server')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('Member yang ingin dilihat jumlah undangannya')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;
    const stats = getInviterStats(guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: 'STATISTIK UNDANGAN MEMBER',
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`${targetUser.username}`)
      .setDescription(
        `Berikut adalah pencapaian tautan undangan <@${targetUser.id}> di server **${guild.name}**:`
      )
      .addFields(
        {
          name: 'Total Net Invites',
          value: `**${stats.total}** invite`,
          inline: true
        },
        {
          name: 'Bergabung Valid',
          value: `**${stats.regular}** member`,
          inline: true
        },
        {
          name: 'Telah Keluar',
          value: `**${stats.leaves}** member`,
          inline: true
        },
        {
          name: 'Akun Baru / Suspek',
          value: `**${stats.fake}** akun`,
          inline: true
        },
        {
          name: 'Bonus Invites',
          value: `**${stats.bonus}** invite`,
          inline: true
        }
      )
      .setFooter({
        text: `${guild.name} • Invite Tracker`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

module.exports = invitesCommand;
