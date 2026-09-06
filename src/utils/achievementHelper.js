const storage = require('./storage');
const { getVoiceStats } = require('./voiceTracker');

/**
 * Master Achievements & Badges List (Clean, Aesthetic & Elegant)
 */
const MASTER_ACHIEVEMENTS = [
  {
    id: 'card_creator',
    name: 'Verified Resident',
    tag: '✦',
    desc: 'Terdaftar secara resmi di direktori member server',
    category: 'Profile',
    check: (stats) => stats.hasCard
  },
  {
    id: 'banner_artist',
    name: 'Visual Curator',
    tag: '✦',
    desc: 'Menghiasi profil dengan custom visual banner',
    category: 'Profile',
    check: (stats) => stats.hasBanner
  },
  {
    id: 'birthday_star',
    name: 'Star Born',
    tag: '✦',
    desc: 'Mencantumkan tanggal kelahiran pada profil',
    category: 'Profile',
    check: (stats) => stats.hasBirthday
  },
  {
    id: 'social_star',
    name: 'Distinguished',
    tag: '✦',
    desc: 'Mendapatkan apresiasi Like dan Respect dari komunitas',
    category: 'Social',
    check: (stats) => stats.totalReactions >= 3
  },
  {
    id: 'voice_starter',
    name: 'Voice Initiate',
    tag: '◈',
    desc: 'Menghabiskan akumulasi 1 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 60
  },
  {
    id: 'voice_warrior',
    name: 'Constant Speaker',
    tag: '◈',
    desc: 'Menghabiskan akumulasi 10 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 600
  },
  {
    id: 'voice_legend',
    name: 'Pillar of Voice',
    tag: '◈',
    desc: 'Menghabiskan akumulasi 50 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 3000
  },
  {
    id: 'gacha_first',
    name: 'Fortune Seeker',
    tag: '✧',
    desc: 'Membuka misteri harian untuk pertama kali',
    category: 'Relics',
    check: (stats) => stats.gachaPulls >= 1
  },
  {
    id: 'gacha_addict',
    name: 'Relic Collector',
    tag: '✧',
    desc: 'Membuka minimal 5 kali peti misteri harian',
    category: 'Relics',
    check: (stats) => stats.gachaPulls >= 5
  },
  {
    id: 'gacha_lucky',
    name: 'Golden Aura',
    tag: '✧',
    desc: 'Memperoleh relik bertingkat Legendary',
    category: 'Relics',
    check: (stats) => stats.hasLegendaryGacha
  },
  {
    id: 'music_quiz_champ',
    name: 'Melody Virtuoso',
    tag: '◇',
    desc: 'Meraih kemenangan dalam kompetisi Music Quiz',
    category: 'Music',
    check: (stats) => stats.quizWins >= 1
  }
];

/**
 * Evaluasi dan dapatkan seluruh status achievement user
 */
function getUserAchievements(guildId, userId, member) {
  // 1. Voice Data
  const voiceStats = getVoiceStats(guildId, userId);
  const voiceMinutes = voiceStats.totalTime ? Math.floor(voiceStats.totalTime / 60000) : 0;

  // 2. Card Data
  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || null;
  const hasCard = Boolean(userCard);
  const hasBirthday = Boolean(userCard?.birthdate);
  const hasBanner = Boolean(userCard?.bannerUrl);
  const totalReactions = (userCard?.likes?.length || 0) + (userCard?.respects?.length || 0);

  // 3. Gacha Data
  const gachaData = storage.read('gacha_data');
  const userGacha = gachaData[guildId]?.[userId] || null;
  const gachaPulls = userGacha?.pulls || 0;
  const hasLegendaryGacha = Boolean(
    userGacha?.badges?.some(b => b.includes('Sultan') || b.includes('Bintang') || b.includes('Legendary') || b.includes('Celestial') || b.includes('Dawnblade') || b.includes('Dragon') || b.includes('Aegis') || b.includes('Maestro') || b.includes('Chronos')) ||
    userGacha?.inventory?.some(item => ['Cosmic Aegis of Infinity', 'Aura of the Celestial Dragon', 'Genesis Vinyl of Eternity', 'Crown of Destiny', 'Celestial Star Relic', 'Excalibur of the Dawn', 'Phoenix Flame Quill', 'Chrono Scepter'].includes(item))
  );

  // 4. Music Quiz Data
  const quizData = storage.read('musicquiz_lb');
  const userQuiz = quizData[guildId]?.[userId] || null;
  const quizWins = userQuiz?.wins || 0;

  const statsObj = {
    voiceMinutes,
    hasCard,
    hasBirthday,
    hasBanner,
    totalReactions,
    gachaPulls,
    hasLegendaryGacha,
    quizWins
  };

  const unlocked = [];
  const locked = [];

  for (const ach of MASTER_ACHIEVEMENTS) {
    if (ach.check(statsObj)) {
      unlocked.push(ach);
    } else {
      locked.push(ach);
    }
  }

  return {
    unlocked,
    locked,
    total: MASTER_ACHIEVEMENTS.length,
    percentage: Math.round((unlocked.length / MASTER_ACHIEVEMENTS.length) * 100),
    statsObj
  };
}

module.exports = {
  MASTER_ACHIEVEMENTS,
  getUserAchievements
};
