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
 * Generate embed panel utama Voice Lounge Hub (Bilingual & Elegan)
 */
function buildVoiceLoungePanelEmbed(guild) {
  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: 'VOICE LOUNGE — DYNAMIC VOICE HUB',
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Pusat Voice Room Komunitas — ${guild.name}`)
    .setDescription(
      `Pilih preset Voice Room di bawah ini sesuai kebutuhan interaksimu:\n\n` +
      `• **Private Room** — Ruangan privat yang terkunci otomatis (locked by default). Member lain tidak bisa connect tanpa izin room owner.\n` +
      `• **Deep Talk Lounge** — Ruang santai hening dengan user limit maksimal 2 orang, cocok untuk curhat atau ngobrol intim.\n` +
      `• **Gaming Squad** — Ruang khusus party mabar game dengan kapasitas 5 orang (full squad) dan kualitas audio high bitrate.\n` +
      `• **Study & Discussion** — Ruangan terbuka (open public) untuk belajar bareng atau kerja kelompok, support screen share & presentasi.\n\n` +
      `*Klik salah satu tombol di bawah untuk membuat Voice Room-mu secara otomatis:*`
    )
    .setFooter({
      text: `${guild.name} • Dynamic Voice Hub • ${getTimestampText()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();
}

/**
 * ActionRow tombol pemilihan kategori ruang suara (4 Kategori)
 */
function buildVoiceLoungeButtons() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('vlounge_btn_private')
      .setLabel('Private Room')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vlounge_btn_curhat')
      .setLabel('Deep Talk Lounge')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vlounge_btn_gaming')
      .setLabel('Gaming Squad')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('vlounge_btn_discussion')
      .setLabel('Study & Discussion')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

/**
 * Build ActionRow kontrol di dalam ruangan suara (2 Baris Rapi)
 */
function buildInRoomControlButtons(channelId, isLocked) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_permit_${channelId}`)
      .setLabel('Beri Akses / Permit')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_lock_${channelId}`)
      .setLabel(isLocked ? 'Buka Kunci / Unlock' : 'Kunci Ruang / Lock')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_name_${channelId}`)
      .setLabel('Ubah Nama / Rename')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_limit_${channelId}`)
      .setLabel('Atur Batas / Limit')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_claim_${channelId}`)
      .setLabel('Klaim Pemilik / Claim')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`vlounge_ctrl_kick_${channelId}`)
      .setLabel('Keluarkan / Kick')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
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
  } else if (customId === 'vlounge_btn_gaming') {
    roomType = 'gaming';
    roomNamePrefix = 'Mabar';
    defaultLimit = 5;
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
      delete dynamicVoiceData[guild.id][existingRoomId];
      storage.write('dynamic_voice', dynamicVoiceData);
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Tentukan nama channel bersih
  const displayName = member.displayName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || member.user.username;
  const channelName = `${roomNamePrefix} • ${displayName}`;

  // Tentukan kategori parent
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
      bitrate: roomType === 'gaming' ? 96000 : undefined,
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
        name: `VOICE CONTROL — ${roomNamePrefix.toUpperCase()} LOUNGE`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(channelName)
      .setDescription(
        `• **Room Owner:** <@${member.id}>\n` +
        `• **Preset:** \`${roomType.toUpperCase()}\`\n` +
        `• **Access:** ${isPrivate ? '`Locked (Private)`' : '`Open (Public)`'}\n` +
        `• **User Limit:** ${defaultLimit > 0 ? `\`${defaultLimit} Orang\`` : '`Unlimited`'}\n\n` +
        `**Owner Guide & Controls:**\n` +
        `• Hanya room owner yang memiliki akses untuk rename, lock/unlock, atau atur limit ruangan.\n` +
        `• Jika owner leave dari voice, member lain di dalam room bisa klik **Klaim Pemilik / Claim** untuk mengambil alih kendali.\n` +
        `• Room akan di-auto delete secara otomatis ketika semua member telah keluar.`
      )
      .setFooter({ text: `${guild.name} • Voice Lounge Control` })
      .setTimestamp();

    const controlButtons = buildInRoomControlButtons(newVoiceChannel.id, isPrivate);
    await newVoiceChannel.send({ embeds: [controlEmbed], components: controlButtons }).catch(() => {});

    // Jika member sedang di voice, langsung pindahkan (move) secara otomatis
    let moveMessage = '';
    if (member.voice.channel) {
      await member.voice.setChannel(newVoiceChannel).catch(() => {});
      moveMessage = `✅ Kamu telah otomatis dipindahkan (*Auto-Moved*) ke dalam ruang suaramu.`;
    } else {
      // Penjelasan transparan terkait batasan teknis Discord Gateway
      moveMessage =
        `✅ Ruangan berhasil dibuat di <#${newVoiceChannel.id}>.\n` +
        `*(Catatan: Kebijakan privasi Discord API tidak mengizinkan bot menghubungkan mikrofon pengguna yang sedang di luar voice secara paksa. Silakan klik link channel di atas untuk bergabung. Ruangan otomatis dihapus jika tidak dimasuki dalam waktu 2 menit).*`;

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
      content: `Ruang suara **${channelName}** siap digunakan.\n${moveMessage}`
    });
  } catch (err) {
    console.error('[DynamicVoice] Gagal membuat voice channel:', err);
    return interaction.editReply({
      content: `Gagal membuat ruang suara mandiri: ${err.message}`
    });
  }
}

/**
 * Handle tombol kontrol ruang suara (Kunci, Nama, Batas, Beri Akses, Klaim, Kick)
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

  if (!roomData) {
    return interaction.reply({
      content: 'Data konfigurasi ruang suara tidak ditemukan.',
      flags: MessageFlags.Ephemeral
    });
  }

  // === 1. KLAIM KEPEMILIKAN (CLAIM OWNERSHIP) ===
  if (action === 'claim') {
    // Cek apakah pemilik saat ini masih berada di dalam voice channel
    const isOwnerPresent = channel.members.has(roomData.ownerId);

    if (isOwnerPresent) {
      return interaction.reply({
        content: `❌ Pemilik asli ruang suara (<@${roomData.ownerId}>) masih aktif berada di dalam ruangan. Hak kepemilikan tidak dapat dialihkan selama pemilik masih ada.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Cek apakah member yang klik tombol berada di dalam voice channel tersebut
    if (!channel.members.has(member.id)) {
      return interaction.reply({
        content: '❌ Kamu harus berada di dalam ruang suara ini untuk dapat mengklaim hak kepemilikan ruangan.',
        flags: MessageFlags.Ephemeral
      });
    }

    const previousOwnerId = roomData.ownerId;
    roomData.ownerId = member.id;
    roomData.ownerTag = member.user.tag || member.user.username;
    storage.write('dynamic_voice', dynamicVoiceData);

    // Berikan izin MoveMembers & perizinan pemilik kepada member baru
    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
      Stream: true,
      UseVAD: true,
      MoveMembers: true
    }).catch(() => {});

    // Kirim pengumuman di chat teks voice channel
    const transferEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setAuthor({
        name: 'PENGALIHAN KEPEMILIKAN / OWNERSHIP TRANSFERRED',
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `👑 <@${member.id}> kini resmi menjadi **Pemilik Baru (New Owner)** dari ruang suara ini karena pemilik sebelumnya (<@${previousOwnerId}>) telah meninggalkan ruangan.\n\n` +
        `Gunakan tombol kontrol di atas untuk mengatur nama, kapasitas, dan izin akses ruangan.`
      )
      .setFooter({ text: `${guild.name} • Voice Lounge Service` })
      .setTimestamp();

    await channel.send({ embeds: [transferEmbed] }).catch(() => {});

    return interaction.reply({
      content: `✅ Selamat! Kamu kini resmi menjadi pemilik ruang suara ini. Kendali penuh telah dialihkan kepadamu.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // === VALIDASI KEPEMILIKAN KETAT UNTUK PENGATURAN RUANGAN ===
  // Admin maupun staf TIDAK BISA mengubah setting jika bukan pemilik sah ruangan
  const isOwner = roomData.ownerId === member.id;
  if (!isOwner) {
    return interaction.reply({
      content: `❌ Pengaturan ruangan ini eksklusif hanya dapat diubah oleh pemilik sah ruangan (<@${roomData.ownerId}>). Admin maupun member lain tidak dapat mengubah pengaturan selama pemilik masih ada.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // === 2. UBAH NAMA RUANG (CUSTOM NAME / RENAME) ===
  if (action === 'name') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_name_${channelId}`)
      .setTitle('Ubah Nama Ruang Suara / Rename');

    const nameInput = new TextInputBuilder()
      .setCustomId('vlounge_input_name')
      .setLabel('Nama Ruang Suara Baru (New Channel Name)')
      .setStyle(TextInputStyle.Short)
      .setValue(channel.name)
      .setPlaceholder('Contoh: Mabar Ranked Chill / Deep Talk Session')
      .setRequired(true)
      .setMaxLength(50);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return interaction.showModal(modal);
  }

  // === 3. KUNCI / BUKA (TOGGLE LOCK) ===
  if (action === 'lock') {
    const isCurrentlyLocked = !!roomData.locked;
    const newLockState = !isCurrentlyLocked;

    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      Connect: newLockState ? false : null
    }).catch(err => {
      console.error('[DynamicVoice Lock Error]:', err.message);
    });

    roomData.locked = newLockState;
    storage.write('dynamic_voice', dynamicVoiceData);

    const updatedButtons = buildInRoomControlButtons(channel.id, newLockState);
    await interaction.update({ components: updatedButtons }).catch(async () => {
      await interaction.reply({
        content: newLockState
          ? 'Ruang suara berhasil **dikunci (Locked)**. Member lain tidak dapat bergabung tanpa izin.'
          : 'Kunci ruang suara berhasil **dibuka (Unlocked)**. Member lain dapat bergabung kembali.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    });

    return;
  }

  // === 4. ATUR BATAS KUOTA (USER LIMIT) ===
  if (action === 'limit') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_limit_${channelId}`)
      .setTitle('Atur Batas Kapasitas / User Limit');

    const limitInput = new TextInputBuilder()
      .setCustomId('vlounge_input_limit')
      .setLabel('Jumlah Maksimal Orang (0 untuk Bebas)')
      .setStyle(TextInputStyle.Short)
      .setValue(channel.userLimit.toString())
      .setPlaceholder('Contoh: 2 untuk Duo, 5 untuk Squad, 0 untuk Unlimited')
      .setRequired(true)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
    return interaction.showModal(modal);
  }

  // === 5. BERI AKSES TEMAN (PERMIT) ===
  if (action === 'permit') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_permit_${channelId}`)
      .setTitle('Beri Akses Teman / Permit User');

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

  // === 6. KELUARKAN MEMBER (KICK DARI VOICE) ===
  if (action === 'kick') {
    const modal = new ModalBuilder()
      .setCustomId(`vlounge_modal_kick_${channelId}`)
      .setTitle('Keluarkan Member / Kick User');

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
 * Handle submit modal kontrol ruang suara (Name, Limit, Permit, Kick)
 */
async function handleVoiceLoungeModalSubmit(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const member = interaction.member;

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

  const dynamicVoiceData = storage.read('dynamic_voice');
  const roomData = dynamicVoiceData[guild.id]?.[channelId];

  // Pastikan hanya owner yang dapat submit modal setting
  if (roomData?.ownerId !== member.id) {
    return interaction.reply({
      content: '❌ Hanya pemilik sah ruangan yang dapat mengubah pengaturan ini.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 1. Modal Rename (Ubah Nama Ruang)
  if (action === 'name') {
    const newName = interaction.fields.getTextInputValue('vlounge_input_name')?.trim();
    if (!newName) {
      return interaction.reply({
        content: 'Nama ruang suara tidak boleh kosong.',
        flags: MessageFlags.Ephemeral
      });
    }

    await channel.setName(newName).catch(err => {
      console.error('[DynamicVoice setName Error]:', err.message);
    });

    return interaction.reply({
      content: `Nama ruang suara berhasil diubah menjadi **${newName}**.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 2. Modal Limit
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
        ? 'Kapasitas ruangan diubah menjadi **tanpa batas (Unlimited)**.'
        : `Kapasitas ruangan dibatasi maksimal **${limitNum} orang**.`,
      flags: MessageFlags.Ephemeral
    });
  }

  // 3. Modal Permit (Beri Akses)
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

  // 4. Modal Kick (Keluarkan Member)
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
 * Handle ketika voiceStateUpdate terjadi untuk auto-delete channel kosong & notifikasi owner keluar
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
        // Hapus channel karena sudah kosong total
        delete guildRooms[leftChannelId];
        storage.write('dynamic_voice', dynamicVoiceData);

        await channel.delete('Ruang suara mandiri telah kosong.').catch(err => {
          console.warn('[DynamicVoice Delete Warning]:', err.message);
        });
      } else if (oldState.member?.id === guildRooms[leftChannelId].ownerId) {
        // Pemilik room keluar sementara masih ada member lain di dalam ruangan!
        const ownerLeaveEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setAuthor({
            name: 'PEMBERITAHUAN KEPEMILIKAN / OWNER HAS LEFT',
            iconURL: oldState.member.user.displayAvatarURL({ dynamic: true })
          })
          .setDescription(
            `⚠️ Pemilik ruang suara (<@${oldState.member.id}>) telah meninggalkan ruangan.\n\n` +
            `Member yang masih berada di dalam ruangan dapat menekan tombol **[ Klaim Pemilik / Claim ]** untuk mengambil alih hak kepemilikan dan kendali ruangan ini.`
          )
          .setFooter({ text: `${guild.name} • Voice Lounge Service` })
          .setTimestamp();

        await channel.send({ embeds: [ownerLeaveEmbed] }).catch(() => {});
      }
    } else {
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
