const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Memerintahkan bot untuk bergabung ke voice channel Anda'),

  async execute(interaction, client) {
    const voiceChannel = checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    try {
      await client.distube.voices.join(voiceChannel);
      await interaction.reply(`✅ **Bot telah bergabung ke <#${voiceChannel.id}>!**`);
    } catch (error) {
      console.error('Error joining voice channel:', error);
      await interaction.reply({ content: `❌ Gagal bergabung ke voice channel: ${error.message}`, ephemeral: true });
    }
  },
};
