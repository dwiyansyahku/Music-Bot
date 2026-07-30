const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { generateMemberCardCanvas } = require('../utils/cardGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Tampilkan card profil member HD (Hanya terlihat oleh Anda)')
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
      const cardsData = storage.read('cards');
      const userCard = cardsData[interaction.guild.id]?.[member.id] || {};

      const imageBuffer = await generateMemberCardCanvas(interaction.guild, member, userCard);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'member-card.jpg' });

      await interaction.editReply({
        content: `🎴 **Kartu Profil ${member.displayName}:**`,
        files: [attachment]
      });
    } catch (err) {
      console.error('[/card] Error:', err);
      await interaction.editReply({ content: `❌ Terjadi kesalahan: ${err.message}` });
    }
  }
};
