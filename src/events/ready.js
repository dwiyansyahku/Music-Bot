const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`\n🎵 ================================`);
    console.log(`✅ Bot online sebagai: ${client.user.tag}`);
    console.log(`📊 Melayani ${client.guilds.cache.size} server`);
    console.log(`🎵 ================================\n`);

    // Set activity
    const activities = [
      { name: '🎵 qp [lagu] untuk memutar musik!', type: ActivityType.Playing },
      { name: '🎶 qhelp untuk bantuan', type: ActivityType.Listening },
      { name: `${client.guilds.cache.size} server`, type: ActivityType.Watching },
    ];

    let i = 0;
    setInterval(() => {
      client.user.setActivity(activities[i % activities.length].name, {
        type: activities[i % activities.length].type,
      });
      i++;
    }, 15000);
  },
};
