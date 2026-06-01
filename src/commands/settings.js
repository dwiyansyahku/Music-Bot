const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

// VOLUME
const volume = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Atur volume musik (0-100)')
    .addIntegerOption(opt =>
      opt.setName('angka')
        .setDescription('Volume (0-100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const vol = interaction.options.getInteger('angka');
    await queue.setVolume(vol);
    const emoji = vol === 0 ? '🔇' : vol < 50 ? '🔉' : '🔊';
    await interaction.reply(`${emoji} **Volume diatur ke ${vol}%**`);
  },
};

// LOOP
const loop = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Atur mode repeat/loop')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Mode loop')
        .setRequired(true)
        .addChoices(
          { name: '🚫 Off (Tidak ada loop)', value: '0' },
          { name: '🔂 Song (Loop lagu ini)', value: '1' },
          { name: '🔁 Queue (Loop seluruh antrian)', value: '2' },
        )
    ),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const mode = parseInt(interaction.options.getString('mode'));
    await queue.setRepeatMode(mode);
    const labels = ['🚫 Loop **dimatikan**', '🔂 Loop **lagu ini** aktif', '🔁 Loop **seluruh antrian** aktif'];
    await interaction.reply(labels[mode]);
  },
};

// SHUFFLE
const shuffle = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Acak urutan antrian lagu'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    if (queue.songs.length < 3) {
      await interaction.reply('⚠️ Antrian terlalu sedikit untuk diacak!');
      return;
    }
    await queue.shuffle();
    await interaction.reply(`🔀 **Antrian diacak!** ${queue.songs.length} lagu telah diacak.`);
  },
};

// NOWPLAYING
const nowplaying = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Tampilkan info lagu yang sedang diputar'),
  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const { nowPlayingEmbed } = require('../utils/embeds');
    const embed = nowPlayingEmbed(queue.songs[0], queue);
    await interaction.reply({ embeds: [embed] });
  },
};

// SEEK
const seek = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Skip ke waktu tertentu dalam lagu')
    .addIntegerOption(opt =>
      opt.setName('detik')
        .setDescription('Waktu dalam detik (contoh: 90 = 1:30)')
        .setRequired(true)
        .setMinValue(0)
    ),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const seconds = interaction.options.getInteger('detik');
    if (queue.songs[0].isLive) {
      await interaction.reply('❌ Tidak bisa seek pada live stream!');
      return;
    }
    await queue.seek(seconds);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    await interaction.reply(`⏩ **Skipped ke ${m}:${String(s).padStart(2, '0')}**`);
  },
};

// REMOVE
const remove = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Hapus lagu dari antrian berdasarkan nomor')
    .addIntegerOption(opt =>
      opt.setName('nomor')
        .setDescription('Nomor lagu dalam antrian (lihat dengan /queue)')
        .setRequired(true)
        .setMinValue(1)
    ),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const pos = interaction.options.getInteger('nomor');
    if (pos >= queue.songs.length) {
      await interaction.reply(`❌ Nomor antrian tidak valid! Antrian hanya memiliki ${queue.songs.length - 1} lagu.`);
      return;
    }
    const removed = queue.songs[pos];
    queue.songs.splice(pos, 1);
    await interaction.reply(`🗑️ **Dihapus:** ${removed.name}`);
  },
};

// CLEAR QUEUE
const clearqueue = {
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Hapus semua lagu dalam antrian (lagu saat ini tetap diputar)'),
  async execute(interaction, client) {
    checkVoiceChannel(interaction);
    const queue = checkQueue(interaction, client);
    if (!queue) return;
    const count = queue.songs.length - 1;
    queue.songs.splice(1);
    await interaction.reply(`🗑️ **${count} lagu dihapus dari antrian!**`);
  },
};

module.exports = [volume, loop, shuffle, nowplaying, seek, remove, clearqueue];
