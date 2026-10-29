const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits
} = require('discord.js');
const storage = require('./storage');
const { isOwnerOrMod } = require('./helpers');
const { sendModLog } = require('./modlog');

/**
 * Direktori Panduan Komprehensif Seluruh Fitur Bot
 */
const ADMIN_GUIDE_DATA = {
  gacha: {
    label: '👑 Gacha & Perebutan Kursi Tahta (Clash of Thrones 2.0)',
    emoji: '👑',
    title: 'PANDUAN ADMIN: SISTEM GACHA & ARENA DUEL TAHTA',
    color: 0xFF007F,
    summary: 'Sistem pengumpulan relik semesta, drop rate bertingkat, toko stardust, dan perebutan tahta permanen antar member.',
    commands: [
      '`/gacha setchannel type:<hub|leaderboard|duel|feed>` — Atur channel khusus Lounge, Klasemen, Arena Duel, atau Berita.',
      '`/gacha setrole tier:<MYTHIC|LEGENDARY|CHAMPION> role:<@role>` — Hubungkan tahta ke Role Discord server.',
      '`/gacha panel type:<hub|leaderboard|boss|duel>` — Pasang panel tombol interaktif permanen di channel pilihan.',
      '`/gacha boost tier:<TIER> multiplier:<2x|3x|5x> duration:<1-10>` — Aktifkan event rate boost server.',
      '`/gacha award user:<@user> tickets:<N> stardust:<N>` — Beri tiket/stardust hadiah giveaway.',
      '`/gacha awardvoice tickets:<N> stardust:<N>` — Bagi-bagi hadiah ke seluruh member di voice channel admin.',
      '`/gacha resetseason [force:true]` — Jalankan reset musim bulanan dan penobatan Juara Top 1.'
    ],
    setupSteps: [
      '**Langkah 1:** Siapkan saluran khusus (contoh: `#gacha-lounge`, `#papan-klasemen`, `#arena-duel`, `#gacha-feed`).',
      '**Langkah 2:** Hubungkan role Discord tahta: `/gacha setrole tier:MYTHIC role:@Musketeer`, `tier:LEGENDARY role:@Paladin`, dan `tier:CHAMPION role:@GodOfQumpruy`.',
      '**Langkah 3:** Pasang panel interaktif di channel: `/gacha panel type:hub` di `#gacha-lounge`, dan `/gacha panel type:leaderboard` di `#papan-klasemen`.',
      '**Langkah 4:** Atur Arena Duel terpadu: `/gacha setchannel type:duel channel:#arena-duel`. Saluran ini menjadi pusat Boss Raid, kemunculan boss, dan duel tahta.'
    ],
    tips: 'Toko Stardust (`/gacha shop`) bersifat invisible (ephemeral) untuk menjaga kerahasiaan transaksi member.'
  },

  boss: {
    label: '👹 World Boss Raid Multi-Party & Arena Duel',
    emoji: '👹',
    title: 'PANDUAN ADMIN: WORLD BOSS RAID MULTI-PARTY',
    color: 0x9B59B6,
    summary: 'Pertempuran monster kolosal terjadwal setiap malam pukul 21:00 WIB berhadiah tiket gacha dan stardust berlimpah.',
    commands: [
      '`Tombol [Lobi Boss Raid]` di Lounge — Membuka panel lobi pembentukan party tempur.',
      '`Tombol [Buka/Kunci Boss Raid]` — Fitur admin untuk membuka atau mengunci paksa boss raid saat pengujian.',
      '`/gacha equiprelic relic:<nama>` — Memasang relik koleksi sebagai senjata raid (Ancient +50% ATK, Mythic +30%, Leg +20%).'
    ],
    setupSteps: [
      '**Jadwal Otomatis (WIB):** Bot otomatis membunyikan alarm peringatan 10 menit (20:50 WIB) dan memunculkan World Boss di Arena Duel tepat jam 21:00 WIB.',
      '**Tipe Monster Terjadwal:** Hari biasa (DAILY Boss: 25.000 HP), Malam Minggu (WEEKLY Boss: 80.000 HP), Malam Akhir Bulan (MONTHLY Boss: 250.000 HP).',
      '**Pusat Pertempuran:** Kemunculan Boss dan sesi combat multi-party berlangsung di saluran **Arena Duel** (`#arena-duel`).',
      '**Papan Skor Real-Time:** Papan klasemen `#papan-klasemen` otomatis memperbarui darah HP dan akumulasi damage setiap kali pemain menyerang.'
    ],
    tips: 'Admin dapat menekan tombol [Buka/Kunci Boss Raid] di panel lobi kapan saja untuk demonstrasi atau event spesial di luar jam 21:00 WIB.'
  },

  card: {
    label: '🪪 Member Identity Card & Galeri Server',
    emoji: '🪪',
    title: 'PANDUAN ADMIN: MEMBER CARD & GALERI SERVER',
    color: 0x5865F2,
    summary: 'Kartu tanda pengenal visual Canvas (1200x500px) lengkap dengan auto-zodiac, asal kota, like/respect, dan galeri karya.',
    commands: [
      '`/setcard channel:<#create-card>` — Pasang panel pembuatan/edit kartu profil member.',
      '`/card [member:@user]` — Tampilkan preview kartu identitas diri sendiri atau orang lain.',
      '`/gallery setchannel upload:<#upload> display:<#galeri>` — Atur sistem kurasi galeri foto 2-saluran.',
      '`/membermap` — Tampilkan peta sebaran domisili member server.'
    ],
    setupSteps: [
      '**Langkah 1:** Buat channel `#create-card` dan jalankan `/setcard channel:#create-card`. Bot memasang 1 panel resmi.',
      '**Langkah 2:** Ketika member submit modal data diri, kartu Canvas otomatis dirender dan dikirim ke `#card-gallery`.',
      '**Langkah 3:** Member langsung diberikan tautan langsung (link pesan) menuju kartu profilnya yang telah dipublikasikan.'
    ],
    tips: 'Setiap kartu dilengkapi tombol reaksi ❤️ Like dan 🫡 Respect yang otomatis mengupdate skor profil secara realtime.'
  },

  desk: {
    label: '🎫 Community Desk & Tiket Pengaduan Staf',
    emoji: '🎫',
    title: 'PANDUAN ADMIN: COMMUNITY DESK & TIKET MODERASI',
    color: 0xED4245,
    summary: 'Saluran pengaduan member terstruktur (Laporan Pelanggaran, Ide Konten, Kritik & Saran, dan Pesan Khusus Staf).',
    commands: [
      '`/desk panel channel:<#pusat-bantuan>` — Pasang panel tombol tiket pengaduan publik.',
      '`/desk setchannel category:<report|content|feedback|other> channel:<#channel>` — Arahkan tiket ke ruang staf tertutup.',
      '`/desk stats` — Lihat metrik dan performa penanganan tiket oleh tim moderator.'
    ],
    setupSteps: [
      '**Langkah 1:** Pasang panel utama di `#pusat-bantuan` dengan perintah `/desk panel`.',
      '**Langkah 2:** Setiap tiket masuk ke saluran staf tertutup dengan tombol tindakan: **[Selesaikan]**, **[Balas Member]**, **[Tolak]**, dan **[Tindakan Mod / Timeout]**.',
      '**Langkah 3:** Balasan staf otomatis terkirim rapi ke Direct Message (DM) Discord member bersangkutan.'
    ],
    tips: 'Gunakan tombol [Balas Member] untuk berkomunikasi dua arah secara resmi atas nama server.'
  },

  automod: {
    label: '🛡️ Moderasi, Automod & Anti-Nuke',
    emoji: '🛡️',
    title: 'PANDUAN ADMIN: KEAMANAN SERVER, AUTOMOD & ANTI-NUKE',
    color: 0xE67E22,
    summary: 'Perlindungan otomatis 24/7 dari serangan spam, mention flood, link berbahaya, invite tak berizin, dan aksi mass-delete.',
    commands: [
      '`/automod status` — Periksa status filter aktif dan ambang batas deteksi.',
      '`/automod toggle filter:<spam|mention|link|invite> enable:<true|false>` — Nyalakan/matikan filter spesifik.',
      '`/mod setlogchannel channel:<#mod-log>` — Atur saluran pencatatan audit log bot.',
      '`/mod warn | mute | kick | ban | clearwarns` — Perintah moderasi cepat staff.'
    ],
    setupSteps: [
      '**Circuit Breaker System:** Bot otomatis mendeteksi jika terjadi lonjakan error atau spam agresif dan mengisolasi ancaman seketika.',
      '**Audit Log:** Pastikan saluran `#mod-log` sudah diatur agar setiap aksi penghapusan, ban, dan modifikasi tercatat lengkap dengan identitas moderator.'
    ],
    tips: 'Gunakan `/automod whitelist user:@member` untuk mengecualikan bot rekanan atau staf terpercaya dari filter anti-link.'
  },

  voice: {
    label: '🔊 Dynamic Voice Channels & Musik 24/7',
    emoji: '🔊',
    title: 'PANDUAN ADMIN: DYNAMIC VOICE & AUDIO LOUNGE',
    color: 0x2ECC71,
    summary: 'Generator voice room otomatis (Join to Create), kontrol ruang suara mandiri, dan pemutar musik berkualitas tinggi.',
    commands: [
      '`/voicehub setchannel channel:<#voice-lobby>` — Pasang panel kontrol dan generator voice channel otomatis.',
      '`/play <judul/link>` — Putar musik dari YouTube, Spotify, dan SoundCloud.',
      '`/q247 enable:<true>` — Kunci bot musik agar tetap berada di voice channel 24/7 tanpa keluar.',
      '`/musicquiz [rounds:N]` — Mulai kuis tebak lagu seru berhadiah tiket gacha dan stardust.'
    ],
    setupSteps: [
      '**Voice Reward Pasif:** Member yang mengobrol di Voice Channel aktif mendapatkan **1 Tiket Gacha & 15 Stardust setiap 15 menit**.',
      '**Anti-AFK Smart Filter:** Bot secara cerdas tidak memberikan reward jika member mute mic, deafen, atau sendirian di channel.'
    ],
    tips: 'Aktifkan `/q247` pada voice room santai komunitas agar musik tidak pernah berhenti meskipun antrean kosong.'
  },

  audit: {
    label: '📊 Audit Undangan, Statistik & Cadangan Database',
    emoji: '📊',
    title: 'PANDUAN ADMIN: AUDIT SERVER, INVITES & BACKUP',
    color: 0x3498DB,
    summary: 'Pelacak pengundang asli (anti-fake/left member), leaderboard sosial media, dan sistem backup pemulihan data.',
    commands: [
      '`/qinvite audit [member:@user]` — Audit riwayat siapa saja yang diundang oleh seorang member.',
      '`/backup` — Buat cadangan database JSON server seketika.',
      '`/restore file:<nama_file>` — Pulihkan data server dari arsip cadangan.',
      '`/socmed setup channel:<#socmed-feed>` — Integrasi pelacak postingan media sosial server.'
    ],
    setupSteps: [
      'Lakukan `/backup` secara berkala sebelum melakukan perubahan besar pada role atau saluran server.',
      'File backup tersimpan aman di direktori lokal bot dan dapat dipulihkan kapan saja menggunakan `/restore`.'
    ],
    tips: 'Fitur audit invite mendeteksi akun palsu berumur < 3 hari dan member yang langsung keluar setelah join.'
  },

  schedulers: {
    label: '⏰ Pengumuman & Ucapan Otomatis (Schedulers)',
    emoji: '⏰',
    title: 'PANDUAN ADMIN: UCAPAN & PENGUMUMAN OTOMATIS',
    color: 0xFEE75C,
    summary: 'Pengiriman ucapan pagi & malam estetis berlatar belakang kutipan bijak, pengingat event, dan kartu ulang tahun.',
    commands: [
      '`/qmorning setchannel channel:<#general>` — Atur saluran ucapan Selamat Pagi (06:00 WIB).',
      '`/qnight setchannel channel:<#general>` — Atur saluran ucapan Selamat Malam (22:00 WIB).',
      '`/birthday setchannel channel:<#ultah>` — Atur pengumuman ucapan ulang tahun otomatis.',
      '`/event create` — Buat agenda event komunitas dengan countdown realtime dan tombol RSVP.',
      '`/timecapsule create` — Kunci pesan masa lalu yang akan dibuka di tanggal mendatang.'
    ],
    setupSteps: [
      'Seluruh scheduler beroperasi berdasarkan Waktu Indonesia Barat (WIB / UTC+7).',
      'Pesan selamat pagi dan malam otomatis dilengkapi gambar pemandangan hangat dan kata-kata motivasi harian.'
    ],
    tips: 'Integrasikan `/birthday` dengan kartu identitas member agar tanggal lahir member otomatis terucap di hari spesialnya.'
  }
};

/**
 * Bangun Payload Panel Kontrol Admin Utama
 */
function buildAdminPanelPayload(guild, client) {
  const guildId = guild?.id;
  const settingsData = storage.read('settings') || {};
  const gCh = settingsData[guildId]?.gachaChannels || {};
  const gRoles = settingsData[guildId]?.gachaRoles || {};

  const nowWIB = new Date(Date.now() + (7 * 3600000)).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' WIB';

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `ADMIN CONTROL HUB & OPERATIONS • ${guild ? guild.name.toUpperCase() : 'SERVER'}`,
      iconURL: guild?.iconURL({ dynamic: true }) || undefined
    })
    .setTitle('PUSAT KONTROL & DIREKTORI FITUR SERVER')
    .setDescription(
      `Selamat datang di **Admin Control Hub**! Panel ini dirancang khusus untuk mempermudah Administrator dan Moderator dalam mengelola seluruh sistem, saluran, tahta, dan event bot.\n\n` +
      `**📊 STATUS SISTEM OPERASIONAL SERVER:**\n` +
      `• **Waktu Server:** \`${nowWIB}\`\n` +
      `• **Total Anggota:** \`${guild ? guild.memberCount.toLocaleString('id-ID') : 0} Member\`\n` +
      `• **Saluran Terkonfigurasi:**\n` +
      `  ↳ Hub Lounge: ${gCh.hub ? `<#${gCh.hub}>` : '_Belum diatur_'}\n` +
      `  ↳ Papan Klasemen: ${gCh.leaderboard ? `<#${gCh.leaderboard}>` : '_Belum diatur_'}\n` +
      `  ↳ Arena Duel (Boss/Tahta): ${gCh.duel ? `<#${gCh.duel}>` : '_Belum diatur_'}\n` +
      `  ↳ Feed Jackpot: ${gCh.feed || gCh.announce ? `<#${gCh.feed || gCh.announce}>` : '_Belum diatur_'}\n` +
      `• **Role Tahta Aktif:**\n` +
      `  ↳ Mythic (3 Kursi): ${gRoles.MYTHIC ? `<@&${gRoles.MYTHIC}>` : '_Belum diatur_'}\n` +
      `  ↳ Legendary (5 Kursi): ${gRoles.LEGENDARY ? `<@&${gRoles.LEGENDARY}>` : '_Belum diatur_'}\n` +
      `  ↳ Juara Season (Top 1): ${gRoles.CHAMPION ? `<@&${gRoles.CHAMPION}>` : '_Belum diatur_'}\n\n` +
      `**📖 CARA MENGGUNAKAN DIREKTORI:**\n` +
      `Pilih salah satu menu dropdown di bawah untuk melihat penjelasan detail, daftar perintah slash command, dan panduan langkah demi langkah cara mengoperasikannya.\n\n` +
      `*Gunakan tombol aksi cepat di bawah untuk pemeliharaan 1-klik:*`
    )
    .setFooter({ text: 'Admin Operations Hub • Khusus Staf & Moderator Berwenang' })
    .setTimestamp();

  // Dropdown Menu Kategori Panduan
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('admin_select_guide_category')
    .setPlaceholder('Pilih Fitur yang Ingin Dipelajari / Dikelola...')
    .addOptions(
      Object.entries(ADMIN_GUIDE_DATA).map(([key, data]) => ({
        label: data.label.slice(0, 100),
        value: key,
        description: data.summary.slice(0, 100),
        emoji: data.emoji
      }))
    );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  // Quick Action Buttons Row 1
  const actionRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_btn_sync_panels')
      .setLabel('Sinkronkan Semua Panel')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('admin_btn_reconcile_roles')
      .setLabel('Diagnostik Role Tahta')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_btn_force_boss')
      .setLabel('Buka/Kunci Boss Raid')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('admin_btn_backup')
      .setLabel('Backup Data Instan')
      .setStyle(ButtonStyle.Secondary)
  );

  // Quick Action Buttons Row 2
  const actionRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_btn_broadcast_modal')
      .setLabel('Broadcast Pengumuman Resmi')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('admin_btn_health')
      .setLabel('Cek Status Kesehatan Bot')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [selectRow, actionRow1, actionRow2] };
}

/**
 * Bangun Embed Panduan untuk Kategori Spesifik
 */
function buildAdminCategoryEmbed(categoryKey, guild) {
  const guide = ADMIN_GUIDE_DATA[categoryKey] || ADMIN_GUIDE_DATA.gacha;

  const embed = new EmbedBuilder()
    .setColor(guide.color || 0x5865F2)
    .setTitle(guide.title)
    .setDescription(
      `> *${guide.summary}*\n\n` +
      `**📋 DAFTAR SLASH COMMAND TERKAIT:**\n` +
      guide.commands.map(cmd => `• ${cmd}`).join('\n') + `\n\n` +
      `**🛠️ PANDUAN PENGOPERASIAN STAF:**\n` +
      guide.setupSteps.join('\n') + `\n\n` +
      `💡 **Tips Admin:**\n${guide.tips}`
    )
    .setFooter({ text: `${guild ? guild.name : 'Server'} • Panduan Resmi Administrator` })
    .setTimestamp();

  return embed;
}

/**
 * Tampilkan Modal Broadcast Resmi Administrator
 */
async function showBroadcastModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin_modal_broadcast')
    .setTitle('Broadcast Pengumuman Resmi Server');

  const channelInput = new TextInputBuilder()
    .setCustomId('admin_bc_channel')
    .setLabel('Channel Target (ID atau Kosongkan = Channel Ini)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: 123456789012345678 atau biarkan kosong')
    .setRequired(false)
    .setMaxLength(32);

  const titleInput = new TextInputBuilder()
    .setCustomId('admin_bc_title')
    .setLabel('Judul Pengumuman')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: PENGUMUMAN MAINTENANCE / UPDATE SEASON')
    .setRequired(true)
    .setMaxLength(100);

  const contentInput = new TextInputBuilder()
    .setCustomId('admin_bc_content')
    .setLabel('Isi Pengumuman')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tuliskan rincian pengumuman resmi di sini...')
    .setRequired(true)
    .setMaxLength(3000);

  const pingInput = new TextInputBuilder()
    .setCustomId('admin_bc_ping')
    .setLabel('Mention/Ping (everyone / here / none)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ketik: everyone, here, atau none (Default: none)')
    .setRequired(false)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(channelInput),
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(contentInput),
    new ActionRowBuilder().addComponents(pingInput)
  );

  return interaction.showModal(modal);
}

/**
 * Handler Tombol Interaksi Admin (admin_btn_*)
 */
async function handleAdminButton(interaction, client) {
  const isAuthorized = await isOwnerOrMod(interaction, client);
  if (!isAuthorized) {
    return interaction.reply({
      content: '❌ Perintah dan tindakan ini hanya dapat diakses oleh **Owner Bot** atau **Administrator/Moderator** yang berwenang.',
      flags: MessageFlags.Ephemeral
    });
  }

  const customId = interaction.customId;

  // 1. Modal Broadcast
  if (customId === 'admin_btn_broadcast_modal') {
    return showBroadcastModal(interaction);
  }

  // 2. Tutup Panduan
  if (customId === 'admin_btn_close_guide') {
    return interaction.update({
      content: '✅ Panduan ditutup.',
      embeds: [],
      components: []
    }).catch(() => {});
  }

  // 3. Kembali ke Panel Utama
  if (customId === 'admin_btn_back_to_hub') {
    const payload = buildAdminPanelPayload(interaction.guild, client);
    return interaction.update(payload).catch(() => {});
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // A. SINKRONKAN SEMUA PANEL (Hub Lounge, Leaderboard, Arena Duel)
  if (customId === 'admin_btn_sync_panels') {
    const { updateHubPanelIfExists, createDuelPanelPayload } = require('../commands/gacha');
    const { updateLiveLeaderboardChannel } = require('./dungeonBoss');

    let hubStatus = '⚪ Tidak terkonfigurasi';
    let lbStatus = '⚪ Tidak terkonfigurasi';
    let duelStatus = '⚪ Tidak terkonfigurasi';

    const settingsData = storage.read('settings') || {};
    const gCh = settingsData[interaction.guild.id]?.gachaChannels || {};
    const gPanels = settingsData[interaction.guild.id]?.gachaPanels || {};

    // Sync Hub Lounge
    if (gCh.hub || gCh.play) {
      try {
        await updateHubPanelIfExists(interaction.guild, client);
        hubStatus = `✅ Berhasil sinkron (${gCh.hub ? `<#${gCh.hub}>` : `<#${gCh.play}>`})`;
      } catch (err) {
        hubStatus = `❌ Gagal: ${err.message}`;
      }
    }

    // Sync Leaderboard
    if (gCh.leaderboard) {
      try {
        await updateLiveLeaderboardChannel(interaction.guild, client);
        lbStatus = `✅ Berhasil sinkron (<#${gCh.leaderboard}>)`;
      } catch (err) {
        lbStatus = `❌ Gagal: ${err.message}`;
      }
    }

    // Sync Duel Panel
    if (gCh.duel) {
      try {
        const duelMsgId = gPanels.duel_msg;
        if (duelMsgId) {
          const ch = interaction.guild.channels.cache.get(gCh.duel) || await interaction.guild.channels.fetch(gCh.duel).catch(() => null);
          if (ch) {
            const msg = await ch.messages.fetch(duelMsgId).catch(() => null);
            if (msg) {
              const payload = createDuelPanelPayload(interaction.guild);
              await msg.edit(payload);
            }
          }
        }
        duelStatus = `✅ Aktif di <#${gCh.duel}>`;
      } catch (err) {
        duelStatus = `❌ Gagal: ${err.message}`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('SINKRONISASI PANEL SELESAI')
      .setDescription(
        `Semua panel interaktif dan papan klasemen server telah diperbarui secara realtime:\n\n` +
        `• **Hub Lounge (#gacha-lounge):** ${hubStatus}\n` +
        `• **Papan Klasemen (#papan-klasemen):** ${lbStatus}\n` +
        `• **Arena Duel (#arena-duel):** ${duelStatus}\n\n` +
        `*Data HP Boss, persentase darah, dan status pemegang tahta telah tersinkronkan.*`
      )
      .setFooter({ text: 'Admin Operations • Panel Auto-Sync' })
      .setTimestamp();

    await sendModLog(interaction.guild, client, {
      action: 'ADMIN_SYNC_PANELS',
      moderator: interaction.user,
      details: 'Semua panel interaktif server (Lounge, Klasemen, Arena Duel) disinkronkan paksa.'
    });

    return interaction.editReply({ embeds: [embed] });
  }

  // B. REKONSILIASI ROLE TAHTA & JUARA TOP 1
  if (customId === 'admin_btn_reconcile_roles') {
    const { reconcileThroneHolders } = require('../commands/gacha');
    const { updateLiveLeaderboardChannel } = require('./dungeonBoss');

    try {
      await reconcileThroneHolders(interaction.guild, client);
      await updateLiveLeaderboardChannel(interaction.guild, client);

      const settingsData = storage.read('settings') || {};
      const gRoles = settingsData[interaction.guild.id]?.gachaRoles || {};
      const gachaData = storage.read('gacha_data') || {};
      const guildUsers = gachaData[interaction.guild.id] || {};

      let mythicCount = 0;
      let legCount = 0;
      for (const u of Object.values(guildUsers)) {
        if (u?.activeRole?.tier === 'MYTHIC') mythicCount++;
        else if (u?.activeRole?.tier === 'LEGENDARY') legCount++;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('DIAGNOSTIK & REKONSILIASI ROLE SELESAI')
        .setDescription(
          `Pemeriksaan integritas kursi tahta dan role eksklusif server berhasil diselesaikan:\n\n` +
          `• **Tahta Mythic (Maks 3 Kursi):**\n` +
          `  ↳ Role: ${gRoles.MYTHIC ? `<@&${gRoles.MYTHIC}>` : '_Belum diatur_'}\n` +
          `  ↳ Pemegang Sah: **${mythicCount}/3 Kursi**\n\n` +
          `• **Tahta Legendary (Maks 5 Kursi):**\n` +
          `  ↳ Role: ${gRoles.LEGENDARY ? `<@&${gRoles.LEGENDARY}>` : '_Belum diatur_'}\n` +
          `  ↳ Pemegang Sah: **${legCount}/5 Kursi**\n\n` +
          `• **Role Juara Top 1 Global (Champion):**\n` +
          `  ↳ Role: ${gRoles.CHAMPION ? `<@&${gRoles.CHAMPION}>` : '_Belum diatur_'}\n` +
          `  ↳ Telah disinkronkan otomatis berdasarkan formula gabungan Kelengkapan Relik + Damage Boss.\n\n` +
          `*Seluruh member yang keluar server atau kehilangan tahta telah ditertibkan.*`
        )
        .setFooter({ text: 'Admin Operations • Throne Reconcile' })
        .setTimestamp();

      await sendModLog(interaction.guild, client, {
        action: 'ADMIN_RECONCILE_ROLES',
        moderator: interaction.user,
        details: 'Audit diagnostik dan rekonsiliasi role tahta dijalankan.'
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({
        content: `❌ Gagal melakukan rekonsiliasi role: ${err.message}`
      });
    }
  }

  // C. BUKA / KUNCI PAKSA BOSS RAID (TESTING)
  if (customId === 'admin_btn_force_boss') {
    const {
      getGuildBossState,
      saveBossStorage,
      checkAndBroadcastBossSpawn,
      updateLiveLeaderboardChannel
    } = require('./dungeonBoss');
    const { updateHubPanelIfExists } = require('../commands/gacha');

    try {
      const { allData, boss } = getGuildBossState(interaction.guild.id);
      boss.forceSpawned = !boss.forceSpawned;

      if (boss.forceSpawned) {
        boss.status = 'ACTIVE';
        if (boss.currentHp <= 0) {
          boss.currentHp = boss.maxHp;
        }
        await checkAndBroadcastBossSpawn(interaction.guild, client);
      } else {
        boss.status = 'INACTIVE';
      }

      saveBossStorage(allData);
      await updateLiveLeaderboardChannel(interaction.guild, client);
      await updateHubPanelIfExists(interaction.guild, client);

      const statusText = boss.forceSpawned
        ? '🔓 **DIBUKA PAKSA (Test Mode Aktif)**\nMonster World Boss telah bangkit di Arena Duel dan siap diserang oleh party pejuang!'
        : '🔒 **DIKUNCI KEMBALI**\nBoss Raid dikembalikan ke mode jadwal reguler (Hanya buka pukul 21:00 WIB).';

      const embed = new EmbedBuilder()
        .setColor(boss.forceSpawned ? 0xED4245 : 0x57F287)
        .setTitle('KONTROL STATUS WORLD BOSS RAID')
        .setDescription(
          `${statusText}\n\n` +
          `• **Nama Boss:** **${boss.name}** [${boss.tier} RAID]\n` +
          `• **Darah Saat Ini:** **${boss.currentHp.toLocaleString('id-ID')} / ${boss.maxHp.toLocaleString('id-ID')} HP**\n` +
          `• **Pusat Tempur:** Arena Duel`
        )
        .setFooter({ text: 'Admin Operations • Boss Raid Override' })
        .setTimestamp();

      await sendModLog(interaction.guild, client, {
        action: 'ADMIN_OVERRIDE_BOSS',
        moderator: interaction.user,
        details: `Boss Raid ${boss.forceSpawned ? 'dibuka paksa' : 'dikunci kembali'} oleh admin.`
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({ content: `❌ Gagal mengatur status Boss Raid: ${err.message}` });
    }
  }

  // D. CADANGAN DATABASE INSTAN (BACKUP)
  if (customId === 'admin_btn_backup') {
    const fs = require('fs');
    const path = require('path');

    try {
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dataDir = path.join(process.cwd(), 'data');
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

      const snapshot = {
        meta: {
          timestamp: new Date().toISOString(),
          guildId: interaction.guild.id,
          guildName: interaction.guild.name,
          triggeredBy: interaction.user.tag,
          totalTables: files.length
        },
        data: {}
      };

      for (const file of files) {
        const table = file.replace('.json', '');
        snapshot.data[table] = storage.read(table);
      }

      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `snapshot_${interaction.guild.id}_${timestampStr}.json`;
      const filePath = path.join(backupDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
      const stat = fs.statSync(filePath);
      const sizeKB = (stat.size / 1024).toFixed(2);

      await storage.flushCloudSync();

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('CADANGAN DATABASE BERHASIL DIBUAT')
        .setDescription(
          `Snapshot cadangan seluruh data JSON server berhasil diarsipkan secara aman:\n\n` +
          `• **Nama Arsip:** \`${fileName}\`\n` +
          `• **Ukuran Arsip:** \`${sizeKB} KB\`\n` +
          `• **Total Database:** \`${files.length} Tabel JSON\`\n` +
          `• **Sinkronisasi Cloud:** ✅ Data telah di-flush ke Supabase Cloud Storage.\n\n` +
          `*File cadangan tersimpan di direktori server \`data/backups/\` dan siap dipulihkan kapan saja.*`
        )
        .setFooter({ text: 'Admin Operations • Database Snapshot' })
        .setTimestamp();

      await sendModLog(interaction.guild, client, {
        action: 'ADMIN_BACKUP_INSTANT',
        moderator: interaction.user,
        details: `Backup arsip: ${fileName} (${sizeKB} KB)`
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({ content: `❌ Gagal membuat cadangan database: ${err.message}` });
    }
  }

  // E. CEK KESEHATAN SISTEM BOT (HEALTH CHECK)
  if (customId === 'admin_btn_health') {
    const uptimeSec = Math.floor(process.uptime());
    const d = Math.floor(uptimeSec / 86400);
    const h = Math.floor((uptimeSec % 86400) / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    const uptimeStr = `${d > 0 ? `${d}h ` : ''}${h}j ${m}m ${s}d`;

    const mem = process.memoryUsage();
    const rssMB = (mem.rss / 1024 / 1024).toFixed(1);
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);

    const wsPing = client.ws?.ping ?? -1;
    const activeQueues = client.distube?.queues?.size || 0;

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('STATUS KESEHATAN SISTEM BOT')
      .setDescription(
        `Metrik operasional bot dalam keadaan aktif dan sehat:\n\n` +
        `• **Uptime Bot:** \`${uptimeStr}\`\n` +
        `• **WebSocket Latency:** \`${wsPing} ms\`\n` +
        `• **Penggunaan RAM (Heap):** \`${heapUsedMB} MB / ${heapTotalMB} MB\` (RSS: \`${rssMB} MB\`)\n` +
        `• **Versi Node.js:** \`${process.version}\` (${process.platform})\n` +
        `• **Total Server:** \`${client.guilds.cache.size} Guild\`\n` +
        `• **Member Ter-cache:** \`${client.users.cache.size.toLocaleString('id-ID')} Pengguna\`\n` +
        `• **Sesi Audio Musik:** \`${activeQueues} Sesi Aktif\`\n` +
        `• **Penyimpanan Cloud:** Supabase Storage Terhubung (Auto-Flush)`
      )
      .setFooter({ text: 'Admin Operations • System Diagnostics' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  return interaction.editReply({ content: 'Tindakan admin tidak dikenal.' });
}

/**
 * Handler Dropdown Menu Kategori Panduan
 */
async function handleAdminSelectCategory(interaction, client) {
  const isAuthorized = await isOwnerOrMod(interaction, client);
  if (!isAuthorized) {
    return interaction.reply({
      content: '❌ Perintah dan panduan ini hanya dapat diakses oleh **Owner Bot** atau **Administrator/Moderator** yang berwenang.',
      flags: MessageFlags.Ephemeral
    });
  }

  const categoryKey = interaction.values[0];
  const guideEmbed = buildAdminCategoryEmbed(categoryKey, interaction.guild);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_btn_back_to_hub')
      .setLabel('Kembali ke Menu Utama')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_btn_close_guide')
      .setLabel('Tutup Panduan')
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.reply({
    embeds: [guideEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Handler Modal Submit Broadcast Pengumuman Resmi
 */
async function handleAdminBroadcastModal(interaction, client) {
  const isAuthorized = await isOwnerOrMod(interaction, client);
  if (!isAuthorized) {
    return interaction.reply({
      content: '❌ Hanya administrator yang dapat menyiarkan pengumuman resmi.',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channelInput = interaction.fields.getTextInputValue('admin_bc_channel')?.trim();
  const title = interaction.fields.getTextInputValue('admin_bc_title')?.trim();
  const content = interaction.fields.getTextInputValue('admin_bc_content')?.trim();
  const pingInput = interaction.fields.getTextInputValue('admin_bc_ping')?.trim().toLowerCase();

  let targetChannel = interaction.channel;
  if (channelInput) {
    const cleanedId = channelInput.replace(/[<#>]/g, '');
    const fetched = interaction.guild.channels.cache.get(cleanedId) ||
      await interaction.guild.channels.fetch(cleanedId).catch(() => null);
    if (fetched && fetched.isTextBased()) {
      targetChannel = fetched;
    } else {
      return interaction.editReply({
        content: `❌ Channel dengan ID atau mention \`${channelInput}\` tidak ditemukan atau bukan saluran teks yang valid!`
      });
    }
  }

  let mentionContent = '';
  if (pingInput === 'everyone') {
    mentionContent = '@everyone';
  } else if (pingInput === 'here') {
    mentionContent = '@here';
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `${interaction.guild.name.toUpperCase()} • PENGUMUMAN RESMI`,
      iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(title)
    .setDescription(content)
    .setFooter({ text: `Diumumkan oleh Staf: ${interaction.user.tag || interaction.user.username}` })
    .setTimestamp();

  try {
    const sentMsg = await targetChannel.send({
      content: mentionContent || undefined,
      embeds: [embed]
    });

    await sendModLog(interaction.guild, client, {
      action: 'ADMIN_BROADCAST',
      moderator: interaction.user,
      details: `Judul: "${title}" di saluran <#${targetChannel.id}>. Mention: ${pingInput || 'none'}`
    });

    return interaction.editReply({
      content: `✅ Pengumuman resmi berhasil disiarkan ke <#${targetChannel.id}>!\n🔗 [Klik di Sini untuk Membuka Pengumuman ↗](${sentMsg.url})`
    });
  } catch (err) {
    return interaction.editReply({
      content: `❌ Gagal mengirim pengumuman ke <#${targetChannel.id}>: ${err.message}`
    });
  }
}

module.exports = {
  ADMIN_GUIDE_DATA,
  buildAdminPanelPayload,
  buildAdminCategoryEmbed,
  handleAdminButton,
  handleAdminSelectCategory,
  handleAdminBroadcastModal,
  showBroadcastModal
};
