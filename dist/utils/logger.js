"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLog = sendLog;
exports.saveLogToDatabase = saveLogToDatabase;
const discord_js_1 = require("discord.js");
const database_1 = require("../database/database");
async function sendLog(channel, title, description, color, fields = [], attachment) {
    if (!channel)
        return;
    const embed = new discord_js_1.EmbedBuilder()
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
function saveLogToDatabase(channelName, userId, userTag, action, details) {
    database_1.db.run('INSERT INTO log_entries (channel_name, user_id, user_tag, action, details) VALUES (?, ?, ?, ?, ?)', [channelName, userId, userTag, action, details], (err) => {
        if (err)
            console.error('Log veritabani kayit hatasi:', err);
    });
}
