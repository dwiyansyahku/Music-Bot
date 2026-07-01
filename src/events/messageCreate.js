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

        const searchingMsg = await message.reply(`🔍 Mencari: **${query}**...`);

        const MAX_RETRIES = 2;  // Total percobaan: 1 + 2 retry = 3x
        let lastError = null;
        let success = false;

        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
          try {
            await client.distube.play(voiceChannel, query, {
              member: message.member,
              textChannel: message.channel,
              message,
            });
            // Berhasil — hapus pesan "mencari..."
            await searchingMsg.delete().catch(() => {});
            success = true;
            break;
          } catch (error) {
            lastError = error;
            const isVoiceFail = error.errorCode === 'VOICE_CONNECT_FAILED' ||
                                error.message?.includes('Cannot connect to the voice channel');

            // Bersihkan queue yang terbentuk sebagian
            client.distube.getQueue(message.guild.id)?.stop().catch(() => {});

            if (isVoiceFail && attempt <= MAX_RETRIES) {
              // Masih ada retry tersisa — informasikan user lalu tunggu
              console.warn(`⚠️ [Voice] VOICE_CONNECT_FAILED (attempt ${attempt}/${MAX_RETRIES + 1}), retrying in 3s...`);
              await searchingMsg.edit(`⏳ Koneksi voice gagal, mencoba lagi (${attempt}/${MAX_RETRIES})...`).catch(() => {});
              await new Promise(r => setTimeout(r, 3000));
            } else {
              // Semua retry habis atau bukan voice error
              console.error(error);
              break;
            }
          }
        }

        if (!success) {
          const isVoiceFail = lastError?.errorCode === 'VOICE_CONNECT_FAILED' ||
                              lastError?.message?.includes('Cannot connect to the voice channel');
          const errMsg = isVoiceFail
            ? `❌ Gagal terhubung ke voice channel setelah ${MAX_RETRIES + 1}x percobaan.\n💡 Coba ubah **Region Override** voice channel ke **Singapore** di Discord (Settings → Edit Channel → Region Override).`
            : `❌ Error: ${lastError?.message?.slice(0, 1500)}`;
          await searchingMsg.edit(errMsg).catch((err) => {
            console.error('Failed to edit search message with error info:', err);
          });
        }

        break;
      }


      case 's':
      case 'skip': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = checkQueue(message, client);
        if (!queue) return;

        if (queue.songs.length <= 1 && !queue.autoplay) {
          return message.reply('⚠️ Tidak ada lagu selanjutnya! Gunakan `qstop` atau aktifkan `qautoplay` agar bot otomatis cari lagu.');
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

      case 'j':
      case 'join': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const MAX_JOIN_RETRIES = 2;
        let joinMsg = await message.reply('⏳ Mencoba bergabung ke voice channel...');
        let joined = false;

        for (let attempt = 1; attempt <= MAX_JOIN_RETRIES + 1; attempt++) {
          try {
            await client.distube.voices.join(voiceChannel);
            await joinMsg.edit(`✅ **Bot telah bergabung ke <#${voiceChannel.id}>!**`);
            joined = true;
            break;
          } catch (error) {
            const isVoiceFail = error.errorCode === 'VOICE_CONNECT_FAILED' ||
                                error.message?.includes('Cannot connect to the voice channel');
            if (isVoiceFail && attempt <= MAX_JOIN_RETRIES) {
              console.warn(`⚠️ [Join] VOICE_CONNECT_FAILED (attempt ${attempt}/${MAX_JOIN_RETRIES + 1}), retrying...`);
              await joinMsg.edit(`⏳ Koneksi gagal, mencoba lagi (${attempt}/${MAX_JOIN_RETRIES})...`).catch(() => {});
              await new Promise(r => setTimeout(r, 3000));
            } else {
              console.error('Error joining voice channel:', error);
              await joinMsg.edit(`❌ Gagal bergabung ke voice channel setelah ${attempt}x percobaan: ${error.message}`).catch(() => {});
              break;
            }
          }
        }
        break;
      }

      case 'stop':
      case 'leave': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        // Guard: pastikan hanya 1 reply yang terkirim
        let hasReplied = false;
        const safeReply = async (msg) => {
          if (hasReplied) return;
          hasReplied = true;
          await message.reply(msg).catch(() => {});
        };

        client.stay247?.delete(message.guild.id);

        const queue = client.distube.getQueue(message.guild.id);

        if (queue) {
          try {
            await queue.stop();
            // DisTube otomatis leave setelah stop, tapi kita paksa juga untuk safety
            const disTubeVoice = client.distube.voices.get(message.guild.id);
            if (disTubeVoice) disTubeVoice.leave();
            await safeReply('⏹️ **Musik dihentikan dan bot keluar dari voice channel.**');
          } catch (error) {
            console.error(error);
            await safeReply(`❌ Error: ${error.message}`);
          }
        } else {
          // Tidak ada queue — coba keluar via DisTube voices
          const disTubeVoice = client.distube.voices.get(message.guild.id);
          if (disTubeVoice) {
            disTubeVoice.leave();
            await safeReply('👋 **Bot keluar dari voice channel.**');
          } else {
            // Fallback: gunakan @discordjs/voice langsung
            const { getVoiceConnection } = require('@discordjs/voice');
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
              connection.destroy();
              await safeReply('👋 **Bot keluar dari voice channel.**');
            } else if (message.guild.members.me?.voice?.channel) {
              await message.guild.members.me.voice.disconnect().catch(() => {});
              await safeReply('👋 **Bot keluar dari voice channel.**');
            } else {
              await safeReply('❌ Bot tidak ada di voice channel!');
            }
          }
        }
        break;
      }

      case 'ping': {
        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong!\nLatency: **${latency}ms**\nAPI Latency: **${Math.round(client.ws.ping)}ms**`);
        break;
      }

      case 'h':
      case 'help': {
        const helpEmbed = new EmbedBuilder()
          .setColor(0x1DB954)
          .setTitle('🎵 Discord Music Bot — Bantuan & Informasi')
          .setDescription('Bot musik Discord yang berjalan menggunakan prefix teks **q** (tanpa slash `/`).')
          .addFields(
            {
              name: '🎵 Perintah Utama',
              value: [
                '`qp [judul/url]` — Putar lagu atau playlist',
                '`qj` / `qjoin` — Panggil bot ke voice channel',
                '`qnp` / `nowplaying` — Info lagu yang sedang diputar',
                '`qq` / `queue [hal]` — Lihat antrian lagu',
              ].join('\n')
            },
            {
              name: '⏯️ Kontrol Pemutaran',
              value: [
                '`qpause` — Pause lagu',
                '`qresume` — Lanjutkan lagu',
                '`qs` / `qskip` — Skip ke lagu berikutnya',
                '`qstop` / `qleave` — Stop musik & bot keluar dari voice channel',
                '`qap` / `qautoplay` — Aktifkan/matikan fitur lagu otomatis',
              ].join('\n')
            },
            {
              name: '🎛️ Pengaturan & Lainnya',
              value: [
                '`qvol [0-100]` — Atur volume musik',
                '`qloop [off/song/queue]` — Atur mode loop',
                '`qshuffle` — Acak urutan antrian',
                '`qremove [nomor]` — Hapus lagu dari antrian',
                '`qclear` — Hapus semua daftar antrian',
                '`qping` — Cek status & latency bot',
                '`qhelp` — Tampilkan menu ini',
              ].join('\n')
            }
          )
          .setFooter({ text: 'Created by Dwiyansyah Oktavyudi | Discord Music Bot' })
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
        
        if (!loopArg) {
          // If no argument is provided, cycle through modes: 0 (Off) -> 1 (Song) -> 2 (Queue) -> 0 (Off)
          mode = queue.repeatMode === 0 ? 1 : queue.repeatMode === 1 ? 2 : 0;
        } else if (loopArg === 'off' || loopArg === '0') {
          mode = 0;
        } else if (loopArg === 'song' || loopArg === '1') {
          mode = 1;
        } else if (loopArg === 'queue' || loopArg === '2') {
          mode = 2;
        } else {
          return message.reply('⚠️ Mode loop tidak valid! Gunakan: `qloop off`, `qloop song`, `qloop queue`, atau ketik `qloop` saja untuk mengganti mode.');
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
        if (!client.autoplaySettings) {
          client.autoplaySettings = new Map();
        }

        const guildId = message.guild.id;
        const queue = client.distube.getQueue(guildId);

        // Jika antrean sedang aktif, pastikan pengguna berada di voice channel yang sama
        if (queue) {
          if (!checkVoiceChannel(message)) return;
        }

        try {
          let isOn;
          if (queue) {
            queue.autoplay = !queue.autoplay;
            isOn = queue.autoplay;
            client.autoplaySettings.set(guildId, isOn);
          } else {
            const current = client.autoplaySettings.get(guildId) || false;
            isOn = !current;
            client.autoplaySettings.set(guildId, isOn);
          }

          const status = isOn 
            ? '✅ **Autoplay diaktifkan!** Bot akan otomatis mencari dan memutar lagu rekomendasi setelah antrean selesai.' 
            : '🚫 **Autoplay dimatikan.**';
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
