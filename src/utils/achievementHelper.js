const storage = require('./storage');
const { getVoiceStats } = require('./voiceTracker');

/**
 * Daftar Master Achievements Server
 */
const MASTER_ACHIEVEMENTS = [
  {
    id: 'voice_starter',
    name: 'Voice Newbie',
    emoji: '🎙️',
    desc: 'Menghabiskan minimal 1 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 60
  },
  {
    id: 'voice_warrior',
    name: 'Voice Warrior',
    emoji: '⚔️',
    desc: 'Menghabiskan minimal 10 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 600
  },
  {
    id: 'voice_legend',
    name: 'Voice Legend',
    emoji: '👑',
    desc: 'Menghabiskan minimal 50 jam di Voice Channel',
    category: 'Voice',
    check: (stats) => stats.voiceMinutes >= 3000
  },
  {
    id: 'card_creator',
    name: 'Identity Unlocked',
    emoji: '🎴',
    desc: 'Membuat dan mempublikasikan Kartu Profil Member',
    category: 'Profile',
    check: (stats) => stats.hasCard
  },
  {
    id: 'birthday_star',
    name: 'Birthday Star',
    emoji: '🎂',
    desc: 'Mengisi tanggal lahir di Kartu Profil Member',
    category: 'Profile',
    check: (stats) => stats.hasBirthday
  },
  {
    id: 'banner_artist',
    name: 'Aesthetic Sense',
    emoji: '🖼️',
    desc: 'Memasang custom banner di Kartu Profil Member',
    category: 'Profile',
    check: (stats) => stats.hasBanner
  },
  {
    id: 'gacha_first',
    name: 'First Gamble',
    emoji: '🎲',
    desc: 'Melakukan Gacha Harian pertama kali',
    category: 'Gacha',
    check: (stats) => stats.gachaPulls >= 1
  },
  {
    id: 'gacha_addict',
    name: 'Gacha Enthusiast',
    emoji: '🎰',
    desc: 'Melakukan minimal 5 kali Gacha Harian',
    category: 'Gacha',
    check: (stats) => stats.gachaPulls >= 5
  },
  {
    id: 'gacha_lucky',
    name: 'Chosen One',
    emoji: '🌟',
    desc: 'Mendapatkan item LEGENDARY dari Gacha',
    category: 'Gacha',
    check: (stats) => stats.hasLegendaryGacha
  },
  {
    id: 'music_quiz_champ',
    name: 'Music Maestro',
    emoji: '🎵',
    desc: 'Mencapai minimal 1 kemenangan di Music Quiz',
    category: 'Music',
    check: (stats) => stats.quizWins >= 1
  },
  {
    id: 'social_star',
    name: 'Social Star',
    emoji: '💖',
    desc: 'Mendapatkan minimal 3 Like atau Respect di Kartu Profil',
    category: 'Profile',
    check: (stats) => stats.totalReactions >= 3
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
  const hasLegendaryGacha = Boolean(userGacha?.badges?.some(b => b.includes('Sultan') || b.includes('Bintang')));

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
