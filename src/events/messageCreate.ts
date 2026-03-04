import { Events, Message, TextChannel } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    try {
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;
      if (!(message.channel instanceof TextChannel)) return;

      const badWords = ['spam', 'test', 'küfür'];
      const content = message.content.toLowerCase();

      if (!badWords.some((word) => content.includes(word))) return;

      const channel = await getLogChannel(message.guild, 'security-log');
      if (!channel) return;

      await sendLog(
        channel,
        '⚠️ Supheli Mesaj',
        'Supheli icerik tespit edildi.',
        0xef4444,
        [
          { name: 'Kullanici', value: `${message.author} (${message.author.id})`, inline: true },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          { name: 'Mesaj', value: message.content.slice(0, 1000), inline: false },
          { name: 'Mesaj Linki', value: message.url, inline: false },
        ]
      );

      saveLogToDatabase(
        'security-log',
        message.author.id,
        message.author.tag,
        'SuspiciousMessage',
        JSON.stringify({
          channelId: message.channel.id,
          channelName: message.channel.name,
          content: message.content.slice(0, 500),
          url: message.url,
        })
      );
    } catch (error) {
      console.error('MessageCreate hatasi:', error);
    }
  },
};