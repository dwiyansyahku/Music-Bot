const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Putar lagu dari YouTube, Spotify, SoundCloud, atau URL langsung')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Nama lagu, URL YouTube, Spotify, SoundCloud, dll')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const voiceChannel = checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      await client.distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
        interaction,
      });

      // Reply akan dikirim dari event playSong/addSong
      await interaction.editReply(`🔍 Mencari: **${query}**...`);
    } catch (error) {
      console.error(error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};
