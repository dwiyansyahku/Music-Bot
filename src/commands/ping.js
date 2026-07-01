const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latency bot & status — juga digunakan untuk mendapatkan Discord Active Developer Badge! 🏅'),

  async execute(interaction, client) {
    // Defer to measure actual round-trip latency
    await interaction.deferReply();

    const sent = await interaction.fetchReply();
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const uptimeSeconds = Math.floor(client.uptime / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${hours}j ${minutes}m ${seconds}d`;

    // Status indicator based on latency
    const getLatencyStatus = (ms) => {
      if (ms < 100) return '🟢';
      if (ms < 200) return '🟡';
      return '🔴';
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏓 Pong!')
      .setDescription('Bot aktif dan berjalan normal.')
      .addFields(
        {
          name: '📡 Latency',
          value: [
            `${getLatencyStatus(roundTrip)} Round-trip: **${roundTrip}ms**`,
            `${getLatencyStatus(apiLatency)} API Discord: **${apiLatency}ms**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '⏱️ Uptime',
          value: `**${uptimeStr}**`,
          inline: true,
        },
        {
          name: '🏅 Active Developer Badge',
          value: [
            'Kamu sudah menggunakan slash command ini!',
            'Klaim badge kamu di:',
            '👉 [discord.com/developers/active-developer](https://discord.com/developers/active-developer)',
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: `Discord Music Bot • ${client.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
