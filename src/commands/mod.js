const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod, isBotOwner, replyNoAccessMod } = require('../utils/helpers');
const { sendModLog } = require('../utils/modlog');

const mod = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Perintah moderasi server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('setlogchannel')
        .setDescription('Atur channel untuk pengiriman log moderasi & aksi admin')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan mod log')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('warn')
        .setDescription('Beri peringatan (warn) kepada member')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau diwarn').setRequired(true))
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan warn').setRequired(false).setMaxLength(500))
    )
    .addSubcommand(sub =>
      sub
        .setName('warnings')
        .setDescription('Lihat riwayat warn seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau dicek').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('clearwarns')
        .setDescription('Hapus semua warn seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau dihapus warnnya').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('mute')
        .setDescription('Timeout (mute) seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau di-mute').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('durasi')
            .setDescription('Durasi mute dalam menit (max 10080 = 7 hari)')
            .setRequired(true).setMinValue(1).setMaxValue(10080)
        )
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan mute').setRequired(false).setMaxLength(500))
    )
    .addSubcommand(sub =>
      sub
        .setName('unmute')
        .setDescription('Cabut timeout (unmute) seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau di-unmute').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('kick')
        .setDescription('Kick seorang member dari server')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau di-kick').setRequired(true))
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan kick').setRequired(false).setMaxLength(500))
    )
    .addSubcommand(sub =>
      sub
        .setName('ban')
        .setDescription('Ban seorang member dari server')
        .addUserOption(opt => opt.setName('user').setDescription('User yang mau di-ban').setRequired(true))
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan ban').setRequired(false).setMaxLength(500))
        .addIntegerOption(opt =>
          opt.setName('hapus_pesan')
            .setDescription('Hapus pesan N hari terakhir (0-7)')
            .setRequired(false).setMinValue(0).setMaxValue(7)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('move')
        .setDescription('Pindahkan member ke voice channel lain')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang mau dipindahkan').setRequired(true))
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Voice Channel tujuan')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(true)
        )
        .addStringOption(opt => opt.setName('alasan').setDescription('Alasan pemindahan').setRequired(false).setMaxLength(500))
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) return replyNoAccessMod(interaction);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Cek apakah user adalah owner bot (untuk bypass hierarchy check)
    const isCallerOwner = await isBotOwner(interaction, client);

    // Helper: cek apakah target bisa di-moderasi
    function canModerate(targetMember) {
      if (targetMember.id === interaction.user.id) return '❌ Kamu tidak bisa moderasi dirimu sendiri!';
      if (targetMember.id === client.user.id) return '❌ Kamu tidak bisa moderasi bot!';
      // Owner bot bypass role hierarchy check
      if (!isCallerOwner && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return '❌ Kamu tidak bisa moderasi member yang rolenya sama atau lebih tinggi dari kamu!';
      }
      return null;
    }

    // Helper: cek apakah bot bisa moderasi target
    function botCanModerate(targetMember) {
      const botMember = interaction.guild.members.me;
      if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
        return '❌ Role bot terlalu rendah untuk moderasi member ini!';
      }
      return null;
    }

    // ============================
    // SETLOGCHANNEL
    // ============================
    if (sub === 'setlogchannel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !isCallerOwner) {
        return interaction.editReply('❌ Hanya Administrator atau Bot Owner yang dapat mengatur channel Mod Log!');
      }

      const targetChannel = interaction.options.getChannel('channel');
      const settings = storage.read('settings') || {};
      if (!settings[guildId]) settings[guildId] = {};

      settings[guildId].modLogChannel = targetChannel.id;
      settings[guildId].modLogChannelId = targetChannel.id;
      if (!settings[guildId].automod) settings[guildId].automod = {};
      settings[guildId].automod.logChannelId = targetChannel.id;
      storage.write('settings', settings);

      await sendModLog(interaction.guild, client, {
        action: 'SETLOGCHANNEL',
        moderator: interaction.user,
        details: `Channel mod log server telah diarahkan ke <#${targetChannel.id}>`
      });

      return interaction.editReply(`✅ Channel Mod Log & Pertahanan berhasil diatur ke <#${targetChannel.id}>.`);
    }

    // ============================
    // WARN
    // ============================
    if (sub === 'warn') {
      const targetUser = interaction.options.getUser('user');
      const alasan = interaction.options.getString('alasan') || 'Tidak ada alasan diberikan.';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.editReply('❌ User tidak ditemukan di server!');
      }

      const err = canModerate(targetMember) || botCanModerate(targetMember);
      if (err) return interaction.editReply(err);

      // Simpan warn
      const warns = storage.read('warns');
      if (!warns[guildId]) warns[guildId] = {};
      if (!warns[guildId][targetUser.id]) warns[guildId][targetUser.id] = [];

      warns[guildId][targetUser.id].push({
        reason: alasan,
        moderator: interaction.user.tag,
        timestamp: new Date().toISOString(),
      });
      storage.write('warns', warns);

      const warnCount = warns[guildId][targetUser.id].length;

      // Auto-punish berdasarkan jumlah warn
      let autoPunish = null;
      try {
        if (warnCount >= 8) {
          await targetMember.ban({ reason: `Auto-ban: ${warnCount} warn terkumpul` });
          autoPunish = `🔨 **AUTO BAN PERMANENT** — ${warnCount} warn terkumpul!`;
        } else if (warnCount >= 5) {
          if (targetMember.voice.channelId) {
            await targetMember.voice.disconnect(`Auto-kick voice: ${warnCount} warn terkumpul`);
            autoPunish = `👢 **AUTO KICK DARI VOICE** — ${warnCount} warn terkumpul!`;
          } else {
            autoPunish = `👢 **AUTO KICK DARI VOICE** — (Target tidak sedang di Voice Channel)`;
          }
        } else if (warnCount >= 3) {
          await targetMember.timeout(3 * 60 * 60 * 1000, `Auto-mute: ${warnCount} warn terkumpul`);
          autoPunish = `🔇 **AUTO MUTE 3 JAM** — ${warnCount} warn terkumpul!`;
        }
      } catch (e) {
        autoPunish = `⚠️ Auto-punish gagal: ${e.message}`;
      }

      // Coba DM user
      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFD93D)
              .setTitle(`⚠️ Kamu dapat warn di ${interaction.guild.name}`)
              .addFields(
                { name: '📋 Alasan', value: alasan },
                { name: '👮 Moderator', value: interaction.user.tag },
                { name: '📊 Total Warn', value: `**${warnCount}** warn` }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DM disabled */ }

      const embed = new EmbedBuilder()
        .setColor(0xFFD93D)
        .setTitle('⚠️ Warn Diberikan')
        .addFields(
          { name: '👤 User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
          { name: '📊 Total Warn', value: `**${warnCount}/8**`, inline: true },
          { name: '📋 Alasan', value: alasan },
          { name: '👮 Moderator', value: interaction.user.tag, inline: true },
        )
        .setTimestamp();

      if (autoPunish) embed.addFields({ name: '🤖 Auto-Punish', value: autoPunish });

      // Kirim ke Mod Log
      await sendModLog(interaction.guild, client, {
        action: 'WARN',
        moderator: interaction.user,
        target: targetUser,
        reason: alasan,
        details: `Total Warn: ${warnCount}/8${autoPunish ? `\nAuto-Punish: ${autoPunish}` : ''}`
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // ============================
    // WARNINGS
    // ============================
    if (sub === 'warnings') {
      const targetUser = interaction.options.getUser('user');
      const warns = storage.read('warns');
      const userWarns = warns[guildId]?.[targetUser.id] || [];

      if (userWarns.length === 0) {
        return interaction.editReply(`✅ <@${targetUser.id}> tidak memiliki riwayat warn di server ini.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle(`📋 Riwayat Warn — ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`Total warn: **${userWarns.length}/8**`)
        .addFields(
          userWarns.slice(-10).map((w, i) => ({
            name: `Warn #${userWarns.length - userWarns.slice(-10).length + i + 1}`,
            value: `📋 ${w.reason}\n👮 ${w.moderator} • <t:${Math.floor(new Date(w.timestamp) / 1000)}:R>`,
          }))
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ============================
    // CLEARWARNS
    // ============================
    if (sub === 'clearwarns') {
      const targetUser = interaction.options.getUser('user');

      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply('❌ Hanya Administrator yang bisa menghapus warn!');
      }

      const warns = storage.read('warns');
      const prev = warns[guildId]?.[targetUser.id]?.length || 0;
      if (!warns[guildId]) warns[guildId] = {};
      warns[guildId][targetUser.id] = [];
      storage.write('warns', warns);

      await sendModLog(interaction.guild, client, {
        action: 'CLEARWARNS',
        moderator: interaction.user,
        target: targetUser,
        reason: 'Pembersihan riwayat peringatan (warn)',
        details: `Sebanyak ${prev} warn sebelumnya telah dibersihkan.`
      });

      return interaction.editReply(`✅ **${prev} warn** milik <@${targetUser.id}> telah dihapus.`);
    }

    // ============================
    // MUTE (Timeout)
    // ============================
    if (sub === 'mute') {
      const targetUser = interaction.options.getUser('user');
      const durasi = interaction.options.getInteger('durasi');
      const alasan = interaction.options.getString('alasan') || 'Tidak ada alasan diberikan.';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) return interaction.editReply('❌ User tidak ditemukan!');
      const err = canModerate(targetMember) || botCanModerate(targetMember);
      if (err) return interaction.editReply(err);

      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.editReply('❌ Bot tidak memiliki izin **Moderate Members**!');
      }

      await targetMember.timeout(durasi * 60 * 1000, alasan);

      const m = Math.floor(durasi / 60);
      const s = durasi % 60;
      const durasiStr = m > 0 ? `${m} jam ${s > 0 ? s + ' menit' : ''}` : `${durasi} menit`;

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle(`🔇 Kamu di-mute di ${interaction.guild.name}`)
              .addFields(
                { name: '⏱️ Durasi', value: durasiStr },
                { name: '📋 Alasan', value: alasan },
                { name: '👮 Moderator', value: interaction.user.tag }
              )
              .setTimestamp(),
          ],
        });
      } catch { /* DM disabled */ }

      await sendModLog(interaction.guild, client, {
        action: 'MUTE',
        moderator: interaction.user,
        target: targetUser,
        reason: alasan,
        details: `Durasi Mute: ${durasiStr}`
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔇 Member Di-Mute')
            .addFields(
              { name: '👤 User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
              { name: '⏱️ Durasi', value: durasiStr, inline: true },
              { name: '📋 Alasan', value: alasan },
              { name: '👮 Moderator', value: interaction.user.tag, inline: true }
            )
            .setTimestamp(),
        ],
      });
    }

    // ============================
    // UNMUTE
    // ============================
    if (sub === 'unmute') {
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply('❌ User tidak ditemukan!');

      await targetMember.timeout(null);

      await sendModLog(interaction.guild, client, {
        action: 'UNMUTE',
        moderator: interaction.user,
        target: targetUser,
        reason: 'Pencabutan status timeout/mute lebih awal'
      });

      return interaction.editReply(`✅ <@${targetUser.id}> berhasil di-unmute.`);
    }

    // ============================
    // KICK
    // ============================
    if (sub === 'kick') {
      const targetUser = interaction.options.getUser('user');
      const alasan = interaction.options.getString('alasan') || 'Tidak ada alasan diberikan.';
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) return interaction.editReply('❌ User tidak ditemukan!');
      if (!targetMember.kickable) return interaction.editReply('❌ Bot tidak bisa kick member ini!');
      const err = canModerate(targetMember);
      if (err) return interaction.editReply(err);

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle(`👢 Kamu di-kick dari ${interaction.guild.name}`)
              .addFields(
                { name: '📋 Alasan', value: alasan },
                { name: '👮 Moderator', value: interaction.user.tag }
              ).setTimestamp(),
          ],
        });
      } catch { /* DM disabled */ }

      await targetMember.kick(alasan);

      await sendModLog(interaction.guild, client, {
        action: 'KICK',
        moderator: interaction.user,
        target: targetUser,
        reason: alasan
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('👢 Member Di-Kick')
            .addFields(
              { name: '👤 User', value: `${targetUser.tag}`, inline: true },
              { name: '📋 Alasan', value: alasan },
              { name: '👮 Moderator', value: interaction.user.tag, inline: true }
            ).setTimestamp(),
        ],
      });
    }

    // ============================
    // BAN
    // ============================
    if (sub === 'ban') {
      const targetUser = interaction.options.getUser('user');
      const alasan = interaction.options.getString('alasan') || 'Tidak ada alasan diberikan.';
      const hapusPesan = interaction.options.getInteger('hapus_pesan') ?? 0;
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (targetMember) {
        if (!targetMember.bannable) return interaction.editReply('❌ Bot tidak bisa ban member ini!');
        const err = canModerate(targetMember);
        if (err) return interaction.editReply(err);

        try {
          await targetUser.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x8B0000)
                .setTitle(`🔨 Kamu di-ban dari ${interaction.guild.name}`)
                .addFields(
                  { name: '📋 Alasan', value: alasan },
                  { name: '👮 Moderator', value: interaction.user.tag }
                ).setTimestamp(),
            ],
          });
        } catch { /* DM disabled */ }
      }

      await interaction.guild.bans.create(targetUser.id, {
        reason: alasan,
        deleteMessageSeconds: hapusPesan * 24 * 60 * 60,
      });

      await sendModLog(interaction.guild, client, {
        action: 'BAN',
        moderator: interaction.user,
        target: targetUser,
        reason: alasan,
        details: hapusPesan > 0 ? `Hapus riwayat pesan ${hapusPesan} hari terakhir` : undefined
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8B0000)
            .setTitle('🔨 Member Di-Ban')
            .addFields(
              { name: '👤 User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
              { name: '📋 Alasan', value: alasan },
              { name: '👮 Moderator', value: interaction.user.tag, inline: true }
            ).setTimestamp(),
        ],
      });
    }

    // ============================
    // MOVE (VOICE MOVE)
    // ============================
    if (sub === 'move') {
      const targetUser = interaction.options.getUser('user');
      const targetChannel = interaction.options.getChannel('channel');
      const alasan = interaction.options.getString('alasan') || 'Dipindahkan oleh moderator';

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply('❌ Member tidak ditemukan di server ini!');

      if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers) &&
          !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
          !isCallerOwner) {
        return interaction.editReply('❌ Kamu harus memiliki role dengan izin (permission) `Move Members` atau Administrator untuk memindahkan member!');
      }

      const hierarchyError = canModerate(targetMember);
      if (hierarchyError) return interaction.editReply(hierarchyError);

      const botError = botCanModerate(targetMember);
      if (botError) return interaction.editReply(botError);

      if (!targetMember.voice.channelId) {
        return interaction.editReply(`❌ <@${targetUser.id}> sedang tidak berada di Voice Channel mana pun!`);
      }

      if (targetMember.voice.channelId === targetChannel.id) {
        return interaction.editReply(`❌ <@${targetUser.id}> sudah berada di saluran <#${targetChannel.id}>!`);
      }

      const botMember = interaction.guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
        return interaction.editReply('❌ Bot tidak memiliki izin `Move Members` di server ini!');
      }

      const oldChannelId = targetMember.voice.channelId;
      const oldChannelName = targetMember.voice.channel?.name || oldChannelId;

      try {
        await targetMember.voice.setChannel(targetChannel.id, alasan);

        await sendModLog(interaction.guild, client, {
          action: 'VOICE_MOVE',
          moderator: interaction.user,
          target: targetUser,
          reason: alasan,
          details: `• **Dari Saluran:** <#${oldChannelId}> (\`${oldChannelName}\`)\n` +
            `• **Ke Saluran:** <#${targetChannel.id}> (\`${targetChannel.name}\`)\n` +
            `• **Pelaku Pemindahan:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n` +
            `• **Pengguna Dipindahkan:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n` +
            `• **Alasan:** ${alasan}`,
          color: 0x5865F2
        });

        const replyEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🔊 Member Berhasil Dipindahkan')
          .setDescription(`Berhasil memindahkan <@${targetUser.id}> dari <#${oldChannelId}> ke <#${targetChannel.id}>.`)
          .setFooter({ text: `Alasan: ${alasan}` })
          .setTimestamp();

        return interaction.editReply({ embeds: [replyEmbed] });
      } catch (err) {
        return interaction.editReply(`❌ Gagal memindahkan member: ${err.message}`);
      }
    }
  },
};

module.exports = mod;
