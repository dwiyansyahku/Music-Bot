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
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    await queue.stop();
    await interaction.reply('⏹️ **Musik dihentikan dan bot keluar dari voice channel.**');
  },
};

module.exports = [skip, pause, resume, stop];
