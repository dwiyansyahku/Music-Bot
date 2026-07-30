const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

// SKIP
const skip = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip lagu yang sedang diputar'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    if (queue.songs.length <= 1 && !queue.autoplay) {
      await interaction.reply('⚠️ Tidak ada lagu selanjutnya! Gunakan `/stop` untuk berhenti, atau aktifkan `/autoplay` agar bot otomatis cari lagu.');
      return;
    }
    await queue.skip();
    await interaction.reply('⏭️ **Lagu diskip!**');
  },
};

// PAUSE
const pause = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause lagu yang sedang diputar'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    if (queue.paused) {
      await interaction.reply('⚠️ Lagu sudah dalam keadaan pause! Gunakan `/resume`.');
      return;
    }
    await queue.pause();
    await interaction.reply('⏸️ **Lagu di-pause.**');
  },
};

// RESUME
const resume = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Lanjutkan lagu yang di-pause'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    if (!queue.paused) {
      await interaction.reply('⚠️ Lagu tidak dalam keadaan pause!');
      return;
    }
    await queue.resume();
    await interaction.reply('▶️ **Lagu dilanjutkan!**');
  },
};

// STOP
const stop = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop musik dan keluarkan bot dari voice channel'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = client.distube.getQueue(interaction.guild.id);
    client.stay247?.delete(interaction.guild.id); // Disable 24/7 mode if user explicitly asks to stop/leave

    if (queue) {
      queue._stoppedByCmd = true;
      await queue.stop();
      if (queue.voice) queue.voice.leave();
      await interaction.reply('⏹️ **Musik dihentikan dan bot keluar dari voice channel.**');
    } else {
      const voice = client.distube.voices.get(interaction.guild.id);
      if (voice) {
        voice.leave();
        await interaction.reply('👋 **Bot keluar dari voice channel.**');
      } else {
        const botVoiceChannel = interaction.guild.members.me?.voice?.channel;
        if (botVoiceChannel) {
          const { getVoiceConnection } = require('@discordjs/voice');
          const connection = getVoiceConnection(interaction.guild.id);
          if (connection) {
            connection.destroy();
          } else {
            interaction.guild.members.me.voice.disconnect();
          }
          await interaction.reply('👋 **Bot dipaksa keluar dari voice channel.**');
        } else {
          await interaction.reply('❌ Bot tidak ada di voice channel!');
        }
      }
    }
  },
};

module.exports = [skip, pause, resume, stop];
