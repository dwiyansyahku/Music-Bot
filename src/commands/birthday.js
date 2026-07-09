const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
} = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const storage = require('../utils/storage');

// Daftar ucapan ulang tahun random
const BIRTHDAY_WISHES = [
  (name) => `🎂 **Selamat ulang tahun, ${name}!** Semoga hari ini jadi hari yang paling berkesan buat lo~ 🎉`,
  (name) => `🥳 **Happy Birthday, ${name}!** Semoga umur panjang, sehat selalu, dan mimpi-mimpi lo terwujud! ✨`,
  (name) => `🎁 **Aaaa selamat ulang tahun ${name}!!** Makin cuan, makin bahagia, makin kece ya~ 🔥`,
  (name) => `🎊 **Happy Birthday ${name}!** Semoga hari ini penuh kebahagiaan dan semua hal baik datang buat lo! 🌟`,
  (name) => `🍰 **Wuih ulang tahun nih ${name}!** Semoga tahun ini lebih seru dari tahun kemarin! Gaskeun~ 🚀`,
  (name) => `💫 **Selamat Ulang Tahun, ${name}!** May all your dreams and wishes come true. Have an amazing day! 🎶`,
  (name) => `🎈 **Happy B-Day ${name}!** Lo makin tua tapi tetep muda di hati. Keep shining! ⭐`,
  (name) => `🌟 **Selamat ulang tahun ${name}~** Semoga selalu dalam lindungan-Nya dan rezeki lancar terus ya! 🤲`,
];

const birthday = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Fitur pengingat ulang tahun member server')
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Daftarkan tanggal ulang tahun kamu')
        .addIntegerOption(opt =>
          opt.setName('hari').setDescription('Tanggal (1-31)').setRequired(true).setMinValue(1).setMaxValue(31)
        )
        .addIntegerOption(opt =>
          opt.setName('bulan').setDescription('Bulan (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Hapus data ulang tahun kamu dari server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Lihat ulang tahun seorang member')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang mau dilihat').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat daftar semua ulang tahun di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel untuk pengumuman ulang tahun (Owner only)')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel pengumuman ulang tahun').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // === SET ===
    if (sub === 'set') {
      const hari = interaction.options.getInteger('hari');
      const bulan = interaction.options.getInteger('bulan');

      // Validasi tanggal
      const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (hari > daysInMonth[bulan]) {
        return interaction.reply({
          content: `❌ Tanggal ${hari} tidak valid untuk bulan ${bulan}!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const birthdays = storage.read('birthdays');
      if (!birthdays[guildId]) birthdays[guildId] = {};
      birthdays[guildId][userId] = { day: hari, month: bulan, name: interaction.user.username };
      storage.write('birthdays', birthdays);

      const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🎂 Ulang Tahun Tersimpan!')
            .setDescription(`Tanggal ultah kamu **${hari} ${MONTHS[bulan]}** berhasil disimpan! Bot akan mengucapkan selamat ulang tahun ke kamu secara otomatis~ 🎉`)
            .setFooter({ text: 'Gunakan /birthday remove untuk menghapus data.' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === REMOVE ===
    if (sub === 'remove') {
      const birthdays = storage.read('birthdays');
      if (!birthdays[guildId]?.[userId]) {
        return interaction.reply({ content: '❌ Kamu belum mendaftarkan ulang tahun di server ini!', flags: MessageFlags.Ephemeral });
      }
      delete birthdays[guildId][userId];
      storage.write('birthdays', birthdays);
      return interaction.reply({ content: '✅ Data ulang tahun kamu berhasil dihapus.', flags: MessageFlags.Ephemeral });
    }

    // === VIEW ===
    if (sub === 'view') {
      const targetUser = interaction.options.getUser('user');
      const birthdays = storage.read('birthdays');
      const data = birthdays[guildId]?.[targetUser.id];

      if (!data) {
        return interaction.reply({
          content: `❌ <@${targetUser.id}> belum mendaftarkan ulang tahunnya di server ini.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      // Hitung berapa hari lagi
      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const nextBday = new Date(wibNow.getUTCFullYear(), data.month - 1, data.day);
      if (nextBday < wibNow) nextBday.setFullYear(nextBday.getFullYear() + 1);
      const daysLeft = Math.ceil((nextBday - wibNow) / (1000 * 60 * 60 * 24));

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle(`🎂 Ulang Tahun — ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '📅 Tanggal', value: `**${data.day} ${MONTHS[data.month]}**`, inline: true },
              { name: '⏳ Countdown', value: daysLeft === 0 ? '🎉 **HARI INI!**' : `**${daysLeft} hari lagi**`, inline: true }
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === LIST ===
    if (sub === 'list') {
      const birthdays = storage.read('birthdays');
      const list = Object.entries(birthdays[guildId] || {});

      if (list.length === 0) {
        return interaction.reply({ content: '📋 Belum ada member yang mendaftarkan ulang tahunnya di server ini.', flags: MessageFlags.Ephemeral });
      }

      const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const sorted = list.sort((a, b) => {
        if (a[1].month !== b[1].month) return a[1].month - b[1].month;
        return a[1].day - b[1].day;
      });

      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎂 Daftar Ulang Tahun Server')
        .setDescription(
          sorted.map(([uid, d]) => `🎈 <@${uid}> — **${d.day} ${MONTHS[d.month]}**`).join('\n')
        )
        .setFooter({ text: `Total ${sorted.length} member terdaftar` });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === SET CHANNEL ===
    if (sub === 'setchannel') {
      const isOwner = await isBotOwner(interaction, client);
      if (!isOwner) {
        return interaction.reply({ content: '❌ Hanya Owner bot yang bisa mengatur channel!', flags: MessageFlags.Ephemeral });
      }

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
            .setDescription(`Pengumuman ulang tahun akan dikirim ke <#${channel.id}>. Scheduler berjalan setiap hari pukul **00:01 WIB**.`)
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

module.exports = { birthday, BIRTHDAY_WISHES };
