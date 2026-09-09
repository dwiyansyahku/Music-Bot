const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { checkVoiceChannel, checkQueue, isBotOwner, cleanMusicQuery } = require('../utils/helpers');
const storage = require('../utils/storage');
const { checkBadWords, checkPhishing, checkSpam, getGuildAutomodSettings } = require('../utils/automod');
const { sendModLog } = require('../utils/modlog');

/**
 * Format durasi AFK ke string yang mudah dibaca
 */
function formatAfkDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes > 0 ? `${hours} jam ${remMinutes} menit` : `${hours} jam`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} hari ${remHours} jam` : `${days} hari`;
}

// Set untuk mencegah pemrosesan pesan ganda (deduplication guard)
const processedMessages = new Set();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;

    // ====== AFK SYSTEM — Auto-remove & Mention Detection ======
    if (client.afkUsers && client.afkUsers.size > 0) {
      // 1. Jika user yang sedang AFK mengirim pesan → hapus AFK mereka
      const senderKey = `${guildId}_${message.author.id}`;
      if (client.afkUsers.has(senderKey)) {
        const afkData = client.afkUsers.get(senderKey);
        client.afkUsers.delete(senderKey);

        const afkStorage = storage.read('afk');
        delete afkStorage[senderKey];
        storage.write('afk', afkStorage);

        const afkDuration = Date.now() - (afkData.timestamp || Date.now());
        const durStr = formatAfkDuration(afkDuration);

        message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#57F287')
              .setDescription(`👋 **Selamat datang kembali, ${message.member?.displayName || message.author.username}!**\nKamu AFK selama **${durStr}**.`)
          ]
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
      }

      // 2. Jika pesan ini mention atau mereply user yang sedang AFK → kasih tahu
      const mentionedUserIds = new Set();
      if (message.mentions.users && message.mentions.users.size > 0) {
        for (const uId of message.mentions.users.keys()) {
          if (uId !== message.author.id) mentionedUserIds.add(uId);
        }
      }
      if (message.reference && message.reference.messageId) {
        const repliedMsg = message.channel.messages?.cache?.get(message.reference.messageId);
        if (repliedMsg && repliedMsg.author && !repliedMsg.author.bot && repliedMsg.author.id !== message.author.id) {
          mentionedUserIds.add(repliedMsg.author.id);
        }
      }

      for (const mentionedId of mentionedUserIds) {
        const mentionKey = `${guildId}_${mentionedId}`;
        if (client.afkUsers.has(mentionKey)) {
          const afkData = client.afkUsers.get(mentionKey);
          const afkDuration = Date.now() - (afkData.timestamp || Date.now());
          const durStr = formatAfkDuration(afkDuration);

          message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FEE75C')
                .setDescription(
                  `💤 **${afkData.displayName || afkData.username || 'Member'}** sedang **AFK**\n` +
                  `> *${afkData.reason || 'AFK'}*\n` +
                  `⏱️ Sejak **${durStr}** yang lalu`
                )
            ]
          }).catch(() => {});
          break; // Hanya kirim 1 notifikasi per pesan
        }
      }
    }

    // ====== CURATED GALLERY SYSTEM: 2-SALURAN AUTO-REDIRECT & CLEANER ======
    try {
      const gallerySettings = storage.read('settings') || {};
      const gSettings = gallerySettings[guildId] || {};
      const galleryOutputId = gSettings.galleryChannel;
      const galleryPanelId = gSettings.galleryPanelChannel;

      // 1. Saluran Panel Pengiriman (Tempat Tombol Galeri Berada)
      if (galleryPanelId && message.channel.id === galleryPanelId) {
        if (!message.author.bot) {
          const imageAtt = message.attachments.find(att => {
            const ext = (att.name?.split('.').pop() || '').toLowerCase();
            return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || att.contentType?.startsWith('image/');
          });

          if (imageAtt) {
            // Member drop gambar langsung di saluran panel: otomatis pindahkan ke saluran output!
            const caption = message.content?.trim() || '';
            await message.delete().catch(() => {});

            const { publishGalleryItem } = require('../commands/gallery');
            const res = await publishGalleryItem(message.guild, message.author, message.member, imageAtt.url, caption, client);

            if (res.success) {
              message.channel.send({
                content: `✨ <@${message.author.id}>, fotomu berhasil dipajang di <#${res.channelId}>!`
              }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
            } else {
              message.channel.send({
                content: `❌ <@${message.author.id}>, gagal memposting gambar: ${res.error}`
              }).then(m => setTimeout(() => m.delete().catch(() => {}), 6000)).catch(() => {});
            }
            return;
          } else {
            // Teks obrolan biasa di saluran panel: bersihkan otomatis agar channel tetap rapi
            await message.delete().catch(() => {});
            message.channel.send({
              content: `⚠️ <@${message.author.id}>, saluran ini khusus **pengiriman gambar galeri**.\n` +
                `Silakan gunakan tombol pada panel atau lampirkan file foto.`
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            return;
          }
        }
      }

      // 2. Saluran Output Galeri (Tempat Foto-Foto Dipajang)
      if (galleryOutputId && message.channel.id === galleryOutputId) {
        if (!message.author.bot) {
          // Cegah obrolan teks biasa mengotori feed galeri utama
          await message.delete().catch(() => {});
          message.channel.send({
            content: `⚠️ <@${message.author.id}>, saluran <#${galleryOutputId}> adalah galeri terkurasi.\n` +
              `Untuk mengobrol atau berdiskusi, silakan gunakan **Thread** di bawah masing-masing foto.`
          }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
          return;
        }
      }
    } catch (gErr) {
      console.warn('[Gallery Message Handler Error]:', gErr.message);
    }

    // ====== AUTO-MODERATION & ANTI-PHISHING SYSTEM ======
    const automodConfig = getGuildAutomodSettings(guildId);
    if (automodConfig.enabled) {
      const isExempt = 
        (automodConfig.ignoredRoles.length > 0 && message.member?.roles?.cache?.some(r => automodConfig.ignoredRoles.includes(r.id))) ||
        (automodConfig.ignoredChannels.length > 0 && automodConfig.ignoredChannels.includes(message.channel.id));

      if (!isExempt) {
        // 1. Deteksi Phishing / Scam / Malware File / Jebakan QR & Kebocoran Token
        if (automodConfig.antiPhishing || automodConfig.antiMalware || automodConfig.antiTokenLeak) {
          const phishingCheck = checkPhishing(message);
          if (phishingCheck.isPhishing) {
            await message.delete().catch(() => {});

            // KASUS A: Kebocoran Token Discord
            if (phishingCheck.isTokenLeak) {
              const tokenAlertEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({
                  name: `KEAMANAN AKUN — ${message.guild.name.toUpperCase()}`,
                  iconURL: message.guild.iconURL({ dynamic: true }) || undefined
                })
                .setTitle('🛡️ Kebocoran Token Discord Diamankan')
                .setDescription(
                  `Pesan dari <@${message.author.id}> telah **dihapus seketika** karena mengandung **Token Discord**.\n\n` +
                  `⚠️ **PENTING UNTUK PEMILIK AKUN:**\n` +
                  `Demi mencegah akun atau bot Anda dibajak/diambil alih pihak tak bertanggung jawab, **segera ubah password atau reset bot token Anda sekarang!**`
                )
                .setFooter({ text: 'Peringatan keamanan ini akan terhapus otomatis dalam 8 detik' })
                .setTimestamp();

              message.channel.send({ embeds: [tokenAlertEmbed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 8000))
                .catch(() => {});

              if (automodConfig.logChannelId) {
                const logChannel = message.guild.channels.cache.get(automodConfig.logChannelId);
                if (logChannel) {
                  const logEmbed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('Log Keamanan: Kebocoran Token Discord Dihapus')
                    .setDescription(
                      `• **Pengirim:** <@${message.author.id}> (${message.author.tag})\n` +
                      `• **Channel:** <#${message.channel.id}>\n` +
                      `• **Alasan:** Token Discord terdeteksi dan berhasil disensor demi melindungi akun user.\n` +
                      `• **Status Token:** [DISCORD_TOKEN_REDACTED]`
                    )
                    .setTimestamp();
                  logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                }
              }

              await sendModLog(message.guild, client, {
                action: 'AUTOMOD_DELETE',
                moderator: { id: client.user.id, username: 'AutoMod Sentinel' },
                target: message.author,
                reason: 'Kebocoran Token Discord',
                details: `Pesan berisi Discord Token di <#${message.channel.id}> disensor dan dihapus demi keamanan akun.`
              });

              return;
            }

            // KASUS B: File Berbahaya / Malware / Trojan Grabber
            if (phishingCheck.isMalware) {
              if (automodConfig.timeoutOnPhishing && message.member && message.member.moderatable) {
                await message.member.timeout(60 * 60 * 1000, 'Mengirim file berbahaya / trojan token stealer').catch(() => {});
              }

              const malwareAlertEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({
                  name: `KEAMANAN SERVER — ${message.guild.name.toUpperCase()}`,
                  iconURL: message.guild.iconURL({ dynamic: true }) || undefined
                })
                .setTitle('🚨 File Berbahaya / Malware Dicegah')
                .setDescription(
                  `Pesan dari <@${message.author.id}> telah dihapus secara otomatis demi keamanan seluruh member.\n\n` +
                  `• **Alasan:** ${phishingCheck.reason}\n` +
                  `• **Tindakan:** File dihapus & akun di-timeout 1 jam untuk mencegah infeksi/pembajakan.`
                )
                .setFooter({ text: 'Peringatan ini akan terhapus otomatis dalam 5 detik' })
                .setTimestamp();

              message.channel.send({ embeds: [malwareAlertEmbed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
                .catch(() => {});

              if (automodConfig.logChannelId) {
                const logChannel = message.guild.channels.cache.get(automodConfig.logChannelId);
                if (logChannel) {
                  const logEmbed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('Log Keamanan: File Berbahaya Dihapus')
                    .setDescription(
                      `• **Pengirim:** <@${message.author.id}> (${message.author.tag})\n` +
                      `• **Channel:** <#${message.channel.id}>\n` +
                      `• **Nama File:** \`${phishingCheck.filename || phishingCheck.url}\`\n` +
                      `• **Tindakan:** Pesan dihapus & Timeout 1 Jam.`
                    )
                    .setTimestamp();
                  logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                }
              }

              await sendModLog(message.guild, client, {
                action: 'AUTOMOD_TIMEOUT',
                moderator: { id: client.user.id, username: 'AutoMod Sentinel' },
                target: message.author,
                reason: phishingCheck.reason,
                details: `File berbahaya \`${phishingCheck.filename || phishingCheck.url}\` di <#${message.channel.id}> dihapus & timeout 1 jam.`
              });

              return;
            }

            // KASUS C: Link Phishing / Scam Nitro / QR Code
            if (automodConfig.timeoutOnPhishing && message.member && message.member.moderatable) {
              await message.member.timeout(60 * 60 * 1000, 'Terdeteksi mengirim link phishing/scam berbahaya').catch(() => {});
            }

            const alertEmbed = new EmbedBuilder()
              .setColor(0x2B2D31)
              .setAuthor({
                name: `KEAMANAN SERVER — ${message.guild.name.toUpperCase()}`,
                iconURL: message.guild.iconURL({ dynamic: true }) || undefined
              })
              .setTitle('Tautan Mencurigakan / Phishing Diamankan')
              .setDescription(
                `Pesan dari <@${message.author.id}> telah dihapus secara otomatis demi keamanan seluruh member server.\n\n` +
                `• **Alasan:** \`${phishingCheck.reason}\`\n` +
                `• **Tindakan:** Pesan dihapus & akun di-timeout 1 jam untuk pencegahan penyebaran scam.`
              )
              .setFooter({ text: 'Peringatan ini akan terhapus otomatis dalam 5 detik' })
              .setTimestamp();

            message.channel.send({ embeds: [alertEmbed] })
              .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
              .catch(() => {});

            // Log ke channel audit jika dikonfigurasi
            if (automodConfig.logChannelId) {
              const logChannel = message.guild.channels.cache.get(automodConfig.logChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setColor(0x2B2D31)
                  .setTitle('Log Anti-Phishing: Tautan Dihapus')
                  .setDescription(
                    `• **Pengirim:** <@${message.author.id}> (${message.author.tag})\n` +
                    `• **Channel:** <#${message.channel.id}>\n` +
                    `• **Alasan:** ${phishingCheck.reason}\n` +
                    `• **Tautan:** \`${phishingCheck.url}\`\n` +
                    `• **Isi Pesan Asli:**\n\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\``
                  )
                  .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
              }
            }

            await sendModLog(message.guild, client, {
              action: 'AUTOMOD_TIMEOUT',
              moderator: { id: client.user.id, username: 'AutoMod Sentinel' },
              target: message.author,
              reason: phishingCheck.reason,
              details: `Tautan phishing terdeteksi di <#${message.channel.id}>: \`${phishingCheck.url}\``
            });

            return; // Hentikan pemrosesan pesan
          }
        }

        // 2. Deteksi Spam Pesan (Flood, Duplikasi, Mass Mention, Capslock, Emoji)
        if (automodConfig.antiSpam) {
          const spamCheck = checkSpam(message, automodConfig);
          if (spamCheck.isSpam) {
            await message.delete().catch(() => {});

            const isTimeout = spamCheck.action === 'timeout' && automodConfig.timeoutOnSpam && message.member && message.member.moderatable;
            if (isTimeout) {
              await message.member.timeout(60 * 1000, `Anti-Spam: ${spamCheck.reason}`).catch(() => {});
            }

            const spamEmbed = new EmbedBuilder()
              .setColor(isTimeout ? 0xED4245 : 0xFEE75C)
              .setAuthor({
                name: `ANTI-SPAM — ${message.guild.name.toUpperCase()}`,
                iconURL: message.guild.iconURL({ dynamic: true }) || undefined
              })
              .setDescription(
                isTimeout
                  ? `🔇 **<@${message.author.id}> telah di-timeout selama 1 menit.**\nAlasan: **${spamCheck.reason}**.\n\n*Peringatan ini akan terhapus otomatis dalam 5 detik.*`
                  : `⚠️ **<@${message.author.id}>, mohon jangan melakukan spam!**\nAlasan: **${spamCheck.reason}**.\n\n*Peringatan ini akan terhapus otomatis dalam 5 detik.*`
              )
              .setFooter({ text: 'Jaga kenyamanan mengobrol bersama di server' })
              .setTimestamp();

            message.channel.send({ embeds: [spamEmbed] })
              .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
              .catch(() => {});

            if (automodConfig.logChannelId) {
              const logChannel = message.guild.channels.cache.get(automodConfig.logChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setColor(isTimeout ? 0xED4245 : 0xFEE75C)
                  .setTitle(`Log Anti-Spam: ${isTimeout ? 'Pesan Dihapus & User Di-timeout' : 'Pesan Dihapus'}`)
                  .setDescription(
                    `• **Pelaku:** <@${message.author.id}> (${message.author.tag})\n` +
                    `• **Channel:** <#${message.channel.id}>\n` +
                    `• **Tipe Pelanggaran:** \`${(spamCheck.type || 'SPAM').toUpperCase()}\` (${spamCheck.reason})\n` +
                    `• **Tindakan:** ${isTimeout ? 'Pesan dihapus & Timeout 1 Menit' : 'Pesan dihapus & Peringatan'}\n` +
                    `• **Cuplikan Pesan:**\n\`\`\`\n${(message.content || '[Tidak Ada Teks / Attachment]').substring(0, 500)}\n\`\`\``
                  )
                  .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
              }
            }

            await sendModLog(message.guild, client, {
              action: isTimeout ? 'AUTOMOD_TIMEOUT' : 'AUTOMOD_DELETE',
              moderator: { id: client.user.id, username: 'AutoMod Sentinel' },
              target: message.author,
              reason: spamCheck.reason,
              details: `Spam di <#${message.channel.id}>: ${(spamCheck.type || 'SPAM').toUpperCase()}`
            });

            return; // Hentikan pemrosesan pesan
          }
        }


        // 2. Deteksi Kata yang Kurang Pantas & Variasinya (Bad Words & Fuzzy Filter)
        if (automodConfig.badWords) {
          const badWordCheck = checkBadWords(message.content, automodConfig.customBadWords, automodConfig.whitelistedWords);
          if (badWordCheck.found) {
            await message.delete().catch(() => {});

            const warnEmbed = new EmbedBuilder()
              .setColor(0x2B2D31)
              .setAuthor({
                name: `PERINGATAN AUTO-MODERATION — ${message.guild.name.toUpperCase()}`,
                iconURL: message.guild.iconURL({ dynamic: true }) || undefined
              })
              .setDescription(
                `**Pesan dari <@${message.author.id}> telah dihapus.**\n` +
                `Pesan terdeteksi mengandung kata tidak pantas: \`${badWordCheck.word}\`\n\n` +
                `*Peringatan ini akan terhapus otomatis dalam 5 detik.*`
              )
              .setFooter({ text: 'Harap gunakan bahasa yang sopan dan saling menghargai' })
              .setTimestamp();

            message.channel.send({ embeds: [warnEmbed] })
              .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)) // Otomatis terhapus setelah 5 detik
              .catch(() => {});

            // Log ke channel audit jika dikonfigurasi
            if (automodConfig.logChannelId) {
              const logChannel = message.guild.channels.cache.get(automodConfig.logChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setColor(0x2B2D31)
                  .setTitle('Log Auto-Mod: Kata Tidak Pantas')
                  .setDescription(
                    `• **Pengirim:** <@${message.author.id}> (${message.author.tag})\n` +
                    `• **Channel:** <#${message.channel.id}>\n` +
                    `• **Kata Terdeteksi:** \`${badWordCheck.word}\`\n` +
                    `• **Isi Pesan Asli:**\n\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\``
                  )
                  .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
              }
            }

            await sendModLog(message.guild, client, {
              action: 'AUTOMOD_DELETE',
              moderator: { id: client.user.id, username: 'AutoMod Sentinel' },
              target: message.author,
              reason: `Kata terlarang: "${badWordCheck.word}"`,
              details: `Pesan berisi kata tidak pantas di <#${message.channel.id}> dihapus.`
            });

            return; // Hentikan pemrosesan pesan
          }
        }
      }
    }

    // Check prefix 'q' or 'Q'
    if (!message.content.toLowerCase().startsWith('q')) return;

    // Deduplication guard: pastikan ID pesan belum pernah diproses
    if (processedMessages.has(message.id)) return;
    processedMessages.add(message.id);

    // Hapus ID pesan dari set setelah 60 detik agar hemat memori
    setTimeout(() => processedMessages.delete(message.id), 60000);

    // Parse command
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Map command names to internal commands
    switch (commandName) {
      case 'p':
      case 'play': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const rawQuery = args.join(' ');
        if (!rawQuery) {
          return message.reply('❌ Tuliskan judul lagu atau URL setelah command! Contoh: `qp never gonna give you up`');
        }

        const query = cleanMusicQuery(rawQuery);
        const searchingMsg = await message.reply(`🔍 Mencari: **${query}**...`);

        const MAX_RETRIES = 2;  // Total percobaan: 1 + 2 retry = 3x
        let lastError = null;
        let success = false;

        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
          try {
            const { getVoiceConnection } = require('@discordjs/voice');
            const ghostConn = getVoiceConnection(message.guild.id);
            if (ghostConn && !client.distube.voices.get(message.guild.id)) {
              console.log(`🧹 [Play Cleaner] Destroying unmanaged ghost voice connection di guild ${message.guild.id}...`);
              ghostConn.destroy();
              await new Promise(r => setTimeout(r, 400));
            }

            await client.distube.play(voiceChannel, query, {
              member: message.member,
              textChannel: message.channel,
              message,
            });
            // Berhasil — hapus pesan "mencari..." dan pesan command user agar chat bersih dari preview YouTube
            await searchingMsg.delete().catch(() => {});
            if (message.deletable) {
              await message.delete().catch(() => {});
            }
            success = true;
            break;
          } catch (error) {
            lastError = error;
            const isVoiceFail = error.errorCode === 'VOICE_CONNECT_FAILED' ||
                                error.errorCode === 'VOICE_ALREADY_CREATED' ||
                                error.message?.includes('Cannot connect to the voice channel');

            if (error.errorCode === 'VOICE_ALREADY_CREATED') {
              const { getVoiceConnection } = require('@discordjs/voice');
              const ghostConn = getVoiceConnection(message.guild.id);
              if (ghostConn) {
                ghostConn.destroy();
                await new Promise(r => setTimeout(r, 500));
              }
            }

            // Bersihkan queue yang terbentuk sebagian
            client.distube.getQueue(message.guild.id)?.stop().catch(() => {});

            if (isVoiceFail && attempt <= MAX_RETRIES) {
              console.warn(`⚠️ [Voice] ${error.errorCode || 'VOICE_FAIL'} (attempt ${attempt}/${MAX_RETRIES + 1}), retrying in 3s...`);
              await searchingMsg.edit(`⏳ Koneksi voice sedang disinkronisasi, mencoba lagi (${attempt}/${MAX_RETRIES})...`).catch(() => {});
              await new Promise(r => setTimeout(r, 3000));
            } else {
              console.error(error);
              break;
            }
          }
        }

        if (!success) {
          const isVoiceFail = lastError?.errorCode === 'VOICE_CONNECT_FAILED' ||
                              lastError?.message?.includes('Cannot connect to the voice channel');
          const errMsg = isVoiceFail
            ? `❌ Gagal terhubung ke voice channel setelah ${MAX_RETRIES + 1}x percobaan.\n💡 Coba ubah **Region Override** voice channel ke **Singapore** di Discord.`
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

        try {
          await client.distube.voices.join(voiceChannel);
          await message.reply(`✅ **Bot telah bergabung ke <#${voiceChannel.id}>!**`);
        } catch (error) {
          console.error('Error joining voice channel:', error);
          await message.reply(`❌ Gagal bergabung ke voice channel: ${error.message}`);
        }
        break;
      }

      // STOP: hanya menghentikan musik & membersihkan antrian, bot TETAP di voice channel
      case 'stop': {
        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        const queue = client.distube.getQueue(message.guild.id);
        if (queue) {
          queue._stoppedByCmd = true;
          await queue.stop().catch(() => {});
          await message.reply('⏹️ **Musik dihentikan dan antrian dibersihkan.** Bot tetap di voice channel.');
        } else {
          await message.reply('❌ Tidak ada musik yang sedang diputar!');
        }
        break;
      }

      // LEAVE: mengeluarkan bot dari voice channel (Khusus Owner Bot)
      case 'leave':
      case 'dc':
      case 'disconnect': {
        const isOwner = await isBotOwner(message, client);
        if (!isOwner) {
          return message.reply('❌ Perintah ini hanya bisa digunakan oleh **Owner Bot**!');
        }

        const voiceChannel = message.guild.members.me?.voice?.channel;
        if (!voiceChannel) {
          return message.reply('❌ Bot tidak ada di voice channel!');
        }

        client.stay247?.delete(message.guild.id);
        client.stay247Settings?.delete(message.guild.id);
        storage.saveGuildSetting(message.guild.id, 'stay247', { enabled: false, channelId: null });

        const queue = client.distube.getQueue(message.guild.id);
        if (queue) {
          queue._stoppedByCmd = true;
          await queue.stop().catch(() => {});
        }

        const disTubeVoice = client.distube.voices.get(message.guild.id);
        if (disTubeVoice) {
          disTubeVoice.leave();
        } else {
          const { getVoiceConnection } = require('@discordjs/voice');
          const connection = getVoiceConnection(message.guild.id);
          if (connection) {
            connection.destroy();
          } else {
            message.guild.members.me.voice.disconnect().catch(() => {});
          }
        }

        await message.reply('👋 **Bot keluar dari voice channel.**');
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
        const queue = checkQueue(message, client);
        if (!queue) return;

        if (!args[0]) {
          return message.reply(`🔊 Volume saat ini: **${queue.volume}%**`);
        }

        checkVoiceChannel(message);
        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 150) {
          return message.reply('⚠️ Tentukan volume antara 0 hingga 150! Contoh: `qvol 50`');
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
          mode = queue.repeatMode === 0 ? 1 : queue.repeatMode === 1 ? 2 : 0;
        } else if (loopArg === 'off' || loopArg === '0') {
          mode = 0;
        } else if (loopArg === 'song' || loopArg === '1') {
          mode = 1;
        } else if (loopArg === 'queue' || loopArg === '2') {
          mode = 2;
        } else {
          return message.reply('⚠️ Mode loop tidak valid! Gunakan: `qloop off`, `qloop song`, `qloop queue`');
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
            ? '✅ **Autoplay diaktifkan!** Bot otomatis mencari lagu serupa saat antrian habis.' 
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

        if (queue.songs.length <= 2) {
          return message.reply('⚠️ Antrian terlalu sedikit untuk diacak!');
        }

        try {
          await queue.shuffle();
          await message.reply(`🔀 **Antrian diacak!** (${queue.songs.length - 1} lagu berikutnya)`);
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
          return message.reply(`❌ Nomor antrian tidak valid! Pilih nomor antara 1 hingga ${queue.songs.length - 1}.`);
        }

        try {
          const removed = queue.songs.splice(pos, 1)[0];
          await message.reply(`🗑️ **Dihapus dari antrian:** ${removed.name}`);
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
          if (count <= 0) {
            return message.reply('❌ Tidak ada antrian lagu berikutnya yang bisa dibersihkan!');
          }
          queue.songs.splice(1);
          await message.reply(`🧹 **${count} lagu dibersihkan dari antrian.**`);
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
          const { formatDuration } = require('../utils/embeds');
          await message.reply(`⏩ **Melompat ke ${formatDuration(seconds)}**`);
        } catch (error) {
          console.error(error);
          await message.reply(`❌ Error: ${error.message}`);
        }
        break;
      }

      case 'lyrics':
      case 'ly': {
        let query = args.join(' ');
        if (!query) {
          const queue = client.distube.getQueue(message.guild.id);
          if (!queue || !queue.songs || queue.songs.length === 0) {
            return message.reply('❌ Tidak ada lagu yang sedang diputar! Masukkan judul: `qlyrics [judul]`');
          }
          query = queue.songs[0].name.replace(/\(Official.*?\)|\[Official.*?\]|\(Music Video\)|\[Audio\]/gi, '').trim();
        }

        try {
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
          const res = await fetch(searchUrl, {
            headers: { 'User-Agent': 'QumpruyDiscordBot/1.0' }
          });
          const results = await res.json();
          if (!Array.isArray(results) || results.length === 0) {
            return message.reply(`❌ Lirik tidak ditemukan untuk: **${query}**`);
          }

          const best = results.find(r => r.plainLyrics || r.syncedLyrics) || results[0];
          let lyricsText = best.plainLyrics || (best.syncedLyrics ? best.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '') : null);

          if (!lyricsText) {
            return message.reply(`❌ Lirik tidak tersedia untuk lagu: **${best.trackName}**`);
          }

          if (lyricsText.length > 4000) {
            lyricsText = lyricsText.substring(0, 3950) + '\n\n*... [Lirik dipotong]*';
          }

          const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`📝 ${best.trackName}`)
            .setAuthor({ name: best.artistName || 'Unknown' })
            .setDescription(lyricsText)
            .setFooter({ text: 'Sumber: LRCLIB' });

          await message.reply({ embeds: [embed] });
        } catch (err) {
          await message.reply(`❌ Gagal mencari lirik: ${err.message}`);
        }
        break;
      }

      case 'filter':
      case 'filters': {
        const queue = checkQueue(message, client);
        if (!queue) return;

        const effect = args[0]?.toLowerCase();
        if (!effect) {
          const active = (queue.filters?.names || []).join(', ') || 'Tidak ada filter aktif';
          return message.reply(`🎛️ **Filter Aktif:** \`${active}\`\nContoh: \`qfilter bassboost\`, \`qfilter nightcore\`, \`qfilter clear\``);
        }

        checkVoiceChannel(message);
        try {
          if (effect === 'clear' || effect === 'off') {
            if (queue.filters?.clear) queue.filters.clear();
            return message.reply('🧹 **Semua filter audio telah dimatikan.**');
          }

          if (queue.filters) {
            if (queue.filters.has && queue.filters.has(effect)) {
              queue.filters.remove(effect);
              await message.reply(`🎛️ Filter **${effect}** dimatikan ❌`);
            } else {
              queue.filters.add(effect);
              await message.reply(`🎛️ Filter **${effect}** diaktifkan ✅`);
            }
          }
        } catch (err) {
          await message.reply(`❌ Gagal mengatur filter: ${err.message}`);
        }
        break;
      }

      case '247': {
        const isOwner = await isBotOwner(message, client);
        if (!isOwner) {
          return message.reply('❌ Perintah ini hanya bisa digunakan oleh Owner bot!');
        }

        const voiceChannel = checkVoiceChannel(message);
        if (!voiceChannel) return;

        if (!client.stay247) {
          client.stay247 = new Set();
        }
        if (!client.stay247Settings) {
          client.stay247Settings = new Map();
        }

        const guildId = message.guild.id;
        const is247 = client.stay247.has(guildId);

        if (is247) {
          client.stay247.delete(guildId);
          client.stay247Settings.delete(guildId);
          storage.saveGuildSetting(guildId, 'stay247', { enabled: false, channelId: null });
        } else {
          client.stay247.add(guildId);
          client.stay247Settings.set(guildId, { enabled: true, channelId: voiceChannel.id, channelName: voiceChannel.name });
          storage.saveGuildSetting(guildId, 'stay247', { enabled: true, channelId: voiceChannel.id, channelName: voiceChannel.name });
          try {
            const { getVoiceConnection } = require('@discordjs/voice');
            const ghostConn = getVoiceConnection(guildId);
            if (ghostConn) ghostConn.destroy();
            await client.distube.voices.join(voiceChannel);
          } catch (err) {
            console.error('Error joining voice channel:', err);
            client.stay247.delete(guildId);
            client.stay247Settings.delete(guildId);
            storage.saveGuildSetting(guildId, 'stay247', { enabled: false, channelId: null });
            return message.reply(`❌ Gagal bergabung ke voice channel: ${err.message}`);
          }
        }

        const newState = !is247;
        const embed = new EmbedBuilder()
          .setColor(newState ? 0x1DB954 : 0xFF6B6B)
          .setTitle(newState ? '🟢 Mode 24/7 Aktif' : '🔴 Mode 24/7 Nonaktif')
          .setDescription(
            newState
              ? `Bot akan tetap standby 24/7 di <#${voiceChannel.id}> walaupun tidak ada orang, antrean habis, atau setelah bot restart.`
              : 'Bot akan keluar dari voice channel saat tidak ada orang atau saat antrean lagu selesai.'
          )
          .setFooter({ text: `Diubah oleh ${message.member?.displayName || 'Unknown'}` })
          .setTimestamp();

        await message.reply({ embeds: [embed] });
        break;
      }

      case 'ping': {
        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong!\nLatency: **${latency}ms**\nAPI Latency: **${Math.round(client.ws.ping)}ms**`);
        break;
      }

      default:
        break;
    }
  },
};

/**
 * Format durasi AFK ke string yang mudah dibaca
 */
function formatAfkDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes > 0 ? `${hours} jam ${remMinutes} menit` : `${hours} jam`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} hari ${remHours} jam` : `${days} hari`;
}
