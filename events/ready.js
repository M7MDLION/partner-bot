// ==========================
// 📁 events/ready.js — عند تشغيل البوت
// ==========================
module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot is ready: ${client.user.tag}`);
  },
};

