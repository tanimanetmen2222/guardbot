import { Events, Message, TextChannel } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.MessageDelete,
  async execute(message: Message) {
    try {
      if (!message.guild) return;

      if (message.partial) {
        try {
          await message.fetch();
        } catch {}
      }

      if (message.author?.bot) return;
      if (!(message.channel instanceof TextChannel)) return;

      const channel = await getLogChannel(message.guild, 'message-log');
      if (!channel) return;

      await sendLog(
        channel,
        '🗑️ Mesaj Silindi',
        'Bir mesaj silindi.',
        0xf59e0b,
        [
          {
            name: 'Kullanici',
            value: message.author ? `${message.author} (${message.author.id})` : 'Bilinmiyor',
            inline: true,
          },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          {
            name: 'Mesaj',
            value:
              message.content && message.content.trim().length > 0
                ? message.content.slice(0, 1000)
                : '*Icerik yok veya cache disi mesaj*',
            inline: false,
          },
        ]
      );

      saveLogToDatabase(
        'message-log',
        message.author?.id || null,
        message.author?.tag || null,
        'MessageDelete',
        JSON.stringify({
          channelId: message.channel.id,
          channelName: 'name' in message.channel ? message.channel.name : null,
          content: message.content?.slice(0, 500) || '',
        })
      );
    } catch (error) {
      console.error('MessageDelete hatasi:', error);
    }
  },
};