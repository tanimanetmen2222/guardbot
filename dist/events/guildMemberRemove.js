"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
const memberCard_1 = require("../utils/memberCard");
exports.default = {
    name: discord_js_1.Events.GuildMemberRemove,
    async execute(member) {
        try {
            if (!member.guild || !member.user)
                return;
            const channel = await (0, channelManager_1.getLogChannel)(member.guild, 'cikis-log');
            if (!channel)
                return;
            const card = await (0, memberCard_1.buildMemberCard)(member, 'goodbye');
            await (0, logger_1.sendLog)(channel, '👋 Uye Ayrildi', `${member.user.tag} sunucudan ayrildi.`, 0xef4444, [
                { name: 'Kullanici', value: `${member.user} (${member.user.id})`, inline: true },
                { name: 'Kalan Uye', value: `${member.guild.memberCount}`, inline: true },
            ], card);
            (0, logger_1.saveLogToDatabase)('cikis-log', member.user.id, member.user.tag, 'GuildMemberRemove', JSON.stringify({ memberCount: member.guild.memberCount }));
        }
        catch (error) {
            console.error('GuildMemberRemove hatasi:', error);
        }
    },
};
