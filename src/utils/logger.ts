import { EmbedBuilder, TextChannel, APIEmbedField, AttachmentBuilder } from 'discord.js';
import { db } from '../database/database';

export async function sendLog(
  channel: TextChannel | null,
  title: string,
  description: string,
  color: number,
  fields: APIEmbedField[] = [],
  attachment?: AttachmentBuilder
) {
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (attachment) {
    embed.setImage(`attachment://${attachment.name}`);
    await channel.send({ embeds: [embed], files: [attachment] });
    return;
  }

  await channel.send({ embeds: [embed] });
}

export function saveLogToDatabase(
  channelName: string,
  userId: string | null,
  userTag: string | null,
  action: string,
  details: string | null
) {
  db.run(
    'INSERT INTO log_entries (channel_name, user_id, user_tag, action, details) VALUES (?, ?, ?, ?, ?)',
    [channelName, userId, userTag, action, details],
    (err) => {
      if (err) console.error('Log veritabani kayit hatasi:', err);
    }
  );
}