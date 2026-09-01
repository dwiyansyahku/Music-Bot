const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, cleanMusicQuery } = require('../utils/helpers');

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

    const rawQuery = interaction.options.getString('query');
    const query = cleanMusicQuery(rawQuery);
    await interaction.deferReply();

    try {
      const { getVoiceConnection } = require('@discordjs/voice');
      const ghostConn = getVoiceConnection(interaction.guild.id);
      if (ghostConn && !client.distube.voices.get(interaction.guild.id)) {
        console.log(`🧹 [Play Cleaner] Destroying unmanaged ghost voice connection di guild ${interaction.guild.id}...`);
        ghostConn.destroy();
        await new Promise(r => setTimeout(r, 400));
      }

      await client.distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
        interaction,
      });

      // Reply akan dikirim dari event playSong/addSong
      await interaction.editReply(`🔍 Mencari: **${query}**...`);
    } catch (error) {
      if (error.errorCode === 'VOICE_ALREADY_CREATED') {
        const { getVoiceConnection } = require('@discordjs/voice');
        const ghostConn = getVoiceConnection(interaction.guild.id);
        if (ghostConn) {
          ghostConn.destroy();
          await new Promise(r => setTimeout(r, 500));
        }
        try {
          await client.distube.play(voiceChannel, query, {
            member: interaction.member,
            textChannel: interaction.channel,
            interaction,
          });
          return interaction.editReply(`🔍 Mencari: **${query}**...`);
        } catch (retryErr) {
          console.error(retryErr);
          return interaction.editReply(`❌ Error: ${retryErr.message}`);
        }
      }
      console.error(error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};
