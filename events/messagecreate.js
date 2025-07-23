// ==========================
// 📁 events/messageCreate.js — الأوامر العامة
// ==========================

const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const config = require('../config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const serverConfig = config[guildId];
    if (!serverConfig) return;

    // ✅ أمر إرسال زر فتح التذكرة في روم مخصص
    if (message.content === '!partner') {
      const targetChannel = message.guild.channels.cache.get(serverConfig.ticketChannelId);
      if (!targetChannel) {
        return message.reply('🚫 لم يتم العثور على روم التذاكر. تحقق من `ticketChannelId` في config.js');
      }

      const embed = new EmbedBuilder()
        .setTitle('🎫 طلب شراكة')
        .setDescription('📩 اضغط على الزر أدناه لفتح تذكرة شراكة والتواصل مع الإدارة.')
        .setColor('#00bcd4')
        .setFooter({ text: 'شكرًا لاهتمامك بشراكة معنا ❤️' })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId('partner_ticket')
        .setLabel('🤝 فتح تذكرة شراكة')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      await targetChannel.send({
        embeds: [embed],
        components: [row],
      });

      await message.reply(`✅ تم إرسال زر فتح تذكرة الشراكة في ${targetChannel}.`);
      console.log(`[LOG] !partner استخدمها ${message.author.tag} وتم الإرسال في: ${targetChannel.name}`);
    }

    // ✅ أمر إرسال رسالة الشراكة يدويًا (للأونر فقط)
    if (message.content === '!ارسال') {
      if (message.author.id !== serverConfig.ownerId) {
        return message.reply('🚫 هذا الأمر مخصص لصاحب السيرفر فقط.');
      }

      const partnerRoom = message.guild.channels.cache.get(serverConfig.partnerChannel);
      if (!partnerRoom) {
        return message.reply('🚫 روم الشراكات غير مضبوط. تحقق من `partnerChannel` في config.js');
      }

      await partnerRoom.send(`# ${serverConfig.partnerPrefix} 🤝 ${message.guild.name}`);
      await partnerRoom.send(serverConfig.defaultMessage);

      const confirmation = await message.reply('✅ تم إرسال رسالة الشراكة.');
      setTimeout(() => confirmation.delete().catch(() => {}), 5000);

      console.log(`[LOG] رسالة الشراكة أُرسلت في ${partnerRoom.name} بواسطة ${message.author.tag}`);
    }
  },
};
