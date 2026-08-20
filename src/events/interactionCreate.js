const { MessageFlags, EmbedBuilder } = require('discord.js');
const { handleCardButton, handleCardModalSubmit } = require('../utils/cardHandler');
const { createMusicControlRows } = require('../utils/musicButtons');
const { nowPlayingEmbed, queueEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Helper untuk menangani error respons secara aman (termasuk jika sudah deferred)
    async function safeErrorReply(err, customMessage = 'Terjadi kesalahan pada sistem.') {
      if (err.code === 10062 || err.code === 40060) return;
      console.error('[InteractionError]', err);

      const errContent = `❌ ${customMessage} (${err.message || 'Unknown error'})`;

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: errContent, embeds: [], files: [] }).catch(async () => {
            await interaction.followUp({ content: errContent, flags: MessageFlags.Ephemeral }).catch(() => {});
          });
        } else {
          await interaction.reply({ content: errContent, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      } catch (_) {}
    }

    // ====== Slash Commands ======
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        await safeErrorReply(error, `Error pada command /${interaction.commandName}`);
      }
      return;
    }

    // ====== Button Interaction (Music Control Buttons) ======
    if (interaction.isButton() && interaction.customId.startsWith('music_btn_')) {
      const guildId = interaction.guild?.id;
      if (!guildId) return;

      // Cek apakah user ada di voice channel yang sama
      const userVoice = interaction.member?.voice?.channel;
      const botVoice = interaction.guild.members.me?.voice?.channel;

      if (!userVoice) {
        return interaction.reply({
          content: '❌ Kamu harus berada di Voice Channel untuk menggunakan kontrol ini!',
          flags: MessageFlags.Ephemeral
        });
      }

      if (botVoice && botVoice.id !== userVoice.id) {
        return interaction.reply({
          content: `❌ Kamu harus berada di Voice Channel yang sama (<#${botVoice.id}>)!`,
          flags: MessageFlags.Ephemeral
        });
      }

      const queue = client.distube.getQueue(guildId);
      if (!queue) {
        return interaction.reply({
          content: '❌ Tidak ada musik yang sedang diputar.',
          flags: MessageFlags.Ephemeral
        });
      }

      const action = interaction.customId.replace('music_btn_', '');

      try {
        switch (action) {
          case 'prev': {
            if (!queue.previousSongs || queue.previousSongs.length === 0) {
              return interaction.reply({ content: '❌ Tidak ada lagu sebelumnya!', flags: MessageFlags.Ephemeral });
            }
            await queue.previous();
            return interaction.reply({ content: '⏮️ **Memutar lagu sebelumnya.**', flags: MessageFlags.Ephemeral });
          }

          case 'pause': {
            if (queue.paused) {
              await queue.resume();
              const rows = createMusicControlRows(queue);
              const embed = nowPlayingEmbed(queue.songs[0], queue);
              await interaction.update({ embeds: [embed], components: rows }).catch(() => {});
              return interaction.followUp({ content: '▶️ **Musik dilanjutkan.**', flags: MessageFlags.Ephemeral }).catch(() => {});
            } else {
              await queue.pause();
              const rows = createMusicControlRows(queue);
              const embed = nowPlayingEmbed(queue.songs[0], queue);
              await interaction.update({ embeds: [embed], components: rows }).catch(() => {});
              return interaction.followUp({ content: '⏸️ **Musik di-pause.**', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
          }

          case 'skip': {
            if (queue.songs.length <= 1 && !queue.autoplay) {
              return interaction.reply({ content: '⚠️ Tidak ada lagu selanjutnya dalam antrian!', flags: MessageFlags.Ephemeral });
            }
            await queue.skip();
            return interaction.reply({ content: '⏭️ **Lagu diskip!**', flags: MessageFlags.Ephemeral });
          }

          case 'stop': {
            queue._stoppedByCmd = true;
            await queue.stop().catch(() => {});
            return interaction.reply({ content: '⏹️ **Musik dihentikan dan antrian dibersihkan.**', flags: MessageFlags.Ephemeral });
          }

          case 'shuffle': {
            if (queue.songs.length <= 2) {
              return interaction.reply({ content: '❌ Antrian terlalu sedikit untuk diacak!', flags: MessageFlags.Ephemeral });
            }
            await queue.shuffle();
            return interaction.reply({ content: '🔀 **Antrian diacak!**', flags: MessageFlags.Ephemeral });
          }

          case 'loop': {
            // Cycle: 0 (Off) -> 1 (Song) -> 2 (Queue) -> 0 (Off)
            const nextMode = queue.repeatMode === 0 ? 1 : queue.repeatMode === 1 ? 2 : 0;
            queue.setRepeatMode(nextMode);
            const rows = createMusicControlRows(queue);
            const embed = nowPlayingEmbed(queue.songs[0], queue);
            await interaction.update({ embeds: [embed], components: rows }).catch(() => {});
            const modeNames = ['Off', 'Lagu (Single)', 'Seluruh Antrian (Queue)'];
            return interaction.followUp({ content: `🔁 Mode Loop diubah ke: **${modeNames[nextMode]}**`, flags: MessageFlags.Ephemeral }).catch(() => {});
          }

          case 'autoplay': {
            queue.autoplay = !queue.autoplay;
            if (client.autoplaySettings) {
              client.autoplaySettings.set(guildId, queue.autoplay);
            }
            const rows = createMusicControlRows(queue);
            const embed = nowPlayingEmbed(queue.songs[0], queue);
            await interaction.update({ embeds: [embed], components: rows }).catch(() => {});
            return interaction.followUp({
              content: queue.autoplay ? '🔄 **Autoplay diaktifkan!** Bot otomatis cari lagu serupa saat antrian habis.' : '🚫 **Autoplay dimatikan.**',
              flags: MessageFlags.Ephemeral
            }).catch(() => {});
          }

          case 'lyrics': {
            const currentSong = queue.songs[0];
            if (!currentSong) {
              return interaction.reply({ content: '❌ Tidak ada lagu yang sedang diputar saat ini.', flags: MessageFlags.Ephemeral });
            }

            // Bersihkan judul lagu dari teks berlebih YouTube
            const cleanTitle = currentSong.name
              .replace(/\(Official.*?\)/gi, '')
              .replace(/\[Official.*?\]/gi, '')
              .replace(/\(Music Video\)/gi, '')
              .replace(/\[Music Video\]/gi, '')
              .replace(/\(Audio\)/gi, '')
              .replace(/\[Audio\]/gi, '')
              .replace(/\(Lyric.*?\)/gi, '')
              .replace(/\[Lyric.*?\]/gi, '')
              .replace(/\(Visualizer\)/gi, '')
              .replace(/\|.*$/g, '')
              .trim();

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
              const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`, {
                headers: { 'User-Agent': 'QumpruyDiscordBot/1.0 (https://github.com/dwiyansyahku/Music-Bot)' }
              });

              if (!res.ok) throw new Error(`Status ${res.status}`);

              const results = await res.json();
              if (!Array.isArray(results) || results.length === 0) {
                return interaction.editReply(`❌ Lirik tidak ditemukan untuk lagu: **${currentSong.name}**`);
              }

              const bestMatch = results.find(r => r.plainLyrics || r.syncedLyrics) || results[0];
              let lyricsText = bestMatch.plainLyrics;

              if (!lyricsText && bestMatch.syncedLyrics) {
                lyricsText = bestMatch.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
              }

              if (!lyricsText) {
                return interaction.editReply(`❌ Lirik tidak tersedia untuk lagu: **${bestMatch.trackName}** oleh **${bestMatch.artistName}**`);
              }

              if (lyricsText.length > 4000) {
                lyricsText = lyricsText.substring(0, 3950) + '\n\n*... [Lirik dipotong karena terlalu panjang]*';
              }

              const lEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle(`📝 ${bestMatch.trackName}`)
                .setAuthor({ name: bestMatch.artistName || currentSong.uploader?.name || 'Artist' })
                .setDescription(lyricsText)
                .setFooter({ text: `Lirik untuk lagu yang sedang diputar • Sumber: LRCLIB` })
                .setTimestamp();

              if (currentSong.thumbnail) {
                lEmbed.setThumbnail(currentSong.thumbnail);
              }

              return interaction.editReply({ embeds: [lEmbed] });
            } catch (lyErr) {
              return interaction.editReply(`❌ Gagal mengambil lirik lagu: ${lyErr.message}`);
            }
          }

          case 'queue': {
            const qEmbed = queueEmbed(queue, 1);
            return interaction.reply({ embeds: [qEmbed], flags: MessageFlags.Ephemeral });
          }

          default:
            return;
        }
      } catch (btnErr) {
        return safeErrorReply(btnErr, 'Gagal menjalankan aksi musik.');
      }
    }

    // ====== Button Interaction (Sistem Panel Card Member) ======
    if (interaction.isButton() && interaction.customId.startsWith('card_btn_')) {
      try {
        await handleCardButton(interaction, client);
      } catch (err) {
        await safeErrorReply(err, 'Gagal memproses tombol Card Member.');
      }
      return;
    }

    // ====== Modal Submit Interaction (Pop-up Form Card Member) ======
    if (interaction.isModalSubmit() && interaction.customId === 'card_modal_submit') {
      try {
        await handleCardModalSubmit(interaction, client);
      } catch (err) {
        await safeErrorReply(err, 'Gagal memproses form Card Member.');
      }
      return;
    }

    // ====== Select Menu (Search Song Selection) ======
    if (interaction.isStringSelectMenu() && interaction.customId === 'search_select') {
      const searchData = client._searchResults?.get(interaction.user.id);
      if (!searchData) {
        return interaction.reply({
          content: '❌ Sesi pencarian ini sudah kadaluarsa. Silakan lakukan `/search` lagi.',
          flags: MessageFlags.Ephemeral
        });
      }

      const selectedIdx = parseInt(interaction.values[0], 10);
      const chosenSong = searchData.results[selectedIdx];
      if (!chosenSong) {
        return interaction.reply({ content: '❌ Lagu tidak valid.', flags: MessageFlags.Ephemeral });
      }

      clearTimeout(searchData.timeout);
      client._searchResults.delete(interaction.user.id);

      await interaction.update({
        content: `🔍 Memutar pilihan: **${chosenSong.name}**...`,
        embeds: [],
        components: []
      });

      try {
        await client.distube.play(searchData.voiceChannel, chosenSong.url || chosenSong, {
          member: searchData.member,
          textChannel: searchData.textChannel,
        });
      } catch (playErr) {
        console.error('[Search Play] Error:', playErr);
        await interaction.followUp({ content: `❌ Gagal memutar lagu: ${playErr.message}`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ====== Select Menu (untuk help command navigasi kategori) ======
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      const { buildHelpEmbed } = require('./helpEmbeds');
      const category = interaction.values[0];
      const embed = buildHelpEmbed(category, client);
      try {
        await interaction.update({ embeds: [embed] });
      } catch (err) {
        await safeErrorReply(err, 'Gagal memperbarui menu bantuan.');
      }
    }
  },
};
