import {
  Guild,
  TextChannel,
  ChannelType,
  PermissionsBitField,
} from 'discord.js';
import { db } from '../database/database';

const LOG_CHANNELS = [
  'ticket-log',
  'giris-log',
  'voice-log',
  'ban-log',
  'security-log',
  'cikis-log',
  'rol-log',
  'message-log',
];

export async function createSingleLogChannel(
  guild: Guild,
  channelName: string
): Promise<TextChannel | null> {
  try {
    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === channelName && ch.type === ChannelType.GuildText
    ) as TextChannel | undefined;

    if (existingChannel) {
      db.run(
        'INSERT OR REPLACE INTO log_channels (channel_id, channel_name) VALUES (?, ?)',
        [existingChannel.id, channelName]
      );

      return existingChannel;
    }

    const botMember = guild.members.me;
    if (!botMember) return null;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: botMember.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ],
      reason: 'Log kanali otomatik olusturuldu',
    });

    if (channel.type !== ChannelType.GuildText) return null;

    db.run(
      'INSERT OR REPLACE INTO log_channels (channel_id, channel_name) VALUES (?, ?)',
      [channel.id, channelName]
    );

    return channel;
  } catch (error) {
    console.error('createSingleLogChannel hatasi (' + channelName + '):', error);
    return null;
  }
}

export async function createLogChannels(guild: Guild) {
  const createdChannels: Map<string, TextChannel> = new Map();

  for (const channelName of LOG_CHANNELS) {
    const channel = await createSingleLogChannel(guild, channelName);

    if (channel) {
      createdChannels.set(channelName, channel);
    }
  }

  return createdChannels;
}

export async function getLogChannel(
  guild: Guild,
  channelName: string
): Promise<TextChannel | null> {
  return new Promise((resolve) => {
    db.get(
      'SELECT channel_id FROM log_channels WHERE channel_name = ?',
      [channelName],
      (err: Error | null, row: any) => {
        if (err || !row) {
          const channel = guild.channels.cache.find(
            (ch) => ch.name === channelName && ch.type === ChannelType.GuildText
          ) as TextChannel | undefined;

          resolve(channel || null);
          return;
        }

        const channel = guild.channels.cache.get(row.channel_id) as
          | TextChannel
          | undefined;

        resolve(channel || null);
      }
    );
  });
}