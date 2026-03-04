"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMemberCard = buildMemberCard;
const discord_js_1 = require("discord.js");
const canvas_1 = require("@napi-rs/canvas");
async function buildMemberCard(member, mode) {
    const canvas = new canvas_1.Canvas(1100, 500);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, 1100, 500);
    const gradient = ctx.createLinearGradient(0, 0, 1100, 0);
    gradient.addColorStop(0, '#0ea5e9');
    gradient.addColorStop(1, '#2563eb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1100, 90);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Sans';
    ctx.fillText(mode === 'welcome' ? 'HOS GELDIN' : 'HOSÇAKAL', 30, 62);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px Sans';
    ctx.fillText(member.user.username.toUpperCase(), 650, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Sans';
    ctx.fillText(mode === 'welcome' ? 'KATILAN UYE' : 'AYRILAN UYE', 40, 160);
    ctx.strokeStyle = '#00bfff';
    ctx.lineWidth = 6;
    roundRect(ctx, 35, 175, 430, 70, 20);
    ctx.stroke();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 34px Sans';
    ctx.fillText(member.user.username, 55, 220);
    const createdDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    roundRect(ctx, 35, 285, 430, 70, 20);
    ctx.stroke();
    ctx.fillText(`${createdDays} GUN ONCE OLUSTURULDU`, 55, 330);
    const memberCount = member.guild.memberCount;
    ctx.font = 'bold 26px Sans';
    ctx.fillText(`Uye Sayisi: ${memberCount}`, 40, 455);
    const avatar = await (0, canvas_1.loadImage)(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(840, 260, 130, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 710, 130, 260, 260);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(840, 260, 130, 0, Math.PI * 2, true);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#111827';
    ctx.stroke();
    const buffer = canvas.toBuffer('image/png');
    return new discord_js_1.AttachmentBuilder(buffer, {
        name: mode === 'welcome' ? 'welcome-card.png' : 'goodbye-card.png',
    });
}
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
