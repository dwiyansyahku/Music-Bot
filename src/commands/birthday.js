const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const storage = require('../utils/storage');
const {
  MONTH_NAMES,
  getZodiac,
  getNextBirthdayCountdown,
  buildBirthdayAnnouncementEmbed,
  BIRTHDAY_WISHES
} = require('../utils/birthdayHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Fitur perayaan dan pengumuman ulang tahun member')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('Lihat tanggal lahir, umur, zodiak, dan hitung mundur ulang tahun member')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang ingin dilihat (default: diri sendiri)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat daftar ulang tahun member terdekat di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel khusus untuk pengumuman ucapan ulang tahun (Owner/Mod only)')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel pengumuman').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('removechannel').setDescription('Matikan pengumuman otomatis ulang tahun (Owner/Mod only)')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Uji coba kirim pengumuman ucapan ulang tahun ke channel (Owner/Mod only)')
        .addUserOption(opt => opt.setName('user').setDescription('Member yang dijadikan contoh (default: diri sendiri)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Lihat channel pengumuman ulang tahun & statistik saat ini')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // === 1. SETCHANNEL ===
    if (sub === 'setchannel') {
      if (!(await isOwnerOrMod(interaction, client))) {
        return replyNoAccessMod(interaction);
      }

      const channel = interaction.options.getChannel('channel');
      storage.saveGuildSetting(guildId, 'birthday', {
        channelId: channel.id,
        enabled: true,
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Channel Pengumuman Ulang Tahun Berhasil Diatur!')
        .setDescription(
          `Setiap hari jam **00:01 WIB**, bot akan otomatis mengirim ucapan selamat ulang tahun yang meriah ke <#${channel.id}> untuk member yang berulang tahun pada hari tersebut!\n\n` +
          `💡 **Tips:** Member dapat mengisi tanggal lahir mereka dengan menekan tombol **Edit Profile** di panel Member Card (` + '`/setcard`' + `).`
        )
        .setFooter({ text: `${interaction.guild.name} • Birthday System` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === 2. REMOVECHANNEL ===
    if (sub === 'removechannel') {
      if (!(await isOwnerOrMod(interaction, client))) {
        return replyNoAccessMod(interaction);
      }

      storage.saveGuildSetting(guildId, 'birthday', {
        channelId: null,
        enabled: false,
      });

      return interaction.reply({
        content: '🧹 **Pengumuman ulang tahun otomatis telah dinonaktifkan.**',
        flags: MessageFlags.Ephemeral
      });
    }

    // === 3. STATUS ===
    if (sub === 'status') {
      const settings = storage.read('settings');
      const bdaySetting = settings[guildId]?.birthday;
      const cardsData = storage.read('cards');
      const guildCards = cardsData[guildId] || {};

      let totalWithBday = 0;
      for (const card of Object.values(guildCards)) {
        if (card.birthdate && card.birthdate.day && card.birthdate.month) {
          totalWithBday++;
        }
      }

      const channelMention = bdaySetting?.channelId ? `<#${bdaySetting.channelId}>` : '`Belum diatur`';
      const isEnabled = bdaySetting?.enabled && bdaySetting?.channelId ? '🟢 **Aktif (00:01 WIB)**' : '🔴 **Nonaktif**';

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎂 Status Pengumuman Ulang Tahun Server')
        .addFields(
          { name: '📢 Channel Pengumuman', value: channelMention, inline: true },
          { name: '⚙️ Status Sistem', value: isEnabled, inline: true },
          { name: '👥 Member dengan Tanggal Lahir', value: `**${totalWithBday} Member**`, inline: true }
        )
        .setDescription(
          `Untuk mengatur channel pengumuman, gunakan: ` + '`/birthday setchannel channel:#channel`' + `\n` +
          `Untuk mengisi tanggal lahir, gunakan panel Member Card (` + '`/setcard`' + `).`
        )
        .setFooter({ text: `${interaction.guild.name} • Birthday System` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 4. TEST ANNOUNCEMENT ===
    if (sub === 'test') {
      if (!(await isOwnerOrMod(interaction, client))) {
        return replyNoAccessMod(interaction);
      }

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Member tidak ditemukan.', flags: MessageFlags.Ephemeral });
      }

      const settings = storage.read('settings');
      const bdaySetting = settings[guildId]?.birthday;
      const channelId = bdaySetting?.channelId;

      if (!channelId) {
        return interaction.reply({
          content: '❌ Channel pengumuman belum diatur! Gunakan `/birthday setchannel` terlebih dahulu.',
          flags: MessageFlags.Ephemeral
        });
      }

      const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!targetChannel) {
        return interaction.reply({
          content: `❌ Channel <#${channelId}> tidak dapat diakses bot.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const cardsData = storage.read('cards');
      const userCard = cardsData[guildId]?.[targetUser.id] || {};
      const birthInfo = userCard.birthdate || {
        day: new Date().getDate(),
        month: new Date().getMonth() + 1,
        formatted: `${new Date().getDate()} ${MONTH_NAMES[new Date().getMonth() + 1]}`,
        age: 20
      };

      const embed = buildBirthdayAnnouncementEmbed(targetMember, null, birthInfo, interaction.guild);

      await targetChannel.send({
        content: `🎉 **[TEST PREVIEW]** Selamat Ulang Tahun <@${targetMember.id}>! 🎂`,
        embeds: [embed]
      });

      return interaction.reply({
        content: `✅ **Pesan simulasi ulang tahun berhasil dikirim ke <#${channelId}>!**`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === 5. VIEW MEMBER BIRTHDAY ===
    if (sub === 'view') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Member tidak ditemukan.', flags: MessageFlags.Ephemeral });
      }

      const cardsData = storage.read('cards');
      const userCard = cardsData[guildId]?.[targetUser.id] || {};
      const birthdate = userCard.birthdate;

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(`🎂 Info Ulang Tahun — ${targetMember.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));

      if (birthdate && birthdate.day && birthdate.month) {
        const countdown = getNextBirthdayCountdown(birthdate.day, birthdate.month);
        const zodiac = getZodiac(birthdate.day, birthdate.month);

        embed.addFields(
          { name: '📅 Tanggal Lahir', value: `**${birthdate.formatted}**`, inline: true },
          { name: '🌟 Zodiak', value: `**${zodiac?.label || '-'}**`, inline: true }
        );

        if (birthdate.age) {
          embed.addFields({ name: '🎂 Usia Sekarang', value: `**${birthdate.age} Tahun**`, inline: true });
        }

        const countdownText = countdown.isToday
          ? '🎉 **HARI INI! SELAMAT ULANG TAHUN! 🥳**'
          : `**${countdown.daysLeft} hari lagi** (${countdown.nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})`;

        embed.addFields({ name: '⏳ Ulang Tahun Berikutnya', value: countdownText, inline: false });
      } else {
        // Fallback: Discord Account Anniversary
        const createdAt = targetUser.createdAt;
        const day = createdAt.getDate();
        const month = createdAt.getMonth() + 1;
        const year = createdAt.getFullYear();
        const countdown = getNextBirthdayCountdown(day, month);

        embed.addFields(
          { name: '📅 Tanggal Lahir Asli', value: '_Belum diisi di profil card_', inline: true },
          { name: '🤖 Discord Anniversary', value: `**${day} ${MONTH_NAMES[month]} ${year}**`, inline: true },
          { name: '⏳ Anniversary Berikutnya', value: countdown.isToday ? '🎉 **Hari Ini!**' : `**${countdown.daysLeft} hari lagi**`, inline: false }
        );
        embed.setDescription('💡 *Isi tanggal lahir aslimu lewat tombol **Edit Profile** di panel `/setcard` agar namamu otomatis dirayakan!*');
      }

      embed.setFooter({ text: `${interaction.guild.name} • Birthday Info` }).setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 6. LIST UPCOMING BIRTHDAYS ===
    if (sub === 'list') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const cardsData = storage.read('cards');
      const guildCards = cardsData[guildId] || {};
      const members = await interaction.guild.members.fetch();

      const birthdayList = [];

      for (const [userId, card] of Object.entries(guildCards)) {
        if (!card.birthdate || !card.birthdate.day || !card.birthdate.month) continue;
        const member = members.get(userId);
        if (!member || member.user.bot) continue;

        const countdown = getNextBirthdayCountdown(card.birthdate.day, card.birthdate.month);
        const zodiac = getZodiac(card.birthdate.day, card.birthdate.month);

        birthdayList.push({
          member,
          card,
          daysLeft: countdown.daysLeft,
          isToday: countdown.isToday,
          formatted: card.birthdate.formatted,
          zodiac: zodiac ? zodiac.symbol : '🎂',
          age: card.birthdate.age
        });
      }

      if (birthdayList.length === 0) {
        return interaction.editReply({
          content: 'ℹ️ **Belum ada member yang mengisi tanggal lahir.**\nMember dapat mengisi tanggal lahir di panel Member Card (`/setcard`).'
        });
      }

      // Sort by days left
      birthdayList.sort((a, b) => a.daysLeft - b.daysLeft);
      const topList = birthdayList.slice(0, 15);

      const listDescription = topList.map((item, idx) => {
        const timeStr = item.isToday
          ? '🎉 **HARI INI!**'
          : `**${item.daysLeft} hari lagi**`;
        const ageStr = item.age ? ` (${item.age} th)` : '';
        return `\`${idx + 1}.\` **${item.member.displayName}** — 📅 ${item.formatted}${ageStr} • ${item.zodiac} (${timeStr})`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(`🎂 Daftar Ulang Tahun Member Terdekat (${birthdayList.length} Terdaftar)`)
        .setDescription(listDescription)
        .setFooter({ text: `${interaction.guild.name} • Diurutkan berdasarkan hari terdekat` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
