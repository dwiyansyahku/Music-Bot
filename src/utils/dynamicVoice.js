const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const storage = require('./storage');

/**
 * Format waktu lokal WIB
 */
function getTimestampText() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB';
}

/**
 * Generate embed panel utama Voice Lounge Hub
 */
function buildVoiceLoungePanelEmbed(guild) {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: 'VOICE LOUNGE — PEMBUATAN RUANG SUARA MANDIRI',
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Pusat Ruang Suara Komunitas — ${guild.name}`)
    .setDescription(
      `Pilih jenis ruangan yang ingin kamu gunakan sesuai kebutuhan interaksi.\n\n` +
      `**Kategori Ruangan Tersedia:**\n` +
      `• **Ruang Pribadi (Private)** — Ruangan tertutup dan terkunci otomatis. Member lain tidak dapat masuk kecuali atas izinmu.\n` +
      `• **Ruang Curhat (Deep Talk)** — Suasana tenang dengan kuota terbatas (maksimal 2–3 orang) untuk obrolan privat atau berbagi cerita.\n` +
      `• **Ruang Diskusi & Belajar** — Ruangan terbuka untuk umum, cocok untuk belajar bersama, kerja kelompok, atau diskusi santai.\n\n` +
      `*Pilih salah satu tombol di bawah untuk membuat ruangan:*`
    )
    .setFooter({
      text: `${guild.name} • Dynamic Voice Service • ${getTimestampText()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();
}

/**
 * ActionRow tombol pemilihan kategori ruang suara
 */
function buildVoiceLoungeButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vlounge_btn_private')
      .setLabel('Ruang Pribadi')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vlounge_btn_curhat')
      .setLabel('Ruang Curhat')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vlounge_btn_discussion')
      .setLabel('Ruang Diskusi & Belajar')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

/**
 * Build ActionRow kontrol di dalam ruangan suara
 */
function buildInRoomControlButtons(channelId, isLocked) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_permit_${channelId}`)
      .setLabel('Beri Akses Teman')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_lock_${channelId}`)
      .setLabel(isLocked ? 'Buka Kunci' : 'Kunci Ruang')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_limit_${channelId}`)
      .setLabel('Atur Batas')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_kick_${channelId}`)
      .setLabel('Keluarkan Member')
      .setStyle(ButtonStyle.Danger)
  );

  return [row];
}

/**
 * Handle tombol pembuatan ruang suara mandiri
 */
async function handleVoiceLoungeButton(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const member = interaction.member;

  // Bot butuh izin ManageChannels dan MoveMembers
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: 'Bot membutuhkan izin **Manage Channels** (Kelola Saluran) untuk membuat ruang suara otomatis.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Tentukan kategori ruangan
  let roomType = 'discussion';
  let roomNamePrefix = 'Diskusi';
  let defaultLimit = 0;
  let isPrivate = false;

  if (customId === 'vlounge_btn_private') {
    roomType = 'private';
    roomNamePrefix = 'Private';
    isPrivate = true;
  } else if (customId === 'vlounge_btn_curhat') {
    roomType = 'curhat';
    roomNamePrefix = 'Curhat';
    defaultLimit = 2;
  } else if (customId === 'vlounge_btn_discussion') {
    roomType = 'discussion';
    roomNamePrefix = 'Diskusi';
    defaultLimit = 0;
  }

  // Cek apakah member sudah memiliki room aktif yang belum kosong
  const dynamicVoiceData = storage.read('dynamic_voice');
  if (!dynamicVoiceData[guild.id]) dynamicVoiceData[guild.id] = {};

  const existingRoomId = Object.keys(dynamicVoiceData[guild.id]).find(
    chId => dynamicVoiceData[guild.id][chId]?.ownerId === member.id
  );

  if (existingRoomId) {
    const existingChannel = guild.channels.cache.get(existingRoomId);
    if (existingChannel) {
      return interaction.reply({
        content: `Kamu sudah memiliki ruang suara aktif di <#${existingRoomId}>. Gunakan ruang tersebut atau tunggu hingga kosong.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      // Bersihkan jika channel sudah tidak ada di Discord
      delete dynamicVoiceData[guild.id][existingRoomId];
      storage.write('dynamic_voice', dynamicVoiceData);
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Tentukan nama channel bersih
  const displayName = member.displayName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || member.user.username;
  const channelName = `${roomNamePrefix} • ${displayName}`;

  // Tentukan kategori parent (gunakan kategori tempat panel berada atau kategori voice yang ditentukan)
  const settings = storage.read('settings');
  const parentCategoryId = settings[guild.id]?.dynamicVoiceCategoryId || interaction.channel?.parentId || null;

  // Setup permissions
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: isPrivate ? [PermissionFlagsBits.Connect] : [],
      allow: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.MoveMembers
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  try {
    const newVoiceChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: parentCategoryId,
      userLimit: defaultLimit,
      permissionOverwrites
    });

    // Simpan ke storage data
    dynamicVoiceData[guild.id][newVoiceChannel.id] = {
      channelId: newVoiceChannel.id,
      ownerId: member.id,
      ownerTag: member.user.tag || member.user.username,
      type: roomType,
      createdAt: Date.now(),
      locked: isPrivate
    };
    storage.write('dynamic_voice', dynamicVoiceData);

    // Kirim embed kontrol di dalam chat text-in-voice
    const controlEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `KONTROL RUANG SUARA — ${roomNamePrefix.toUpperCase()}`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(channelName)
      .setDescription(
        `• **Pemilik Ruang:** <@${member.id}>\n` +
        `• **Tipe:** \`${roomType.toUpperCase()}\`\n` +
        `• **Status:** ${isPrivate ? '`Terkunci (Private)`' : '`Terbuka`'}\n` +
        `• **Batas Kuota:** ${defaultLimit > 0 ? `\`${defaultLimit} Orang\`` : '`Tidak terbatas`'}\n\n` +
        `Gunakan tombol kendali di bawah untuk mengelola ruanganmu. Ruangan akan **dihapus otomatis** saat seluruh peserta keluar.`
      )
      .setFooter({ text: `${guild.name} • Voice Lounge Control` })
      .setTimestamp();

    const controlButtons = buildInRoomControlButtons(newVoiceChannel.id, isPrivate);
    await newVoiceChannel.send({ embeds: [controlEmbed], components: controlButtons }).catch(() => {});

    // Jika member sedang di voice, langsung pindahkan (move)
    let moveMessage = '';
    if (member.voice.channel) {
      await member.voice.setChannel(newVoiceChannel).catch(() => {});
      moveMessage = `Kamu telah otomatis dipindahkan ke ruang suaramu.`;
    } else {
      moveMessage = `Silakan bergabung ke <#${newVoiceChannel.id}>. Ruangan akan otomatis dihapus jika tidak dimasuki dalam waktu 2 menit.`;

      // Timer 2 menit jika pemilik tidak pernah masuk
      setTimeout(async () => {
        try {
          const ch = guild.channels.cache.get(newVoiceChannel.id);
          if (ch && ch.members.filter(m => !m.user.bot).size === 0) {
            await ch.delete('Ruang suara tidak dimasuki setelah 2 menit.').catch(() => {});
            const currentData = storage.read('dynamic_voice');
            if (currentData[guild.id]?.[newVoiceChannel.id]) {
              delete currentData[guild.id][newVoiceChannel.id];
              storage.write('dynamic_voice', currentData);
            }
          }
        } catch (_) {}
      }, 120000);
    }

    return interaction.editReply({
      content: `Ruang suara **${channelName}** berhasil dibuat di <#${newVoiceChannel.id}>.\n${moveMessage}`
    });
  } catch (err) {
    console.error('[DynamicVoice] Gagal membuat voice channel:', err);
    return interaction.editReply({
      content: `Gagal membuat ruang suara mandiri: ${err.message}`
    });
  }
}

/**
 * Handle tombol kontrol ruang suara (Kunci, Batas, Beri Akses, Kick)
 */
async function handleVoiceLoungeControl(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const member = interaction.member;

  // Format: vlounge_ctrl_ACTION_CHANNELID
  const parts = customId.split('_');
  const action = parts[2];
  const channelId = parts[3];

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({
      content: 'Ruang suara ini sudah tidak ada atau telah dihapus.',
      flags: MessageFlags.Ephemeral
    });
  }

  const dynamicVoiceData = storage.read('dynamic_voice');
  const roomData = dynamicVoiceData[guild.id]?.[channelId];

  // Cek apakah yang klik adalah pemilik room atau moderator
  const { isOwnerOrMod } = require('./helpers');
  const isMod = await isOwnerOrMod(interaction, client);
  const isOwner = roomData?.ownerId === member.id;

  if (!isOwner && !isMod) {
    return interaction.reply({
      content: 'Hanya pemilik ruang suara atau staf yang dapat mengelola pengaturan ruangan ini.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. KUNCI / BUKA (TOGGLE LOCK)
  if (action === 'lock') {
    const isCurrentlyLocked = roomData ? !!roomData.locked : false;
    const newLockState = !isCurrentlyLocked;

    // Ubah permission Connect untuk @everyone
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      Connect: newLockState ? false : null
    }).catch(err => {
      console.error('[DynamicVoice Lock Error]:', err.message);
    });

    if (roomData) {
      roomData.locked = newLockState;
      storage.write('dynamic_voice', dynamicVoiceData);
    }

    // Update tombol pada pesan kontrol jika memungkinkan
    const updatedButtons = buildInRoomControlButtons(channel.id, newLockState);
    await interaction.update({ components: updatedButtons }).catch(async () => {
      await interaction.reply({
        content: newLockState ? 'Ruang suara berhasil **dikunci**. Member lain dilarang masuk.' : 'Kunci ruang suara berhasil **dibuka**. Member lain dapat masuk.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    });

    return;
  }

  // 2. ATUR BATAS KUOTA (USER LIMIT)
  if (action === 'limit') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_limit_${channelId}`)
      .setTitle('Atur Batas Kapasitas Ruang');

    const limitInput = new TextInputBuilder()
      .setCustomId('vlounge_input_limit')
      .setLabel('Jumlah Maksimal Orang (0 untuk Tanpa Batas)')
      .setStyle(TextInputStyle.Short)
      .setValue(channel.userLimit.toString())
      .setPlaceholder('Contoh: 2 untuk Duo, 5 untuk Squad, 0 untuk Bebas')
      .setRequired(true)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
    return interaction.showModal(modal);
  }

  // 3. BERI AKSES TEMAN (PERMIT)
  if (action === 'permit') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_permit_${channelId}`)
      .setTitle('Beri Akses Teman Masuk');

    const permitInput = new TextInputBuilder()
      .setCustomId('vlounge_input_permit')
      .setLabel('Username / User ID / Mention Teman')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: @teman atau 123456789012345678')
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(permitInput));
    return interaction.showModal(modal);
  }

  // 4. KELUARKAN MEMBER (KICK DARI VOICE)
  if (action === 'kick') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_kick_${channelId}`)
      .setTitle('Keluarkan Member dari Ruangan');

    const kickInput = new TextInputBuilder()
      .setCustomId('vlounge_input_kick')
      .setLabel('Username / User ID / Mention Member')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Member yang ingin dikeluarkan dari ruang suaramu')
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(kickInput));
    return interaction.showModal(modal);
  }
}

/**
 * Handle submit modal kontrol ruang suara
 */
async function handleVoiceLoungeModalSubmit(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;

  // Format: vlounge_modal_ACTION_CHANNELID
  const parts = customId.split('_');
  const action = parts[2];
  const channelId = parts[3];

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({
      content: 'Ruang suara tidak ditemukan atau telah dihapus.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. Modal Limit
  if (action === 'limit') {
    const rawVal = interaction.fields.getTextInputValue('vlounge_input_limit')?.trim();
    const limitNum = parseInt(rawVal, 10);

    if (isNaN(limitNum) || limitNum < 0 || limitNum > 99) {
      return interaction.reply({
        content: 'Batas kapasitas tidak valid. Harap masukkan angka antara 0 hingga 99.',
        flags: MessageFlags.Ephemeral
      });
    }

    await channel.setUserLimit(limitNum).catch(err => {
      console.error('[DynamicVoice setUserLimit Error]:', err.message);
    });

    return interaction.reply({
      content: limitNum === 0
        ? 'Kapasitas ruangan diubah menjadi **tanpa batas**.'
        : `Kapasitas ruangan dibatasi maksimal **${limitNum} orang**.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. Modal Permit (Beri Akses)
  if (action === 'permit') {
    const query = interaction.fields.getTextInputValue('vlounge_input_permit')?.trim() || '';
    const match = query.match(/\d{17,20}/);
    let targetMember = null;

    if (match) {
      targetMember = await guild.members.fetch(match[0]).catch(() => null);
    } else {
      targetMember = guild.members.cache.find(m =>
        m.user.username.toLowerCase() === query.toLowerCase() ||
        m.displayName.toLowerCase() === query.toLowerCase()
      );
    }

    if (!targetMember) {
      return interaction.reply({
        content: `Member \`${query}\` tidak ditemukan di server ini.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Beri izin Connect: true khusus untuk user ini
    await channel.permissionOverwrites.edit(targetMember.id, {
      Connect: true,
      ViewChannel: true,
      Speak: true
    }).catch(err => {
      console.error('[DynamicVoice Permit Error]:', err.message);
    });

    return interaction.reply({
      content: `Akses khusus berhasil diberikan kepada <@${targetMember.id}>. Temanmu kini dapat bergabung meskipun ruangan dalam keadaan terkunci.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 3. Modal Kick (Keluarkan Member)
  if (action === 'kick') {
    const query = interaction.fields.getTextInputValue('vlounge_input_kick')?.trim() || '';
    const match = query.match(/\d{17,20}/);
    let targetMember = null;

    if (match) {
      targetMember = await guild.members.fetch(match[0]).catch(() => null);
    } else {
      targetMember = channel.members.find(m =>
        m.user.username.toLowerCase() === query.toLowerCase() ||
        m.displayName.toLowerCase() === query.toLowerCase()
      );
    }

    if (!targetMember) {
      return interaction.reply({
        content: `Member \`${query}\` tidak ditemukan di dalam ruang suaramu.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (targetMember.id === interaction.user.id) {
      return interaction.reply({
        content: 'Kamu tidak dapat mengeluarkan dirimu sendiri dari ruangan.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Putuskan koneksi voice target member
    await targetMember.voice.disconnect('Dikeluarkan oleh pemilik ruang suara mandiri.').catch(err => {
      return interaction.reply({
        content: `Gagal mengeluarkan member: ${err.message}`,
        flags: MessageFlags.Ephemeral
      });
    });

    return interaction.reply({
      content: `Member <@${targetMember.id}> berhasil dikeluarkan dari ruang suaramu.`,
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle ketika voiceStateUpdate terjadi untuk auto-delete channel kosong
 */
async function handleDynamicVoiceStateUpdate(oldState, newState, client) {
  const guild = oldState.guild;
  if (!guild) return;

  const dynamicVoiceData = storage.read('dynamic_voice');
  const guildRooms = dynamicVoiceData[guild.id];
  if (!guildRooms) return;

  // Cek apakah channel yang ditinggalkan (oldState.channelId) adalah dynamic voice channel
  const leftChannelId = oldState.channelId;
  if (leftChannelId && guildRooms[leftChannelId]) {
    const channel = guild.channels.cache.get(leftChannelId);
    if (channel) {
      // Hitung peserta manusia (non-bot) yang tersisa
      const remainingUsers = channel.members.filter(m => !m.user.bot).size;
      if (remainingUsers === 0) {
        // Hapus channel karena sudah kosong
        delete guildRooms[leftChannelId];
        storage.write('dynamic_voice', dynamicVoiceData);

        await channel.delete('Ruang suara mandiri telah kosong.').catch(err => {
          console.warn('[DynamicVoice Delete Warning]:', err.message);
        });
      }
    } else {
      // Channel sudah tidak ada, bersihkan record
      delete guildRooms[leftChannelId];
      storage.write('dynamic_voice', dynamicVoiceData);
    }
  }
}

module.exports = {
  buildVoiceLoungePanelEmbed,
  buildVoiceLoungeButtons,
  buildInRoomControlButtons,
  handleVoiceLoungeButton,
  handleVoiceLoungeControl,
  handleVoiceLoungeModalSubmit,
  handleDynamicVoiceStateUpdate
};
