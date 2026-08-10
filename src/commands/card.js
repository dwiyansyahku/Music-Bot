const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildCardAttachment, buildMemberCardEmbed } = require('../utils/cardHandler');

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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: '❌ Member tidak ditemukan di server ini.' });
    }

    // Try canvas card, fallback to embed
    try {
      const attachment = await buildCardAttachment(interaction.guild, member);
      await interaction.editReply({
        content: `🎴 **${member.displayName}:**`,
        files: [attachment]
      });
    } catch (err) {
      console.warn('[/card] Canvas failed, using embed:', err.message);
      try {
        const embed = await buildMemberCardEmbed(interaction.guild, member);
        await interaction.editReply({
          content: `🎴 **${member.displayName}:**`,
          embeds: [embed]
        });
      } catch (embedErr) {
        console.error('[/card] Error:', embedErr);
        await interaction.editReply({ content: `❌ Gagal membuat card: ${embedErr.message}` });
      }
    }
  }
};
