const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildMemberCardEmbed } = require('../utils/cardHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Tampilkan card profil member (Hanya terlihat oleh Anda)')
    .addUserOption(opt =>
      opt.setName('member')
        .setDescription('Member yang ingin dilihat profilnya (kosongkan = profil sendiri)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // Selalu respon ephemeral (hanya terlihat oleh user sendiri)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: '❌ Member tidak ditemukan di server ini.' });
    }

    try {
      const embed = await buildMemberCardEmbed(interaction.guild, member);
      await interaction.editReply({
        content: `🎴 **Kartu Profil ${member.displayName}:**`,
        embeds: [embed]
      });
    } catch (err) {
      console.error('[/card] Error:', err);
      await interaction.editReply({ content: `❌ Terjadi kesalahan: ${err.message}` });
    }
  }
};
