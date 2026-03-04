"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
exports.default = {
    name: discord_js_1.Events.GuildCreate,
    async execute(guild) {
        console.log(`Yeni sunucuya katilindi: ${guild.name} (${guild.id})`);
    },
};
