const { SlashCommandBuilder } = require('discord.js');
const { isBotOwner, replyNoAccess } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Keluarkan bot dari voice channel (Khusus Owner Bot)'),

  async execute(interaction, client) {
    const isOwner = await isBotOwner(interaction, client);
    if (!isOwner) {
      return replyNoAccess(interaction);
    }

    const voiceChannel = interaction.guild.members.me?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Bot tidak ada di voice channel!', ephemeral: true });
    }

    // Disable 24/7 mode jika aktif
    client.stay247?.delete(interaction.guild.id);

    // Stop queue jika ada
    const queue = client.distube.getQueue(interaction.guild.id);
    if (queue) {
      queue._stoppedByCmd = true;
      await queue.stop().catch(() => {});
    }

    // Leave voice channel
    const voice = client.distube.voices.get(interaction.guild.id);
    if (voice) {
      voice.leave();
    } else {
      // Fallback: force disconnect
      const { getVoiceConnection } = require('@discordjs/voice');
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        connection.destroy();
      } else {
        interaction.guild.members.me.voice.disconnect().catch(() => {});
      }
    }

    await interaction.reply('👋 **Bot keluar dari voice channel.**');
  },
};
