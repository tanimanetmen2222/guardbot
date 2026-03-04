import dotenv from 'dotenv';

dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  apiPort: parseInt(process.env.API_PORT || '3000'),
  databasePath: process.env.DATABASE_PATH || './data/hoowers.db',
};

export const logChannels = [
  'ticket-log',
  'giris-log',
  'voice-log',
  'ban-log',
  'security-log',
  'cikis-log',
  'rol-log',
  'message-log',
];