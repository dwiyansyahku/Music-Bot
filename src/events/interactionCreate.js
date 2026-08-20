const { MessageFlags } = require('discord.js');
const { handleCardButton, handleCardModalSubmit } = require('../utils/cardHandler');
const { createMusicControlRow } = require('../utils/musicButtons');
const { nowPlayingEmbed } = require('../utils/embeds');

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
              const row = createMusicControlRow(queue);
              const embed = nowPlayingEmbed(queue.songs[0], queue);
              await interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
              return interaction.followUp({ content: '▶️ **Musik dilanjutkan.**', flags: MessageFlags.Ephemeral }).catch(() => {});
            } else {
              await queue.pause();
              const row = createMusicControlRow(queue);
              const embed = nowPlayingEmbed(queue.songs[0], queue);
              await interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
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
