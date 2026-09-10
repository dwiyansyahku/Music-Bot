const {
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
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

    // ====== Button Interaction (Event RSVP System) ======
    if (interaction.isButton() && interaction.customId.startsWith('event_rsvp_')) {
      const storage = require('../utils/storage');
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      const parts = interaction.customId.split('_'); // event_rsvp_yes_EVENTID or event_rsvp_no_EVENTID
      const action = parts[2]; // 'yes' or 'no'
      const eventId = parts.slice(3).join('_');

      const eventsData = storage.read('events');
      const guildEvents = eventsData[guildId] || [];
      const evt = guildEvents.find(e => e.id === eventId);

      if (!evt) {
        return interaction.reply({ content: '❌ Event ini sudah tidak tersedia.', flags: MessageFlags.Ephemeral });
      }

      if (action === 'yes') {
        if (!evt.attendees.includes(userId)) evt.attendees.push(userId);
        evt.declines = evt.declines.filter(id => id !== userId);
      } else {
        if (!evt.declines.includes(userId)) evt.declines.push(userId);
        evt.attendees = evt.attendees.filter(id => id !== userId);
      }

      storage.write('events', eventsData);

      const statusText = action === 'yes' ? '✅ Kamu telah mendaftar **Hadir**!' : '❌ Kamu telah menandai **Tidak Hadir**.';
      return interaction.reply({ content: statusText, flags: MessageFlags.Ephemeral });
    }

    // ====== Button Interaction (Event Info) ======
    if (interaction.isButton() && interaction.customId.startsWith('event_info_')) {
      const storage = require('../utils/storage');
      const guildId = interaction.guild.id;
      const eventId = interaction.customId.replace('event_info_', '');

      const eventsData = storage.read('events');
      const guildEvents = eventsData[guildId] || [];
      const evt = guildEvents.find(e => e.id === eventId);

      if (!evt) {
        return interaction.reply({ content: '❌ Event tidak ditemukan.', flags: MessageFlags.Ephemeral });
      }

      const { formatDateTimeWIB, getTimeUntilString } = require('../commands/event');
      const { EmbedBuilder: EB } = require('discord.js');

      const dateStr = formatDateTimeWIB(new Date(evt.timestamp));
      const timeUntil = evt.timestamp > Date.now() ? getTimeUntilString(evt.timestamp) : '⏰ Sudah berlalu';
      const attendeeList = evt.attendees.length > 0 ? evt.attendees.map(id => `<@${id}>`).join(', ') : '_Belum ada_';
      const declineList = evt.declines.length > 0 ? evt.declines.map(id => `<@${id}>`).join(', ') : '_Belum ada_';

      const embed = new EB()
        .setColor('#5865F2')
        .setTitle(`📅 ${evt.name}`)
        .setDescription(evt.description || '_Tidak ada deskripsi_')
        .addFields(
          { name: '📆 Tanggal & Waktu', value: dateStr, inline: true },
          { name: '⏳ Countdown', value: timeUntil, inline: true },
          { name: `✅ Hadir (${evt.attendees.length})`, value: attendeeList, inline: false },
          { name: `❌ Tidak Hadir (${evt.declines.length})`, value: declineList, inline: false }
        )
        .setFooter({ text: `ID: ${evt.id}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

    // ====== Button Interaction (Sistem Gacha 2.0 Interaktif) ======
    if (interaction.isButton() && interaction.customId.startsWith('gacha_btn_')) {
      const storage = require('../utils/storage');
      const settingsData = storage.read('settings') || {};
      const gChannels = settingsData[interaction.guildId]?.gachaChannels || {};
      const action = interaction.customId.replace('gacha_btn_', '');

      let requiredChannelId = null;
      let actionLabel = 'Gacha';

      if (action === 'daily') {
        requiredChannelId = gChannels.daily || gChannels.play;
        actionLabel = 'Klaim Hadiah Harian';
      } else if (action === 'pull_1' || action === 'pull_10') {
        requiredChannelId = gChannels.pull || gChannels.play;
        actionLabel = 'Tarik Gacha';
      } else if (action.startsWith('challenge_prompt') || action.startsWith('duel_')) {
        requiredChannelId = gChannels.live_duel || gChannels.duel || gChannels.throne || gChannels.duel_mythic || gChannels.duel_legendary || gChannels.tactics || gChannels.play;
        actionLabel = 'Tantangan & Duel Tahta';
      }

      const isDuelAction = action.startsWith('challenge_prompt') || action.startsWith('duel_');
      const allowedDuelChannels = [
        gChannels.live_duel,
        gChannels.duel,
        gChannels.throne,
        gChannels.duel_mythic,
        gChannels.duel_legendary,
        gChannels.tactics
      ].filter(Boolean);
      const targetDuelChannels = allowedDuelChannels.length > 0 ? allowedDuelChannels : [gChannels.play].filter(Boolean);

      const isChannelValid = isDuelAction
        ? (targetDuelChannels.length === 0 || targetDuelChannels.includes(interaction.channelId))
        : (!requiredChannelId || interaction.channelId === requiredChannelId);

      if (!isChannelValid && requiredChannelId) {
        const { isOwnerOrMod } = require('../utils/helpers');
        const isAuthorized = await isOwnerOrMod(interaction, client);
        if (!isAuthorized) {
          const { EmbedBuilder: EB, ActionRowBuilder: ARB, ButtonBuilder: BB, ButtonStyle: BS } = require('discord.js');
          const targetChannel = interaction.guild?.channels?.cache?.get(requiredChannelId);
          const chName = targetChannel ? `#${targetChannel.name}` : 'Saluran Khusus';
          const buttonLabel = `Menuju ke ${chName}`.slice(0, 80);
          const channelUrl = `https://discord.com/channels/${interaction.guildId}/${requiredChannelId}`;

          const embed = new EB()
            .setColor(0x5865F2)
            .setTitle('Pengalihan Saluran Gacha')
            .setDescription(
              `Aksi **${actionLabel}** dialokasikan khusus di saluran <#${requiredChannelId}>.\n\n` +
              `Silakan klik tombol di bawah untuk langsung menuju ke saluran tersebut!`
            );

          const row = new ARB().addComponents(
            new BB()
              .setLabel(buttonLabel)
              .setStyle(BS.Link)
              .setURL(channelUrl)
          );

          if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ embeds: [embed], components: [row] });
          }
          return interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
          });
        }
      }

      const {
        executeGachaPull,
        executeGachaDaily,
        executeGachaInventory,
        executeGachaRates,
        executeGachaAlbum,
        executeGachaChallengePrompt,
        executeGachaDuelStartPrompt,
        executeGachaDuelStatus,
        executeGachaDuelHelp,
        executeGachaShop,
        handleShopPurchase
      } = require('../commands/gacha');

      try {
        if (action === 'pull_1') {
          const hasResultCh = !!settingsData[interaction.guildId]?.gachaChannels?.result || true;
          await interaction.deferReply({ flags: hasResultCh ? MessageFlags.Ephemeral : undefined });
          return await executeGachaPull(interaction, client, 1);
        } else if (action === 'pull_10') {
          const hasResultCh = !!settingsData[interaction.guildId]?.gachaChannels?.result || true;
          await interaction.deferReply({ flags: hasResultCh ? MessageFlags.Ephemeral : undefined });
          return await executeGachaPull(interaction, client, 10);
        } else if (action === 'inv') {
          const isCrossToUmum = gChannels.umum && interaction.channelId !== gChannels.umum;
          await interaction.deferReply({ flags: isCrossToUmum ? MessageFlags.Ephemeral : undefined });
          return await executeGachaInventory(interaction, interaction.user, client);
        } else if (action === 'shop') {
          const isCrossToUmum = gChannels.umum && interaction.channelId !== gChannels.umum;
          await interaction.deferReply({ flags: isCrossToUmum ? MessageFlags.Ephemeral : undefined });
          return await executeGachaShop(interaction, client);
        } else if (action.startsWith('shop_buy:')) {
          const itemId = action.replace('shop_buy:', '');
          return await handleShopPurchase(interaction, client, itemId, null);
        } else if (action === 'shop_custom_tickets') {
          const { buildShopCustomTicketsModal } = require('../commands/gacha');
          return await interaction.showModal(buildShopCustomTicketsModal());
        } else if (action === 'shop_recycle') {
          const { executeGachaShopRecycle } = require('../commands/gacha');
          return await executeGachaShopRecycle(interaction, client);
        } else if (action.startsWith('shop_recycle_common:')) {
          const targetUserId = action.replace('shop_recycle_common:', '');
          const { handleShopRecycleAction } = require('../commands/gacha');
          return await handleShopRecycleAction(interaction, client, 'all_common', targetUserId);
        } else if (action.startsWith('shop_confirm:')) {
          const parts = action.replace('shop_confirm:', '').split(':');
          const itemId = parts[0];
          const targetUserId = parts[1];
          return await handleShopPurchase(interaction, client, itemId, targetUserId, true);
        } else if (action.startsWith('shop_cancel:')) {
          const targetUserId = action.replace('shop_cancel:', '');
          if (interaction.user.id !== targetUserId) {
            return interaction.reply({ content: 'Hanya pemilik transaksi yang dapat membatalkan.', flags: MessageFlags.Ephemeral });
          }
          return await interaction.update({ content: 'Pembelian telah dibatalkan. Saldo Stardust milikmu tetap utuh.', components: [] });
        } else if (action === 'shop_close_recycle') {
          return await interaction.update({ content: 'Panel daur ulang ditutup. Silakan lanjutkan berbelanja di katalog toko.', embeds: [], components: [] });
        } else if (action === 'album') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaAlbum(interaction);
        } else if (action === 'rates') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaRates(interaction);
        } else if (action === 'daily') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaDaily(interaction);
        } else if (action === 'duel_start') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaDuelStartPrompt(interaction, client);
        } else if (action.startsWith('challenge_prompt:')) {
          const tier = action.split(':')[1];
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaChallengePrompt(interaction, client, tier);
        } else if (action === 'duel_mythic') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaChallengePrompt(interaction, client, 'MYTHIC');
        } else if (action === 'duel_legendary') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaChallengePrompt(interaction, client, 'LEGENDARY');
        } else if (action === 'duel_status') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaDuelStatus(interaction, client);
        } else if (action === 'duel_help') {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          return await executeGachaDuelHelp(interaction);
        }
      } catch (gachaErr) {
        return safeErrorReply(gachaErr, 'Gagal memproses aksi Gacha.');
      }
      return;
    }

    // ====== Button & Select Menu Interaction (Clash of Thrones 2.0 — Duel Tahta Gacha) ======
    if (
      (interaction.isButton() && (
        interaction.customId.startsWith('throne_duel') ||
        interaction.customId.startsWith('throne_pick') ||
        interaction.customId.startsWith('throne_challenge_random')
      )) ||
      (interaction.isStringSelectMenu() && interaction.customId.startsWith('throne_pick_defender'))
    ) {
      const { processDuelButton } = require('../commands/gacha');
      try {
        await processDuelButton(interaction, client);
      } catch (duelErr) {
        return safeErrorReply(duelErr, 'Gagal memproses aksi Duel Tahta.');
      }
      return;
    }

    // ====== Button Interaction (🌧️ Hujan Stardust Rezeki) ======
    if (interaction.isButton() && interaction.customId.startsWith('stardust_rain:')) {
      const { processStardustRainButton } = require('../commands/gacha');
      try {
        await processStardustRainButton(interaction, client);
      } catch (rainErr) {
        return safeErrorReply(rainErr, 'Gagal memproses klaim Hujan Stardust.');
      }
      return;
    }

    // ====== Select Menu Interaction (Toko Relik & Stardust) ======
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('gacha_shop_select:')) {
      const targetUserId = interaction.customId.split(':')[1];
      const { handleShopPurchase } = require('../commands/gacha');
      try {
        const itemId = interaction.values[0];
        return await handleShopPurchase(interaction, client, itemId, targetUserId);
      } catch (shopErr) {
        return safeErrorReply(shopErr, 'Gagal memproses pembelian toko.');
      }
    }

    // ====== Select Menu Interaction (Daur Ulang Relik Gacha) ======
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('gacha_shop_recycle_select:')) {
      const targetUserId = interaction.customId.split(':')[1];
      const { handleShopRecycleAction } = require('../commands/gacha');
      try {
        const selectedRelic = interaction.values[0];
        return await handleShopRecycleAction(interaction, client, selectedRelic, targetUserId);
      } catch (recErr) {
        return safeErrorReply(recErr, 'Gagal memproses daur ulang relik.');
      }
    }

    // ====== Button Interaction (Peta Member Hub & Navigasi Mandiri) ======
    if (interaction.isButton() && (interaction.customId === 'mmap_open_panel' || interaction.customId.startsWith('mmap_'))) {
      const {
        getMemberMapData,
        buildMemberMapEmbed,
        buildMemberMapComponents
      } = require('../utils/memberMapHelper');

      try {
        const guild = interaction.guild;
        const data = getMemberMapData(guild);

        if (interaction.customId === 'mmap_open_panel') {
          const embed = buildMemberMapEmbed(guild, 0);
          const components = buildMemberMapComponents(0, data.totalPages, guild);

          return interaction.reply({
            embeds: [embed],
            components,
            flags: MessageFlags.Ephemeral
          });
        }

        let targetPage = 0;
        if (interaction.customId === 'mmap_first') {
          targetPage = 0;
        } else if (interaction.customId === 'mmap_last') {
          targetPage = data.totalPages - 1;
        } else if (interaction.customId.startsWith('mmap_prev:')) {
          targetPage = parseInt(interaction.customId.replace('mmap_prev:', ''), 10) || 0;
        } else if (interaction.customId.startsWith('mmap_next:')) {
          targetPage = parseInt(interaction.customId.replace('mmap_next:', ''), 10) || 0;
        } else if (interaction.customId.startsWith('mmap_goto:')) {
          targetPage = parseInt(interaction.customId.replace('mmap_goto:', ''), 10) || 0;
        } else {
          return;
        }

        targetPage = Math.max(0, Math.min(targetPage, data.totalPages - 1));
        const embed = buildMemberMapEmbed(guild, targetPage);
        const components = buildMemberMapComponents(targetPage, data.totalPages, guild);

        return interaction.update({
          embeds: [embed],
          components
        });
      } catch (err) {
        await safeErrorReply(err, 'Gagal memproses navigasi peta member.');
      }
      return;
    }

    // ====== Button Interaction (Galeri Server Panel) ======
    if (interaction.isButton() && (
      interaction.customId === 'gallery_btn_submit' ||
      interaction.customId === 'gallery_btn_upload_file' ||
      interaction.customId === 'gallery_btn_open_modal' ||
      interaction.customId === 'gallery_btn_rules'
    )) {
      const storage = require('../utils/storage');
      const settings = storage.read('settings') || {};
      const galleryChId = settings[interaction.guild?.id]?.galleryChannel;
      const targetText = galleryChId ? `di saluran <#${galleryChId}>` : 'di Saluran Galeri';

      // 1. Klik Tombol Panduan / Unggah Gambar
      if (interaction.customId === 'gallery_btn_submit' || interaction.customId === 'gallery_btn_upload_file') {
        const uploadChId = settings[interaction.guild?.id]?.galleryUploadChannel || settings[interaction.guild?.id]?.galleryPanelChannel;
        const uploadChText = uploadChId ? `<#${uploadChId}>` : 'Channel 1 (Upload)';

        return interaction.reply({
          content: `📸 **Panduan Pengiriman Gambar Galeri (Sistem 2-Saluran):**\n\n` +
            `1. **Kirim Gambar di Channel 1 (${uploadChText})**:\n` +
            `   • Cukup lampirkan/kirim file foto langsung dari galeri HP atau folder laptop Anda.\n` +
            `   • Anda bisa mengobrol santai atau mengetik teks caption bersamaan dengan foto (obrolan chat biasa di sana tetap normal dan tidak akan terganggu).\n\n` +
            `2. **Otomatis Masuk ke Channel 2 (${targetText})**:\n` +
            `   • Bot akan otomatis mendeteksi file gambar dan memajangnya secara rapi di galeri terkurasi.\n` +
            `   • Lengkap dengan reaksi emoji apresiasi di bawah foto!`,
          flags: MessageFlags.Ephemeral
        });
      }

      // 2. Panduan & Ketentuan
      if (interaction.customId === 'gallery_btn_rules') {
        const embed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle('Ketentuan & Pedoman Galeri Komunitas')
          .setDescription(
            `• **Konten yang Diizinkan:** Fotografi, ilustrasi, screenshot game, fan art, meme original bermutu, dan momen server.\n` +
            `• **Larangan Keras:** Dilarang konten NSFW/18+, gore, kebencian, pelecehan, atau hak cipta orang lain tanpa izin.\n` +
            `• **Format & Ukuran:** PNG, JPG, JPEG, GIF, WEBP (maksimal 8MB).\n` +
            `• **Batas Harian:** Tanpa batasan kuota (bebas berbagi karya kapan saja untuk meramaikan galeri server).\n` +
            `• **Interaksi:** Berikan apresiasi menggunakan reaksi emoji pada foto yang Anda sukai.`
          );

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ====== Select Menu Interaction (Pilih Kota untuk Pop-up Member) ======
    if (interaction.isStringSelectMenu() && interaction.customId === 'mmap_select_city') {
      const { buildCityDetailEmbed } = require('../utils/memberMapHelper');
      try {
        const selectedCity = interaction.values[0];
        const detailEmbed = await buildCityDetailEmbed(interaction.guild, selectedCity);

        return interaction.reply({
          embeds: [detailEmbed],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        await safeErrorReply(err, 'Gagal membuka detail member daerah ini.');
      }
      return;
    }

    // ====== Select Menu Interaction (Pusat Panduan & Direktori Fitur Bot) ======
    if (interaction.isStringSelectMenu() && (interaction.customId === 'help_guide_select' || interaction.customId === 'help_category')) {
      const { buildHelpEmbed } = require('./helpEmbeds');
      try {
        const category = interaction.values[0];
        const embed = buildHelpEmbed(category, client, interaction.guild);

        // Jika interaksi berasal dari pesan ephemeral / view sendiri, update. Jika dari panel publik, reply ephemeral.
        if (interaction.message?.flags?.has(MessageFlags.Ephemeral)) {
          return await interaction.update({ embeds: [embed] });
        } else {
          // Auto-capture dan auto-update panel publik ke versi terbaru
          if (interaction.message && interaction.guild) {
            try {
              const { createHelpGuidePanelPayload } = require('./helpEmbeds');
              const storage = require('../utils/storage');
              const settings = storage.read('settings');
              const guildId = interaction.guild.id;
              if (!settings[guildId]) settings[guildId] = {};
              if (settings[guildId].helpPanelMessageId !== interaction.message.id) {
                settings[guildId].helpPanelChannelId = interaction.channelId;
                settings[guildId].helpPanelMessageId = interaction.message.id;
                storage.write('settings', settings);
              }
              // Sinkronisasi otomatis pesan publik jika masih versi teks lama
              interaction.message.edit(createHelpGuidePanelPayload(interaction.guild)).catch(() => {});
            } catch (_) {}
          }

          return await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (err) {
        await safeErrorReply(err, 'Gagal membuka panduan fitur ini.');
      }
      return;
    }

    // ====== Modal Submit Interaction (Beli Banyak Tiket Gacha Kustom) ======
    if (interaction.isModalSubmit() && interaction.customId === 'gacha_shop_modal_tickets') {
      const { handleShopCustomTicketsSubmit } = require('../commands/gacha');
      try {
        return await handleShopCustomTicketsSubmit(interaction, client);
      } catch (err) {
        return safeErrorReply(err, 'Gagal memproses pembelian tiket kustom.');
      }
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

    // ====== Modal Submit Interaction (Pop-up Form Gallery Gambar) ======
    if (interaction.isModalSubmit() && interaction.customId === 'gallery_modal_submit') {
      try {
        const imageUrl = interaction.fields.getTextInputValue('gallery_input_url')?.trim() || '';
        const caption = interaction.fields.getTextInputValue('gallery_input_caption')?.trim() || '';

        if (!/^https?:\/\/.+/i.test(imageUrl)) {
          return interaction.reply({
            content: '❌ Tautan gambar tidak valid! Pastikan tautan diawali dengan `http://` atau `https://`.',
            flags: MessageFlags.Ephemeral
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { publishGalleryItem } = require('../commands/gallery');
        const res = await publishGalleryItem(interaction.guild, interaction.user, interaction.member, imageUrl, caption, client);

        if (res.success) {
          const jumpRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Lihat Postingan').setStyle(ButtonStyle.Link).setURL(res.jumpUrl)
          );
          return interaction.editReply({
            content: `✨ Gambar karyamu berhasil dipajang di <#${res.channelId}>!`,
            components: [jumpRow]
          });
        } else {
          return interaction.editReply({
            content: `❌ Gagal memposting gambar: ${res.error}`
          });
        }
      } catch (err) {
        await safeErrorReply(err, 'Gagal memproses pengiriman formulir galeri.');
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
  },
};
