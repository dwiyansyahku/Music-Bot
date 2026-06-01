const { EmbedBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Check prefix 'q' or 'Q'
    if (!message.content.toLowerCase().startsWith('q')) return;

    // Parse command
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Map command names to internal commands
    switch (commandName) {
      case 'p':
      case 'play': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const query = args.join(' ');
        if (!query) {
          return message.reply('❌ Tuliskan judul lagu atau URL setelah command! Contoh: `qp never gonna give you up`');
        }

        let playQuery = query;
        if (!query.startsWith('http://') && !query.startsWith('https://') && !query.startsWith('spotify:') && !query.startsWith('soundcloud:')) {
          playQuery = `ytsearch1:${query}`;
        }

        const searchingMsg = await message.reply(`🔍 Mencari: **${query}**...`);
        try {
          await client.distube.play(voiceChannel, playQuery, {
            member: message.member,
            textChannel: message.channel,
            message,
          });
          // Delete searching message on success to prevent double responses since playSong/addSong will send embeds
          await searchingMsg.delete().catch(() => {});
        } catch (error) {
          console.error(error);
          await searchingMsg.edit(`❌ Error: ${error.message}`).catch(() => {});
        }
        break;
      }

      case 's':
      case 'skip': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        if (queue.songs.length <= 1) {
          return message.reply('⚠️ Tidak ada lagu selanjutnya! Gunakan `qstop` atau `qleave` untuk berhenti.');
        }

        try {
          await queue.skip();
          await message.reply('⏭️ **Lagu diskip!**');
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'stop':
      case 'leave': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = client.distube.getQueue(message.guild.id);
        if (queue) {
          try {
            await queue.stop();
            await message.reply('⏹️ **Musik dihentikan dan bot keluar dari voice channel.**');
          } catch (error) {
            console.error(error);
            await message.reply(`❌ Error: ${error.message}`);
          }
        } else {
          // If no queue, check if bot is in a voice channel in this guild
          const voice = client.distube.voices.get(message.guild.id);
          if (voice) {
            voice.leave();
            await message.reply('👋 **Bot keluar dari voice channel.**');
          } else {
            await message.reply('❌ Bot tidak ada di voice channel!');
          }
        }
        break;
      }

      case 'h':
      case 'help': {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x1DB954)
          .setTitle('🎵 Discord Music Bot — Bantuan & Informasi')
          .setDescription('Bot musik Discord menggunakan prefix teks **q** (tanpa slash `/`).')
          .addFields(
            {
              name: '📝 Deskripsi Bot',
              value: 'Bot musik premium yang mendukung pemutaran lagu dari YouTube, Spotify, SoundCloud, dan berbagai platform lainnya secara lancar dan berkualitas tinggi.'
            },
            {
              name: '👤 Pembuat (Author)',
              value: 'Dibuat dengan ❤️ menggunakan **discord.js** & **DisTube**.'
            },
            {
              name: '🎵 Daftar Perintah (Prefix: `q`)',
              value: [
                '**`qp [judul/url]`** — Putar lagu atau playlist',
                '**`qs` / `qskip`** — Skip ke lagu berikutnya',
                '**`qstop` / `qleave`** — Stop musik & bot keluar dari voice channel',
                '**`qpause`** — Pause lagu yang sedang diputar',
                '**`qresume`** — Lanjutkan lagu yang di-pause',
                '**`qq` / `qqueue` [halaman]** — Lihat antrian lagu',
                '**`qnp` / `qnowplaying`** — Info lagu yang sedang diputar',
                '**`qvol [0-100]`** — Atur volume musik',
                '**`qloop [off/song/queue]`** — Atur mode loop',
                '**`qautoplay` / `qap`** — Aktifkan/matikan autoplay lagu otomatis',
                '**`qshuffle`** — Acak antrian lagu',
                '**`qremove [nomor]`** — Hapus lagu dari antrian',
                '**`qclear`** — Hapus semua antrian lagu'
              ].join('\n')
            }
          )
          .setFooter({ text: 'Gunakan command dengan menulis langsung di chat server!' })
          .setTimestamp();

        await message.reply({ embeds: [helpEmbed] });
        break;
      }

      case 'pause': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        if (queue.paused) {
          return message.reply('⚠️ Lagu sudah dalam keadaan pause! Gunakan `qresume`.');
        }

        try {
          await queue.pause();
          await message.reply('⏸️ **Lagu di-pause.**');
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'resume': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        if (!queue.paused) {
          return message.reply('⚠️ Lagu tidak dalam keadaan pause!');
        }

        try {
          await queue.resume();
          await message.reply('▶️ **Lagu dilanjutkan!**');
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'q':
      case 'queue': {
        const queue = checkQueue(message, client);
        if (!queue) return;

        const page = parseInt(args[0]) || 1;
        const { queueEmbed } = require('../utils/embeds');
        const embed = queueEmbed(queue, page);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'np':
      case 'nowplaying': {
        const queue = checkQueue(message, client);
        if (!queue) return;

        const { nowPlayingEmbed } = require('../utils/embeds');
        const embed = nowPlayingEmbed(queue.songs[0], queue);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'vol':
      case 'volume': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 100) {
          return message.reply('⚠️ Tentukan volume antara 0 hingga 100! Contoh: `qvol 50`');
        }

        try {
          await queue.setVolume(vol);
          const emoji = vol === 0 ? '🔇' : vol < 50 ? '🔉' : '🔊';
          await message.reply(`${emoji} **Volume diatur ke ${vol}%**`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'loop':
      case 'repeat': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        const loopArg = args[0]?.toLowerCase();
        let mode;
        if (loopArg === 'off' || loopArg === '0') mode = 0;
        else if (loopArg === 'song' || loopArg === '1') mode = 1;
        else if (loopArg === 'queue' || loopArg === '2') mode = 2;
        else {
          return message.reply('⚠️ Mode loop tidak valid! Gunakan: `qloop off`, `qloop song`, atau `qloop queue`.');
        }

        try {
          await queue.setRepeatMode(mode);
          const labels = ['🚫 Loop **dimatikan**', '🔂 Loop **lagu ini** aktif', '🔁 Loop **seluruh antrian** aktif'];
          await message.reply(labels[mode]);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'ap':
      case 'autoplay': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        try {
          queue.autoplay = !queue.autoplay;
          const status = queue.autoplay ? '✅ **Autoplay diaktifkan!** Bot akan otomatis mencari dan memutar lagu rekomendasi setelah antrean selesai.' : '🚫 **Autoplay dimatikan.**';
          await message.reply(status);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'shuffle': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        if (queue.songs.length < 3) {
          return message.reply('⚠️ Antrian terlalu sedikit untuk diacak!');
        }

        try {
          await queue.shuffle();
          await message.reply(`🔀 **Antrian diacak!** ${queue.songs.length} lagu telah diacak.`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'remove': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        const pos = parseInt(args[0]);
        if (isNaN(pos) || pos < 1 || pos >= queue.songs.length) {
          return message.reply(`❌ Nomor antrian tidak valid! Pilih nomor antrian antara 1 hingga ${queue.songs.length - 1}.`);
        }

        try {
          const removed = queue.songs[pos];
          queue.songs.splice(pos, 1);
          await message.reply(`🗑️ **Dihapus:** ${removed.name}`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'clear':
      case 'clearqueue': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        try {
          const count = queue.songs.length - 1;
          queue.songs.splice(1);
          await message.reply(`🗑️ **${count} lagu dihapus dari antrian!**`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'seek': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0) {
          return message.reply('⚠️ Tentukan detik yang valid! Contoh: `qseek 90` (1:30)');
        }

        if (queue.songs[0].isLive) {
          return message.reply('❌ Tidak bisa seek pada live stream!');
        }

        try {
          await queue.seek(seconds);
          const m = Math.floor(seconds / 60);
          const s = seconds % 60;
          await message.reply(`⏩ **Skipped ke ${m}:${String(s).padStart(2, '0')}**`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      default:
        // Do nothing for unknown commands to prevent replying to random text starting with 'q'
        break;
    }
  },
};
