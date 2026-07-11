const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const storage = require('../utils/storage');

// Daftar ucapan ulang tahun akun Discord random
const BIRTHDAY_WISHES = [
  (name, age) => `🎂 **Selamat ulang tahun akun Discord yang ke-${age}, ${name}!** Semoga awet terus akunnya dan nggak kena banned~ 🎉`,
  (name, age) => `🥳 **Happy Discord Anniversary yang ke-${age}, ${name}!** Udah ${age} tahun nemenin kita di jagat raya Discord! ✨`,
  (name, age) => `🎁 **Aaaa hari jadi akun Discord-mu yang ke-${age} nih ${name}!!** Makin sepuh aja nih akunnya, gokil! 🔥`,
  (name, age) => `🎊 **Happy Cake Day yang ke-${age} ${name}!** Semoga harimu menyenangkan dan lencana active developer-mu tetap aman! 🌟`,
  (name, age) => `🍰 **Wuih akun Discord ${name} berumur ${age} tahun hari ini!** Waktunya tiup lilin virtual! 🕯️ Gaskeun~ 🚀`,
  (name, age) => `💫 **Selamat Ulang Tahun Akun yang ke-${age}, ${name}!** Terima kasih udah setia pake Discord dan ngeramein server ini! 🎶`,
  (name, age) => `🎈 **Happy Discord B-Day yang ke-${age} ${name}!** Tambah sepuh, tambah bijak, atau malah tambah toxic? Canda sepuh! ⭐`,
  (name, age) => `🦖 **Udah ${age} tahun akun lo berdiri, ${name}!** Zaman dinosaurus dulu akun lo udah bikin server belum? 🤣`,
  (name, age) => `🔥 **Happy anniversary akun ke-${age}, ${name}!** Gila, udah ${age} tahun lo scrolling Discord tanpa henti. Mandi woi! 🧼`,
  (name, age) => `🕯️ **HBD akun ke-${age} ya ${name}!** Semoga status Custom Status-mu makin keren dan nggak galau mulu.`,
  (name, age) => `🍿 **Happy Discord B-day ke-${age} ${name}!** Usia akun bertambah, tapi kebiasaan begadangnya tetep konsisten. Mantap!`,
  (name, age) => `🤖 **Selamat hari jadi ke-${age} buat akun Discord ${name}!** Ciri-ciri sepuh server nih, sungkem dulu 🙇‍♂️`,
  (name, age) => `⭐ **Happy Cake Day ke-${age} ${name}!** Udah ${age} tahun lo jadi bagian dari drama dan canda tawa di Discord. Cheers! 🥂`,
  (name, age) => `👾 **Selamat ${age} tahun nge-Discord, ${name}!** Semoga hobi ping @everyone lo berkurang seiring bertambahnya umur akun.`,
  (name, age) => `🏆 **Happy Anniversary ke-${age} ${name}!** Prestasi terbesar akun ini: survive ${age} tahun tanpa kena report masal.`,
  (name, age) => `🛸 **Warp speed! Akun ${name} udah ${age} tahun!** Udah pantas dapat gelar Duta Discord Server nih.`,
  (name, age) => `🌈 **Happy B-day akun ke-${age} ${name}!** Semoga koneksi internetmu se-hijau ping Discord hari ini! 🟢`,
  (name, age) => `🍕 **Selamat ulang tahun akun yang ke-${age}, ${name}!** Traktirannya ditunggu dalam bentuk Nitro ya! (Canda Nitro)`,
  (name, age) => `🎉 **Happy Birthday ke-${age} untuk akun ${name}!** Udah ${age} tahun bertahan dengan avatar anime. Konsisten sekali!`,
  (name, age) => `🎸 **Rock on! Akun ${name} genap ${age} tahun hari ini!** Semoga makin sering masuk voice channel dan bagi-bagi info seru.`,
  (name, age) => `📱 **Happy Discord Anniversary ke-${age} ${name}!** HP ganti berkali-kali, akun Discord tetep satu. Setia banget!`,
  (name, age) => `🎒 **Selamat ${age} tahun akun ${name}!** Udah ${age} tahun jadi penonton setia di chatroom. Kapan mulai ngetik rame? 😂`,
  (name, age) => `🎭 **Happy Cake Day ke-${age} ${name}!** Semoga lencana-lencana di profilmu bertambah banyak tahun ini!`,
  (name, age) => `🌊 **Selamat ulang tahun akun ke-${age} ${name}!** Semoga rezekimu mengalir deras seperti chat server pas lagi rame!`,
  (name, age) => `🎯 **Happy ${age} Years on Discord, ${name}!** Tembakan jitu! Akun lo resmi makin sepuh hari ini.`,
  (name, age) => `🛡️ **Selamat hari jadi akun ke-${age} ${name}!** Akun legendaris yang selalu ada saat dibutuhkan (pas gibah terutama).`,
  (name, age) => `🪐 **Happy B-day akun ke-${age} ${name}!** Semoga hari-hari nge-Discord lo makin seru dan penuh jokes lucu.`,
  (name, age) => `☕ **Selamat ulang tahun akun ke-${age} ${name}!** Santai dulu sambil ngopi, rayakan hari pembuatan akun setiamu!`,
  (name, age) => `💎 **Happy Discord Anniversary ke-${age} untuk ${name}!** Akun berharga yang selalu menghiasi server ini. Have a blast!`,
  (name, age) => `👑 **All hail sepuh! Akun ${name} berumur ${age} tahun hari ini!** Selamat merayakan hari jadinya ya!`,
];

const birthday = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Fitur ulang tahun akun Discord (Discord Anniversary) member')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Lihat tanggal pembuatan akun Discord & hari jadinya')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang mau dilihat').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat daftar ulang tahun akun Discord terdekat di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel untuk pengumuman ulang tahun akun Discord (Owner only)')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel pengumuman').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // === VIEW ===
    if (sub === 'view') {
      const targetUser = interaction.options.getUser('user');
      const createdAt = targetUser.createdAt;
      const day = createdAt.getDate();
      const month = createdAt.getMonth() + 1;
      const year = createdAt.getFullYear();

      // Hitung umur akun
      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      let age = wibNow.getUTCFullYear() - year;

      // Tentukan anniversary berikutnya
      let nextAnniversary = new Date(wibNow.getUTCFullYear(), month - 1, day);
      if (nextAnniversary < wibNow) {
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
      } else {
        // Jika belum lewat di tahun ini, kurangi umur 1 untuk umur saat ini (belum genap anniversary tahun ini)
        age = Math.max(0, age - 1);
      }
      
      const nextAge = wibNow.getUTCFullYear() - year + (nextAnniversary.getUTCFullYear() > wibNow.getUTCFullYear() ? 0 : 0);
      // Hitung sisa hari
      const daysLeft = Math.ceil((nextAnniversary - wibNow) / (1000 * 60 * 60 * 24));

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(`🎂 Discord Anniversary — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '📅 Tanggal Dibuat', value: `**${day} ${MONTHS[month]} ${year}**`, inline: true },
              { name: '⏳ Umur Akun Sekarang', value: `**${age} Tahun**`, inline: true },
              { name: '🎉 Anniversary Berikutnya', value: daysLeft === 0 ? `🎉 **HARI INI! (Ke-${age + 1} Tahun)**` : `**${daysLeft} hari lagi (Ke-${age + 1} Tahun)**`, inline: false }
            )
            .setFooter({ text: `Dibuat pada: ${createdAt.toLocaleDateString('id-ID')}` }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === LIST ===
    if (sub === 'list') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Fetch semua member untuk dapetin data valid
      const members = await interaction.guild.members.fetch();
      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      const mapped = members
        .filter(m => !m.user.bot)
        .map(m => {
          const createdAt = m.user.createdAt;
          const day = createdAt.getDate();
          const month = createdAt.getMonth() + 1;
          
          let nextAnniversary = new Date(wibNow.getUTCFullYear(), month - 1, day);
          if (nextAnniversary < wibNow) {
            nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
          }
          const daysLeft = Math.ceil((nextAnniversary - wibNow) / (1000 * 60 * 60 * 24));
          const age = nextAnniversary.getFullYear() - createdAt.getFullYear();

          return {
            member: m,
            daysLeft,
            age,
            dateString: `${day} ${MONTHS[month]}`,
          };
        });

      // Urutkan berdasarkan yang paling dekat (daysLeft terkecil)
      const sorted = mapped.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('📅 10 Discord Anniversary Terdekat Server')
        .setDescription(
          sorted.map((item, i) => 
            `**${i + 1}.** ${item.member.user.username} (<@${item.member.id}>)\n` +
            `> Tanggal: **${item.dateString}** • **${item.daysLeft === 0 ? '🎉 HARI INI!' : item.daysLeft + ' hari lagi'}** (Umur Akun: ${item.age} Tahun)`
          ).join('\n\n')
        )
        .setFooter({ text: 'Dihitung berdasarkan tanggal pembuatan akun Discord member.' });

      return interaction.editReply({ embeds: [embed] });
    }

    // === SET CHANNEL ===
    if (sub === 'setchannel') {
      if (!await isOwnerOrMod(interaction, client)) return replyNoAccessMod(interaction);

      const channel = interaction.options.getChannel('channel');
      const guildSettings = storage.read('settings');
      if (!guildSettings[guildId]) guildSettings[guildId] = {};
      if (!guildSettings[guildId].birthday) guildSettings[guildId].birthday = {};
      guildSettings[guildId].birthday.channelId = channel.id;
      storage.write('settings', guildSettings);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎂 Channel Ulang Tahun Diatur!')
            .setDescription(`Pengumuman ulang tahun akun Discord akan dikirim otomatis ke <#${channel.id}> setiap hari pukul **00:01 WIB** jika ada yang merayakannya.`)
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

module.exports = { birthday, BIRTHDAY_WISHES };
