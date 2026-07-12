const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  MessageFlags, ChannelType,
} = require('discord.js');
const { isOwnerOrMod, isBotOwner, replyNoAccessMod, updateJailVisibility } = require('../utils/helpers');
const storage = require('../utils/storage');

// ================================
// Data roast random (lucu, bukan nyakitin)
// ================================
const ROASTS = [
  (name) => `${name} itu orangnya baik banget, sampai-sampai virus aja kasihan dan nggak mau masuk ke otaknya.`,
  (name) => `Kalau ${name} jualan otak, modalnya doang yang keluar. Untungnya nggak ada.`,
  (name) => `${name} tipe orang yang nge-reply "haha" tapi mukanya datar kayak aspal.`,
  (name) => `IQ ${name} dan nomor sepatunya beda tipis \u2014 dan nggak ada yang dua digit.`,
  (name) => `${name} bukan goblok, dia cuma pikir lambat. Kayak internet 2G di basement.`,
  (name) => `Kalau ${name} lebih pintar dikit, dia bakal nyadar betapa nggak pintarnya dia.`,
  (name) => `${name} itu unik. Orang lain perlu usaha buat bikin suasana awkward, dia bisa otomatis.`,
  (name) => `Dokter bilang ${name} punya masa depan cerah. Tapi itu karena mereka belum liat skillsetnya.`,
  (name) => `${name} tipe orang yang nyalain GPS buat jalan ke kamar mandi sendiri.`,
  (name) => `${name} itu kayak WiFi: semua orang pura-pura butuh, tapi pas lag langsung pada kesel.`,
  (name) => `Kalau ${name} adalah film, judulnya pasti "2 Jam yang Nggak Bisa Di-refund."`,
  (name) => `${name} tipe orang yang kalau googling dirinya sendiri, hasilnya "Tidak ditemukan."`,
  (name) => `${name} bukan orang jahat. Dia cuma jadi motivasi orang lain buat jadi lebih baik dari dia.`,
  (name) => `Kucing ${name} lebih pintar dari ${name}. Dan ${name} nggak punya kucing.`,
  (name) => `${name} sering bilang dia multi-tasking. Padahal cuma salah fokus.`,
  (name) => `Kalau kepercayaan diri ${name} setinggi skill-nya, dia bakal jadi orang paling rendah hati di dunia.`,
  (name) => `${name} bilang dia bisa masak. Mie instan selalu jadi korbannya.`,
  (name) => `Kamus hidup ${name} ada kata "usaha" tapi nggak ada definisinya.`,
  (name) => `${name} itu kayak error 404: keberadaannya dipertanyakan.`,
  (name) => `${name} orangnya ambisius banget \u2014 terutama soal tidur dan makan.`,
  (name) => `Masa depan ${name} kayaknya cerah banget, sampai-sampai mataku silau pas ngeliat kegelapannya.`,
  (name) => `Baju ${name} modis sih, tapi sayang selera humornya masih setara angkatan kolonial.`,
  (name) => `Muka ${name} itu tenang banget, kayak HP yang baterainya tinggal 1% dan pasrah mau mati.`,
  (name) => `Otak ${name} itu barang langka, kondisinya dijamin masih mulus karena jarang banget dipakai.`,
  (name) => `Kalau kelakuan ${name} dibikin buku, judulnya pasti: Panduan Cara Menguji Kesabaran Orang Lain.`,
  (name) => `${name} tipe orang yang kalau dikasih pilihan, jawabannya selalu "terserah" padahal dia sendiri yang rewel.`,
  (name) => `Karir ${name} melesat cepat banget, terutama pas merosot ke bawah.`,
  (name) => `Keberadaan ${name} di Discord itu penting banget, kalau dia offline, persentase keheningan server langsung turun.`,
  (name) => `${name} itu pinter banget nyembunyiin bakatnya, saking pinternya sampai sekarang nggak ada yang nemu bakatnya apa.`,
  (name) => `Ketik "haha" tapi mukanya datar kayak tembok, itulah bakat akting terpendam ${name}.`,
  (name) => `Ketabahan ${name} menghadapi kenyataan hidup patut diacungi jempol, soalnya dia hidup tanpa rencana.`,
  (name) => `Pikiran ${name} itu dalam banget, tapi sayangnya isinya kosong.`,
  (name) => `Kalau ${name} jadi pahlawan super, kekuatannya pasti bikin musuh kasihan terus pulang sendiri.`,
  (name) => `Gaya bicara ${name} berbobot banget, tapi pas dicerna isinya cuma angin doang.`,
  (name) => `${name} tipe orang yang kalau nge-game kalah terus nyalahin sinyal, padahal tangannya yang emang kurang sinkron.`,
  (name) => `Jangan sedih ${name}, setidaknya kamu konsisten... konsisten bikin orang lain bingung.`,
  (name) => `Otak ${name} itu kayak browser Chrome, tab-nya kebanyakan dibuka tapi nggak ada yang loading.`,
  (name) => `Bercandaan ${name} itu garing banget, kalau dimakan renyah kayak kerupuk melempem.`,
  (name) => `Jika ${name} adalah bumbu dapur, dia pasti garam yang lupa asin.`,
  (name) => `Seandainya ${name} dapet medali emas, kategorinya pasti "Tidur Siang Paling Konsisten".`,
  (name) => `Ketampanan/kecantikan ${name} itu relatif, tapi keanehannya mutlak.`,
  (name) => `Level ketelitian ${name} itu luar biasa tinggi, sampai-sampai typo-nya aja konsisten.`,
  (name) => `${name} kalau lagi serius kelihatan pinter, sayangnya dia jarang serius.`,
  (name) => `Kalau ${name} ikutan lomba lari dari kenyataan, dia pasti juara satu.`,
  (name) => `${name} tipe orang yang kalau beli barang baru, buku panduannya langsung dibuang tapi pas rusak nangis-nangis.`,
  (name) => `Kecepatan berpikir ${name} setara dengan siput yang lagi santai sore.`,
  (name) => `Senyuman ${name} manis banget, kayak teh manis yang gulanya kebanyakan sampai bikin batuk.`,
  (name) => `Karakter ${name} di game aja punya masa depan, masa asli kamu gimana ngab?`,
  (name) => `${name} itu mandiri banget, apa-apa dibikin susah sendiri.`,
  (name) => `Selera musik ${name} bagus, tapi sayang selera bercandanya butuh update patch.`,
  (name) => `Cara kerja otak ${name} itu misterius, bahkan pemiliknya sendiri nggak paham.`,
  (name) => `Kalau ada rekor dunia buat kategori "Mikirin Hal Nggak Penting", ${name} juaranya.`,
  (name) => `Dompet ${name} itu kayak bawang, pas dibuka bawaannya pengen nangis.`,
  (name) => `${name} tipe orang yang kalau nyetir motor selalu pasang lampu sein kanan padahal belok kiri.`,
  (name) => `Karismanya ${name} itu kayak bayangan, kelihatan jelas kalau ada cahaya tapi ilang pas gelap.`,
];

// ================================
// Kalimat vonis jail random
// ================================
const JAIL_VERDICTS = [
  (name, reason) => `Hakim memutuskan: **${name}** terbukti bersalah atas tuduhan "${reason}". Langsung masuk penjara tanpa banding! 🔨`,
  (name, reason) => `Pengadilan server telah bersidang. **${name}** dinyatakan BERSALAH karena "${reason}". Selamat menikmati sel! 🏛️`,
  (name, reason) => `🚔 Polisi server berhasil menangkap **${name}**! Tuduhan: "${reason}". Tidak ada jaminan!`,
  (name, reason) => `Breaking news: **${name}** resmi dipenjara karena "${reason}". Pengacara? Nggak ada yang mau nerima kasusnya.`,
  (name, reason) => `Dengan segala pertimbangan... **${name}** dijebloskan ke dalam penjara atas kasus "${reason}". Semoga kapok! 😈`,
];

// ================================
// Nickname jail random
// ================================
const JAIL_NICKNAMES = [
  'DIHITAMKAN OLEH ATMIN'
];

const fun = {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Perintah iseng & jail untuk moderator/admin')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    // ── JAIL ──
    .addSubcommand(sub =>
      sub
        .setName('jail')
        .setDescription('Masukkan member ke penjara server')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang mau dijebloskan').setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('durasi').setDescription('Durasi penjara dalam menit (default: 10)').setRequired(false).setMinValue(1).setMaxValue(1440)
        )
        .addStringOption(opt =>
          opt.setName('alasan').setDescription('Tuduhan / alasan penjara').setRequired(false).setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('bail')
        .setDescription('Bebaskan member dari penjara lebih awal')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang mau dibebaskan').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('jailstatus')
        .setDescription('Cek status penjara seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang dicek').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('jailsetup')
        .setDescription('Setup role dan channel untuk fitur jail (Admin only)')
        .addRoleOption(opt => opt.setName('role').setDescription('Role penjara (buat dulu di server settings!)').setRequired(true))
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel text penjara').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('voice').setDescription('Channel voice penjara').addChannelTypes(ChannelType.GuildVoice).setRequired(true)
        )
    )

    // ── FUN / USILAN ──
    .addSubcommand(sub =>
      sub
        .setName('roast')
        .setDescription('Kirim roast lucu ke seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('Korban roast').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('roast_add')
        .setDescription('Tambah kalimat roast custom (gunakan {name} untuk nama target)')
        .addStringOption(opt => opt.setName('teks').setDescription('Teks kalimat roast').setRequired(true).setMaxLength(250))
    )
    .addSubcommand(sub =>
      sub
        .setName('roast_list')
        .setDescription('Lihat daftar kalimat roast custom di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('roast_remove')
        .setDescription('Hapus kalimat roast custom')
        .addIntegerOption(opt => opt.setName('index').setDescription('Nomor index kalimat (lihat di /fun roast_list)').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub
        .setName('wanted')
        .setDescription('Buat poster WANTED untuk seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('Target wanted poster').setRequired(true))
        .addStringOption(opt =>
          opt.setName('kejahatan').setDescription('Kejahatan yang dilakukan').setRequired(false).setMaxLength(150)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('rename')
        .setDescription('Ganti nickname seorang member jadi nama lucu')
        .addUserOption(opt => opt.setName('user').setDescription('Target rename').setRequired(true))
        .addStringOption(opt =>
          opt.setName('nama').setDescription('Nama baru (kosongkan untuk nama random)').setRequired(false).setMaxLength(32)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('fakequote')
        .setDescription('Kirim quote seolah-olah dari seorang member (jelas kelihatan fake!)')
        .addUserOption(opt => opt.setName('user').setDescription('Member "dikutip"').setRequired(true))
        .addStringOption(opt =>
          opt.setName('teks').setDescription('Teks quote palsu').setRequired(true).setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('say')
        .setDescription('Bot bicara atas namamu — kirim pesan sebagai bot')
        .addStringOption(opt =>
          opt.setName('pesan').setDescription('Pesan yang ingin diucapkan bot').setRequired(true).setMaxLength(500)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel tujuan (default: channel ini)').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) return replyNoAccessMod(interaction);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ─────────────────────────────────────
    // JAIL SETUP
    // ─────────────────────────────────────
    if (sub === 'jailsetup') {
      const ownerCheck = await isBotOwner(interaction, client);
      if (!ownerCheck && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Hanya **Administrator** atau **Owner Bot** yang bisa setup jail!', flags: MessageFlags.Ephemeral });
      }

      const role = interaction.options.getRole('role');
      const channel = interaction.options.getChannel('channel');
      const voiceChannel = interaction.options.getChannel('voice');

      const settings = storage.read('settings');
      if (!settings[guildId]) settings[guildId] = {};
      settings[guildId].jail = { roleId: role.id, channelId: channel.id, voiceChannelId: voiceChannel.id };
      storage.write('settings', settings);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔒 Jail System Dikonfigurasi!')
            .addFields(
              { name: '⛓️ Role Penjara', value: `<@&${role.id}>`, inline: true },
              { name: '🏛️ Channel Penjara', value: `<#${channel.id}>`, inline: true },
              { name: '🔊 Voice Penjara', value: `<#${voiceChannel.id}>`, inline: true },
            )
            .setDescription(
              '✅ Setup berhasil! Pastikan:\n' +
              '1. Role penjara punya permission **Send Messages = OFF** di semua channel normal\n' +
              '2. Role penjara punya permission **Send Messages = ON** di channel penjara\n' +
              '3. Bot punya permission **Manage Roles** dan **Move Members** di server ini\n' +
              '4. Role bot lebih tinggi dari role penjara'
            )
            .setFooter({ text: 'Gunakan /fun jail @user untuk memenjarakan member!' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ─────────────────────────────────────
    // JAIL
    // ─────────────────────────────────────
    if (sub === 'jail') {
      const settings = storage.read('settings');
      const jailConfig = settings[guildId]?.jail;

      if (!jailConfig) {
        return interaction.reply({
          content: '❌ Jail belum dikonfigurasi! Minta admin gunakan `/fun jailsetup` terlebih dahulu.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = interaction.options.getUser('user');
      const durasi = interaction.options.getInteger('durasi') ?? 10;
      const alasan = interaction.options.getString('alasan') || 'Pelanggaran tidak jelas tapi mencurigakan';

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: '❌ Lo nggak bisa jail diri sendiri! Minta orang lain aja.', flags: MessageFlags.Ephemeral });
      }
      if (targetUser.id === client.user.id) {
        return interaction.reply({ content: '❌ Kalian mau jail botnya?? 😤 Jangan coba-coba!', flags: MessageFlags.Ephemeral });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Member tidak ditemukan!', flags: MessageFlags.Ephemeral });
      }

      const jailRole = interaction.guild.roles.cache.get(jailConfig.roleId);
      const jailChannel = interaction.guild.channels.cache.get(jailConfig.channelId);

      if (!jailRole) return interaction.reply({ content: '❌ Role penjara tidak ditemukan! Cek konfigurasi dengan `/fun jailsetup`.', flags: MessageFlags.Ephemeral });
      if (!jailChannel) return interaction.reply({ content: '❌ Channel penjara tidak ditemukan!', flags: MessageFlags.Ephemeral });

      // Simpan data asli member sebelum di-jail
      const originalNick = targetMember.nickname || null;
      const originalRoles = targetMember.roles.cache
        .filter(r => r.id !== interaction.guild.id) // hapus @everyone
        .map(r => r.id);

      const jailData = storage.read('jail');
      if (!jailData[guildId]) jailData[guildId] = {};

      if (jailData[guildId][targetUser.id]) {
        return interaction.reply({ content: `❌ <@${targetUser.id}> sudah ada di penjara!`, flags: MessageFlags.Ephemeral });
      }

      // 1. Tarik ke voice channel penjara DULUAN jika dia ada di voice channel mana pun
      let originalVoiceChannelId = null;
      if (targetMember.voice.channelId) {
        originalVoiceChannelId = targetMember.voice.channelId;
        if (jailConfig.voiceChannelId) {
          await targetMember.voice.setChannel(jailConfig.voiceChannelId).catch(err => {
            console.error(`[Jail] Gagal memindahkan ${targetUser.tag} ke voice penjara:`, err.message);
          });
        }
      }

      // 2. Baru ubah role
      let roleChangeSuccess = true;
      try {
        // Hapus semua role, kasih role penjara
        await targetMember.roles.set([jailRole.id]);
      } catch (err) {
        roleChangeSuccess = false;
        console.warn(`[Jail] Gagal mengubah role untuk ${targetUser.tag} karena hirarki role Discord:`, err.message);
      }

      // 3. Ganti nickname
      const randomNick = JAIL_NICKNAMES[Math.floor(Math.random() * JAIL_NICKNAMES.length)];
      await targetMember.setNickname(randomNick).catch(() => { });

      // Simpan data jail ke storage
      const releaseTime = Date.now() + durasi * 60 * 1000;
      jailData[guildId][targetUser.id] = {
        originalRoles,
        originalNick,
        originalVoiceChannelId, // simpan ID voice channel asli!
        releaseTime,
        reason: alasan,
        jailedBy: interaction.user.tag,
        roleChangeSuccess, // simpan status keberhasilan ubah role
      };
      storage.write('jail', jailData);
      await updateJailVisibility(interaction.guild);

      // Verdict random
      const verdict = JAIL_VERDICTS[Math.floor(Math.random() * JAIL_VERDICTS.length)];

      // Kirim ke channel jail
      const jailEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 NARAPIDANA BARU MASUK!')
        .setDescription(verdict(targetUser.username, alasan))
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: '⏱️ Masa Tahanan', value: `**${durasi} menit**`, inline: true },
          { name: '🔓 Bebas Pada', value: `<t:${Math.floor(releaseTime / 1000)}:R>`, inline: true },
          { name: '👮 Hakim', value: interaction.user.tag, inline: true },
        )
        .setFooter({ text: '🏛️ Pengadilan Server • Keputusan hakim bersifat final!' })
        .setTimestamp();

      await jailChannel.send({
        content: `🚔 <@${targetUser.id}> selamat datang di penjara! Kamu bisa ngobrol di sini sampai masa tahananmu habis.`,
        embeds: [jailEmbed],
      });

      // Deskripsi pengumuman jail
      let announceDescription = `<@${targetUser.id}> telah dijebloskan ke penjara!\n**Tuduhan:** ${alasan}\n**Bebas:** <t:${Math.floor(releaseTime / 1000)}:R>`;
      if (!roleChangeSuccess) {
        announceDescription += `\n\n⚠️ *Catatan: Bot tidak punya izin mengubah role target (hirarki lebih tinggi), namun status jail & voice jail tetap aktif!*`;
      }

      // Umumkan di channel saat ini
      const announceEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🚨 PENANGKAPAN BERHASIL!')
        .setDescription(announceDescription)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Dijebloskan oleh ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [announceEmbed] });

      // Auto-release setelah durasi
      setTimeout(async () => {
        try {
          const currentJailData = storage.read('jail');
          if (!currentJailData[guildId]?.[targetUser.id]) return; // Sudah dibebaskan manual

          const memberToFree = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
          if (memberToFree) {
            await memberToFree.roles.set(currentJailData[guildId][targetUser.id].originalRoles || []).catch(() => { });
            await memberToFree.setNickname(currentJailData[guildId][targetUser.id].originalNick || null).catch(() => { });
            // Kembalikan ke voice channel asal jika ada, jika tidak ada/tidak valid putuskan koneksi voice
            const settings = storage.read('settings');
            const jailConfig = settings[guildId]?.jail;
            const data = currentJailData[guildId][targetUser.id];
            if (memberToFree.voice.channelId === jailConfig?.voiceChannelId) {
              let movedBack = false;
              if (data.originalVoiceChannelId) {
                await memberToFree.voice.setChannel(data.originalVoiceChannelId)
                  .then(() => { movedBack = true; })
                  .catch(() => {});
              }
              if (!movedBack) {
                await memberToFree.voice.disconnect('Bebas dari penjara!').catch(() => { });
              }
            }
          }
          delete currentJailData[guildId][targetUser.id];
          storage.write('jail', currentJailData);
          await updateJailVisibility(interaction.guild);

          const freeEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🔓 NARAPIDANA DIBEBASKAN!')
            .setDescription(`<@${targetUser.id}> telah menyelesaikan masa tahanannya dan resmi bebas! Semoga kapok ya~ 😄`)
            .setFooter({ text: '🏛️ Pengadilan Server' })
            .setTimestamp();

          await jailChannel.send({ content: `🎉 <@${targetUser.id}> kamu bebas!`, embeds: [freeEmbed] });
        } catch (err) {
          console.error('[Jail] Auto-release error:', err.message);
        }
      }, durasi * 60 * 1000);

      return;
    }

    // ─────────────────────────────────────
    // BAIL
    // ─────────────────────────────────────
    if (sub === 'bail') {
      const targetUser = interaction.options.getUser('user');
      const jailData = storage.read('jail');

      if (!jailData[guildId]?.[targetUser.id]) {
        return interaction.reply({ content: `❌ <@${targetUser.id}> tidak sedang dipenjara!`, flags: MessageFlags.Ephemeral });
      }

      const data = jailData[guildId][targetUser.id];
      const settings = storage.read('settings');
      const jailConfig = settings[guildId]?.jail;
      const jailChannelId = jailConfig?.channelId;

      const memberToFree = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (memberToFree) {
        await memberToFree.roles.set(data.originalRoles || []).catch(() => { });
        await memberToFree.setNickname(data.originalNick || null).catch(() => { });

        // Kembalikan ke voice channel asal jika ada, jika tidak ada/tidak valid putuskan koneksi voice
        if (memberToFree.voice.channelId === jailConfig?.voiceChannelId) {
          let movedBack = false;
          if (data.originalVoiceChannelId) {
            await memberToFree.voice.setChannel(data.originalVoiceChannelId)
              .then(() => { movedBack = true; })
              .catch(() => {});
          }
          if (!movedBack) {
            await memberToFree.voice.disconnect('Bebas dari penjara!').catch(() => { });
          }
        }
      }

      delete jailData[guildId][targetUser.id];
      storage.write('jail', jailData);
      await updateJailVisibility(interaction.guild);

      const freeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🔓 BAIL DIKABULKAN!')
        .setDescription(`<@${targetUser.id}> dibebaskan lebih awal oleh **${interaction.user.tag}**! Beruntung banget nih~ 🍀`)
        .setTimestamp();

      if (jailChannelId) {
        const jailChannel = interaction.guild.channels.cache.get(jailChannelId);
        if (jailChannel) await jailChannel.send({ embeds: [freeEmbed] }).catch(() => { });
      }

      return interaction.reply({
        content: `✅ <@${targetUser.id}> berhasil dibebaskan dari penjara!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ─────────────────────────────────────
    // JAIL STATUS
    // ─────────────────────────────────────
    if (sub === 'jailstatus') {
      const targetUser = interaction.options.getUser('user');
      const jailData = storage.read('jail');
      const data = jailData[guildId]?.[targetUser.id];

      if (!data) {
        return interaction.reply({
          content: `✅ <@${targetUser.id}> tidak sedang dipenjara. Member baik-baik aja! 😇`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🔒 Status Penjara')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 Narapidana', value: `<@${targetUser.id}>`, inline: true },
          { name: '📋 Tuduhan', value: data.reason, inline: true },
          { name: '👮 Dipenjara Oleh', value: data.jailedBy, inline: true },
          { name: '🔓 Bebas Pada', value: `<t:${Math.floor(data.releaseTime / 1000)}:R>`, inline: true },
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ─────────────────────────────────────
    // ROAST
    // ─────────────────────────────────────
    if (sub === 'roast') {
      const targetUser = interaction.options.getUser('user');

      if (targetUser.id === client.user.id) {
        return interaction.reply({
          content: `🤡 Coba lo roast bot? Nice try. Sini aku balik: lo itu orang yang nge-roast bot Discord jam ${new Date().getHours()} pagi/malem. Siapa yang perlu di-roast sekarang?`,
        });
      }

      // Cari roast dari custom roasts
      const settings = storage.read('settings');
      const customRoasts = settings[guildId]?.customRoasts || [];
      let roastText = '';

      if (customRoasts.length > 0) {
        const rawRoast = customRoasts[Math.floor(Math.random() * customRoasts.length)];
        roastText = rawRoast.replace(/{name}/g, targetUser.username);
      } else {
        const roastFn = ROASTS[Math.floor(Math.random() * ROASTS.length)];
        roastText = roastFn(targetUser.username);
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🔥 ROAST SESSION!')
        .setDescription(`<@${targetUser.id}>\n\n*"${roastText}"*`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Disponsori oleh ${interaction.user.tag} • Ini cuma bercanda ya!`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'roast_add') {
      const teks = interaction.options.getString('teks');
      const settings = storage.read('settings');
      if (!settings[guildId]) settings[guildId] = {};
      if (!settings[guildId].customRoasts) settings[guildId].customRoasts = [];

      settings[guildId].customRoasts.push(teks);
      storage.write('settings', settings);

      return interaction.reply({
        content: `✅ Berhasil menambahkan kalimat roast custom baru!\n> *"${teks}"*`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'roast_list') {
      const settings = storage.read('settings');
      const customRoasts = settings[guildId]?.customRoasts || [];

      if (customRoasts.length === 0) {
        return interaction.reply({
          content: '📋 Belum ada kalimat roast custom di server ini. Gunakan `/fun roast_add` untuk menambahkan!',
          flags: MessageFlags.Ephemeral
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('📋 Daftar Roast Custom Server')
        .setDescription(
          customRoasts.map((r, i) => `**${i + 1}.** ${r}`).join('\n')
        )
        .setFooter({ text: 'Gunakan /fun roast_remove <index> untuk menghapus.' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'roast_remove') {
      const index = interaction.options.getInteger('index') - 1; // Konversi ke 0-indexed
      const settings = storage.read('settings');
      const customRoasts = settings[guildId]?.customRoasts || [];

      if (index < 0 || index >= customRoasts.length) {
        return interaction.reply({
          content: `❌ Nomor index \`${index + 1}\` tidak valid! Silakan cek daftar dengan \`/fun roast_list\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const removed = customRoasts.splice(index, 1)[0];
      settings[guildId].customRoasts = customRoasts;
      storage.write('settings', settings);

      return interaction.reply({
        content: `✅ Berhasil menghapus kalimat roast:\n> *"${removed}"*`,
        flags: MessageFlags.Ephemeral
      });
    }

    // ─────────────────────────────────────
    // WANTED
    // ─────────────────────────────────────
    if (sub === 'wanted') {
      const targetUser = interaction.options.getUser('user');
      const kejahatan = interaction.options.getString('kejahatan') || 'Kejahatan yang terlalu memalukan untuk disebutkan';

      const rewards = ['500 koin server', '1 bungkus mie instan', '1 pujian dari admin', 'Satu jabat tangan virtual', '69 karung semangka'];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

      const embed = new EmbedBuilder()
        .setColor(0xFFD93D)
        .setTitle('🤠 ─── W A N T E D ───')
        .setDescription(
          `**DEAD OR ALIVE**\n\n` +
          `👤 **${targetUser.username}**\n` +
          `*(${targetUser.tag})*\n\n` +
          `**KEJAHATAN:**\n> ${kejahatan}\n\n` +
          `**HADIAH PENANGKAPAN:**\n> 💰 ${randomReward}\n\n` +
          `*Jika melihat orang ini, hubungi moderator server segera!*`
        )
        .setImage(targetUser.displayAvatarURL({ dynamic: false, size: 256, extension: 'png' }))
        .setFooter({ text: `Diumumkan oleh ${interaction.user.tag} • Pengadilan Server`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────
    // RENAME
    // ─────────────────────────────────────
    if (sub === 'rename') {
      const targetUser = interaction.options.getUser('user');
      const namaCustom = interaction.options.getString('nama');

      const funnyNames = [
        '🤡 Si Badut Malam', '🐧 Penguin Kesasar', '🥔 Kentang Galau',
        '🦆 Bebek Bingung', '🌵 Kaktus Baper', '🍜 Mie Ayam Basi',
        '🐒 Monyet Ngoding', '🦄 Unicorn Toxic', '🥦 Brokoli Emosional',
        '🐸 Katak Oversharing', '🌮 Taco Bell Indonesia', '🤖 Robot Gabut',
        '🧀 Keju Leleh', '🦖 Dino Abad 21', '🥸 Detektif Tidur',
      ];

      const namaFinal = namaCustom || funnyNames[Math.floor(Math.random() * funnyNames.length)];
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) return interaction.reply({ content: '❌ Member tidak ditemukan!', flags: MessageFlags.Ephemeral });

      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ Kamu tidak bisa rename member dengan role lebih tinggi!', flags: MessageFlags.Ephemeral });
      }

      const oldNick = targetMember.displayName;
      try {
        await targetMember.setNickname(namaFinal);
      } catch {
        return interaction.reply({ content: '❌ Bot tidak bisa ganti nickname member ini (role terlalu tinggi).', flags: MessageFlags.Ephemeral });
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF8C42)
            .setTitle('✏️ Nickname Diganti!')
            .addFields(
              { name: '👤 Target', value: `<@${targetUser.id}>`, inline: true },
              { name: '📛 Nama Lama', value: `\`${oldNick}\``, inline: true },
              { name: '✨ Nama Baru', value: `\`${namaFinal}\``, inline: true },
            )
            .setFooter({ text: `Diubah oleh ${interaction.user.tag}` })
            .setTimestamp(),
        ],
      });
    }

    // ─────────────────────────────────────
    // FAKE QUOTE
    // ─────────────────────────────────────
    if (sub === 'fakequote') {
      const targetUser = interaction.options.getUser('user');
      const teks = interaction.options.getString('teks');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: targetUser.username,
          iconURL: targetUser.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(`*"${teks}"*`)
        .setFooter({ text: '⚠️ FAKE QUOTE — Dibuat oleh ' + interaction.user.tag + ' | Orang ini mungkin tidak pernah berkata ini.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ─────────────────────────────────────
    // SAY (bot bicara)
    // ─────────────────────────────────────
    if (sub === 'say') {
      const pesan = interaction.options.getString('pesan');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      try {
        await targetChannel.send(pesan);
        return interaction.reply({ content: `✅ Pesan berhasil dikirim ke <#${targetChannel.id}>!`, flags: MessageFlags.Ephemeral });
      } catch {
        return interaction.reply({ content: '❌ Bot tidak bisa kirim pesan ke channel itu.', flags: MessageFlags.Ephemeral });
      }
    }
  },
};

module.exports = fun;
