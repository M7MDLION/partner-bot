// 📁 events/interactionCreate.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const {
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const config = require('../config');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const guildId = interaction.guild?.id;
    const guildName = interaction.guild?.name;
    const user = interaction.user;
    const serverConfig = config[guildId];

    if (!serverConfig) return;

    // 🎫 إنشاء تذكرة شراكة
    if (interaction.isButton() && interaction.customId === 'partner_ticket') {
      const ticketChannel = await interaction.guild.channels.create({
        name: `partner-${user.username}`.toLowerCase().replace(/ /g, '-'),
        type: ChannelType.GuildText,
        parent: serverConfig.ticketCategoryId || null,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle(`📝 طلب شراكة مع ${guildName}`)
        .setColor('#00bcd4')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setDescription(serverConfig.welcomeMessage || 'مرحبًا بك في تذكرة الشراكة! تأكد من قراءة الشروط أدناه بعناية.')
        .addFields(
          {
            name: '🟢 الشروط الأساسية',
            value: serverConfig.levels.basic.requirements.join('\n') || 'غير محددة',
          },
          {
            name: '🟡 الشروط المتوسطة',
            value: serverConfig.levels.medium.requirements.join('\n') || 'غير محددة',
          },
          {
            name: '🔴 الشروط الكبرى',
            value: serverConfig.levels.advanced.requirements.join('\n') || 'غير محددة',
          },
        )
        .setFooter({ text: 'يرجى الالتزام بجميع الشروط قبل تقديم طلب الشراكة' })
        .setTimestamp();

      const sendButton = new ButtonBuilder()
        .setCustomId('submit_partner')
        .setLabel('📤 إرسال رسالة الشراكة')
        .setStyle(ButtonStyle.Primary);

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('❌ إغلاق التذكرة')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(sendButton, closeButton);

      await ticketChannel.send({
        content: `# 🤝 ${serverConfig.partnerPrefix} — ${user}`,
        embeds: [embed],
        components: [row],
      });

      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({
        content: `✅ تم فتح تذكرتك بنجاح: ${ticketChannel}`,
      });
    }

    // ❌ إغلاق التذكرة
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      await interaction.channel.send('🔒 تم إغلاق التذكرة، سيتم حذفها بعد 5 ثواني...');
      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 5000);
    }

    // 📤 فتح النموذج لإرسال الشراكة
    if (interaction.isButton() && interaction.customId === 'submit_partner') {
      const modal = new ModalBuilder()
        .setCustomId('partnerModal')
        .setTitle('📤 إرسال طلب شراكة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('serverName')
              .setLabel('📛 اسم السيرفر')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('serverDesc')
              .setLabel('📝 وصف السيرفر')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('serverInvite')
              .setLabel('🔗 رابط الدعوة')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      return interaction.showModal(modal);
    }

// 📩 استلام بيانات الشراكة من النموذج
if (interaction.isModalSubmit() && interaction.customId === 'partnerModal') {
  // 🛑 تحقق لو الشراكة أُرسلت من قبل
  if (interaction.channel.topic && interaction.channel.topic.includes('PARTNER_SENT')) {

    // ✅ تعطيل زر "إرسال رسالة الشراكة" فقط
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const botMessage = messages.find(msg =>
        msg.author.id === client.user.id &&
        msg.components.length > 0
      );

      if (botMessage) {
        const row = botMessage.components[0];

        const disabledComponents = row.components.map(button => {
          if (button.customId === 'submit_partner') {
            return ButtonBuilder.from(button).setDisabled(true);
          }
          return ButtonBuilder.from(button); // زر الإغلاق يفضل شغال
        });

        const disabledRow = new ActionRowBuilder().addComponents(disabledComponents);
        await botMessage.edit({ components: [disabledRow] });
      }
    } catch (err) {
      console.error('❌ فشل تعطيل الزر:', err.message);
    }

    return await interaction.reply({
      content: '🚫 تم إرسال الشراكة بالفعل في هذه التذكرة.',
      ephemeral: true,
    });
  }
      const name = interaction.fields.getTextInputValue('serverName');
      const desc = interaction.fields.getTextInputValue('serverDesc');
      const invite = interaction.fields.getTextInputValue('serverInvite');

      if (!invite.startsWith('https://discord.gg/')) {
        return await interaction.reply({ content: '🚫 رابط غير صالح.', ephemeral: true });
      }

      try {
        const inviteCode = invite.split('/').pop();
        const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`);

        if (!response.ok) throw new Error('Invalid invite');
        const fetchedInvite = await response.json();

        const memberCount = fetchedInvite.approximate_member_count || 0;
        const onlineCount = fetchedInvite.approximate_presence_count || 0;

        let valid = false;
        let levelUsed = '❌ غير مطابق';

        const { basic, medium, advanced } = serverConfig.levels;

        if (memberCount >= advanced.minMembers && onlineCount >= advanced.minOnline) {
          valid = true;
          levelUsed = '🔴 كبرى';
        } else if (memberCount >= medium.minMembers && onlineCount >= medium.minOnline) {
          valid = true;
          levelUsed = '🟡 متوسطة';
        } else if (memberCount >= basic.minMembers && onlineCount >= basic.minOnline) {
          valid = true;
          levelUsed = '🟢 أساسية';
        }

        if (!valid) {
          return await interaction.reply({
            content: `🚫 السيرفر لا يستوفي شروط الشراكة.\n👥 الأعضاء: **${memberCount}**\n🟢 الأونلاين: **${onlineCount}**`,
            ephemeral: true,
          });
        }

        const partnerRoom = interaction.guild.channels.cache.get(serverConfig.partnerChannel);
        if (!partnerRoom) {
          return await interaction.reply({ content: '🚫 روم الشراكات غير مضبوط.', ephemeral: true });
        }

        await interaction.reply({ content: `✅ تم قبول الشراكة (${levelUsed})، وجارٍ إرسالها...`, ephemeral: true });

        if (serverConfig.defaultMessage) {
          await interaction.channel.send(serverConfig.defaultMessage);
        }

        await partnerRoom.send(`# ${guildName} 🤝 ${name}
${desc}
${invite}`);
          // 🔐 تحديد التوبيك عشان نمنع التكرار
await interaction.channel.setTopic('PARTNER_SENT');

        // 🖼️ إرسال صورة GIF إن وُجدت في config
        if (serverConfig.gifUrl) {
          await partnerRoom.send(serverConfig.gifUrl);
        }

        const confirm = await interaction.channel.send('📤 تم إرسال الشراكة بنجاح.');
        setTimeout(() => confirm.delete().catch(() => {}), 5000);

      } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء معالجة الرابط أو السيرفر غير موجود.', ephemeral: true });
      }
    }
  },
};
