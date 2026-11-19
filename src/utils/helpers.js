/**
 * Cek apakah user ada di voice channel dan bot punya izin untuk join
 */
function checkVoiceChannel(context) {
  const member = context.member;
  const voiceChannel = member?.voice?.channel;

  const isInteraction = typeof context.isChatInputCommand === 'function';

  if (!voiceChannel) {
    const replyOptions = { content: '❌ Kamu harus masuk ke **Voice Channel** dulu!', ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }

  // Cek apakah bot sudah di voice channel lain
  const botVoice = context.guild.members.me?.voice?.channel;
  if (botVoice && botVoice.id !== voiceChannel.id) {
    const replyOptions = { content: `❌ Bot sedang digunakan di <#${botVoice.id}>! Tunggu giliran atau gunakan channel yang sama.`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }

  // Cek permission bot di voice channel
  const { PermissionFlagsBits } = require('discord.js');
  const botPerms = voiceChannel.permissionsFor(context.guild.members.me);
  if (!botPerms.has(PermissionFlagsBits.Connect)) {
    const replyOptions = { content: `❌ Bot tidak punya izin **Connect** di <#${voiceChannel.id}>!`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }
  if (!botPerms.has(PermissionFlagsBits.Speak)) {
    const replyOptions = { content: `❌ Bot tidak punya izin **Speak** di <#${voiceChannel.id}>!`, ephemeral: true };
    if (!isInteraction) delete replyOptions.ephemeral;
    context.reply(replyOptions);
    return null;
  }

  return voiceChannel;
}

/**
 * Cek apakah ada queue yang aktif
 */
function checkQueue(context, client) {
  const queue = client.distube.getQueue(context.guild.id);
  const isInteraction = typeof context.isChatInputCommand === 'function';

  if (!queue) {
    const replyOptions = { content: '❌ Tidak ada lagu yang sedang diputar!' };
    if (isInteraction) replyOptions.ephemeral = true;
    context.reply(replyOptions);
    return null;
  }
  return queue;
}

// ID user yang dipercaya selain owner bot (bisa gunakan command owner/mod)
const TRUSTED_USER_IDS = ['1363187094973055116'];

/**
 * Cek apakah user adalah owner bot (secara dinamis dari Discord API / env)
 * @param {import('discord.js').CommandInteraction|import('discord.js').Message} context
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isBotOwner(context, client) {
  const userId = context.user ? context.user.id : context.author ? context.author.id : null;
  if (!userId) return false;

  // Cek trusted user IDs
  if (TRUSTED_USER_IDS.includes(userId)) return true;

  // Cek override via env
  if (process.env.OWNER_ID && userId === process.env.OWNER_ID) {
    return true;
  }

  try {
    if (!client.application.owner) {
      await client.application.fetch();
    }
    const owner = client.application.owner;
    if (owner.members) {
      // Jika owner berbentuk Developer Team
      return owner.members.has(userId);
    }
    return owner.id === userId;
  } catch (err) {
    console.error('[Helper] Gagal mengambil data owner bot:', err);
    return false;
  }
}

/**
 * Cek apakah user adalah owner bot ATAU punya permission Moderate Members (Moderator).
 * Owner bot selalu diizinkan, terlepas dari role hierarchy di server.
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isOwnerOrMod(interaction, client) {
  // Cek owner / trusted user dulu — selalu bisa, apapun rolenya
  const owner = await isBotOwner(interaction, client);
  if (owner) return true;

  // Cek role moderator khusus
  const MOD_ROLE_ID = '1396257049884622899';
  if (interaction.member?.roles?.cache?.has(MOD_ROLE_ID)) {
    return true;
  }

  // Cek permission Moderate Members (standar moderator Discord)
  const { PermissionFlagsBits } = require('discord.js');
  return !!interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
}

/**
 * Reply "Akses Ditolak" — khusus untuk command owner-only
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function replyNoAccess(interaction) {
  const { EmbedBuilder, MessageFlags } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Akses Ditolak')
    .setDescription('Perintah ini hanya bisa digunakan oleh **Owner Bot**.')
    .setFooter({ text: 'Ini adalah perintah eksklusif owner bot.' });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Reply "Akses Ditolak" — untuk command owner-or-moderator
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function replyNoAccessMod(interaction) {
  const { EmbedBuilder, MessageFlags } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Akses Ditolak')
    .setDescription('Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator** server.')
    .setFooter({ text: 'Kamu membutuhkan permission Moderate Members atau status Owner Bot.' });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Cek apakah user adalah Owner Bot, Server Owner, atau Administrator server.
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function isOwnerOrAdmin(interaction, client) {
  const owner = await isBotOwner(interaction, client);
  if (owner) return true;
  if (interaction.guild?.ownerId === interaction.user?.id) return true;

  const { PermissionFlagsBits } = require('discord.js');
  return !!(
    interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

/**
 * Reply "Akses Ditolak" — khusus untuk command admin/owner server
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function replyNoAccessAdmin(interaction) {
  const { EmbedBuilder, MessageFlags } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚫 Akses Ditolak')
    .setDescription('Perintah konfigurasi ini hanya bisa digunakan oleh **Administrator** atau **Server Owner** demi keamanan data keuangan server.')
    .setFooter({ text: 'Izin Administrator atau Manage Server diperlukan.' });

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Update visibilitas channel penjara (text & voice) berdasarkan keberadaan tahanan.
 * Jika ada tahanan -> channel ditampilkan ke @everyone.
 * Jika tidak ada tahanan -> channel disembunyikan dari @everyone.
 * @param {import('discord.js').Guild} guild
 */
async function updateJailVisibility(guild) {
  const storage = require('./storage');
  const { PermissionFlagsBits } = require('discord.js');
  
  const settings = storage.read('settings');
  const jailConfig = settings[guild.id]?.jail;
  if (!jailConfig) return;

  const jailData = storage.read('jail');
  const guildJails = jailData[guild.id] || {};
  const hasPrisoners = Object.keys(guildJails).length > 0;

  // Dapatkan channel text dan voice
  const textChannel = jailConfig.channelId ? await guild.channels.fetch(jailConfig.channelId).catch(() => null) : null;
  const voiceChannel = jailConfig.voiceChannelId ? await guild.channels.fetch(jailConfig.voiceChannelId).catch(() => null) : null;

  if (textChannel) {
    if (hasPrisoners) {
      // Tampilkan channel text untuk @everyone (tapi tidak bisa kirim pesan, hanya lihat)
      await textChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        SendMessages: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set text show:`, err.message));
      
      // Berikan izin View & Send untuk role penjara khusus
      const jailRole = guild.roles.cache.get(jailConfig.roleId);
      if (jailRole) {
        await textChannel.permissionOverwrites.edit(jailRole, {
          ViewChannel: true,
          SendMessages: true
        }).catch(err => console.error(`[Jail Overwrite] Gagal set jailRole text perms:`, err.message));
      }
    } else {
      // Sembunyikan channel text dari @everyone
      await textChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set text hide:`, err.message));
    }
  }

  if (voiceChannel) {
    if (hasPrisoners) {
      // Tampilkan channel voice untuk @everyone (tapi tidak bisa connect)
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: true,
        Connect: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set voice show:`, err.message));
      
      // Berikan izin View & Connect untuk role penjara khusus
      const jailRole = guild.roles.cache.get(jailConfig.roleId);
      if (jailRole) {
        await voiceChannel.permissionOverwrites.edit(jailRole, {
          ViewChannel: true,
          Connect: true,
          Speak: true
        }).catch(err => console.error(`[Jail Overwrite] Gagal set jailRole voice perms:`, err.message));
      }
    } else {
      // Sembunyikan channel voice dari @everyone
      await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false
      }).catch(err => console.error(`[Jail Overwrite] Gagal set voice hide:`, err.message));
    }
  }
}

/**
 * Membebaskan member dari penjara dan mengembalikan role/nickname/voice ke semula secara aman.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 * @param {import('discord.js').Client} client
 * @param {boolean} isAuto
 * @returns {Promise<boolean>}
 */
async function releaseFromJail(guild, userId, client, isAuto = true) {
  if (!guild || !userId) return false;
  const storage = require('./storage');
  const { EmbedBuilder } = require('discord.js');

  const currentJailData = storage.read('jail') || {};
  const data = currentJailData[guild.id]?.[userId];
  if (!data) return false; // Sudah dibebaskan atau tidak sedang dipenjara

  // 1. Hapus dari database terlebih dahulu agar enforcer langsung mengenali dia bebas
  delete currentJailData[guild.id][userId];
  storage.write('jail', currentJailData);

  // 2. Perbarui visibilitas channel jail
  await updateJailVisibility(guild).catch(() => {});

  const settings = storage.read('settings') || {};
  const jailConfig = settings[guild.id]?.jail;

  // 3. Ambil data member dan kembalikan role & nickname
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) {
    // 3a. Selalu lepas role penjara secara eksplisit
    if (jailConfig?.roleId && member.roles.cache.has(jailConfig.roleId)) {
      await member.roles.remove(jailConfig.roleId).catch(err => {
        console.warn(`[Jail Release] Gagal melepas role penjara untuk ${userId}:`, err.message);
      });
    }

    // 3b. Kembalikan role asli yang valid & bisa dikelola bot
    if (Array.isArray(data.originalRoles) && data.originalRoles.length > 0) {
      const validRoles = data.originalRoles.filter(rId => {
        const r = guild.roles.cache.get(rId);
        return r && !r.managed && r.id !== guild.id;
      });

      if (validRoles.length > 0) {
        await member.roles.add(validRoles).catch(async (err) => {
          console.warn(`[Jail Release] Bulk role add gagal (${err.message}), mencoba restore satu per satu...`);
          for (const rId of validRoles) {
            await member.roles.add(rId).catch(() => {});
          }
        });
      }
    }

    // 3c. Kembalikan nickname
    await member.setNickname(data.originalNick || null).catch(err => {
      console.warn(`[Jail Release] Gagal restore nickname ${userId}:`, err.message);
    });

    // 3d. Kembalikan ke voice channel asal jika sedang di voice channel penjara
    if (jailConfig?.voiceChannelId && member.voice?.channelId === jailConfig.voiceChannelId) {
      let movedBack = false;
      if (data.originalVoiceChannelId) {
        const origChannel = guild.channels.cache.get(data.originalVoiceChannelId);
        if (origChannel) {
          await member.voice.setChannel(origChannel)
            .then(() => { movedBack = true; })
            .catch(() => {});
        }
      }
      if (!movedBack) {
        await member.voice.disconnect('Bebas dari penjara!').catch(() => {});
      }
    }
  }

  // 4. Kirim embed pembebasan ke channel penjara jika tersedia
  if (jailConfig?.channelId) {
    const jailChannel = guild.channels.cache.get(jailConfig.channelId) || await guild.channels.fetch(jailConfig.channelId).catch(() => null);
    if (jailChannel) {
      const freeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(isAuto ? '🔓 NARAPIDANA DIBEBASKAN!' : '🔓 BAIL DIKABULKAN!')
        .setDescription(isAuto 
          ? `<@${userId}> telah menyelesaikan masa tahanannya dan resmi bebas! Semoga kapok ya~ 😄`
          : `<@${userId}> berhasil dibebaskan dari penjara! 🍀`)
        .setFooter({ text: '🏛️ Pengadilan Server' })
        .setTimestamp();

      await jailChannel.send({ content: `🎉 <@${userId}> kamu bebas!`, embeds: [freeEmbed] }).catch(() => {});
    }
  }

  console.log(`🔓 [Jail Release] Berhasil membebaskan ${userId} di guild ${guild.name} (${isAuto ? 'Auto-Release' : 'Bail'})`);
  return true;
}

/**
 * Bersihkan query musik:
 * - Hapus parameter YouTube Radio / Mix (list=RD..., list=RDMM..., start_radio=1, si=..., index=...)
 * - Mengembalikan URL video bersih agar tidak memicu error YouTube Mix non-ekstrak
 */
function cleanMusicQuery(input) {
  if (!input || typeof input !== 'string') return input;
  let q = input.trim();

  // Bersihkan link YouTube
  if (/(?:youtube\.com|youtu\.be)/i.test(q)) {
    try {
      const ytMatch = q.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/i);
      const listMatch = q.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
      const isUserPlaylist = listMatch && (listMatch[1].startsWith('PL') || listMatch[1].startsWith('OLAK'));

      // Jika ada video ID dan BUKAN playlist publik (misal list=RD... auto mix), ubah jadi direct video URL
      if (ytMatch && !isUserPlaylist) {
        return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
      }
    } catch (_) {}
  }
  return q;
}

module.exports = {
  checkVoiceChannel,
  checkQueue,
  isBotOwner,
  isOwnerOrMod,
  isOwnerOrAdmin,
  replyNoAccess,
  replyNoAccessMod,
  replyNoAccessAdmin,
  updateJailVisibility,
  releaseFromJail,
  cleanMusicQuery
};
