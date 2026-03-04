import { Events, Guild } from 'discord.js';

export default {
  name: Events.GuildCreate,
  async execute(guild: Guild) {
    console.log(`Yeni sunucuya katilindi: ${guild.name} (${guild.id})`);
  },
};