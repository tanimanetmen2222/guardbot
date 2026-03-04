import {
  Events,
  Interaction,
  PermissionFlagsBits,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { createSingleLogChannel, createLogChannels, getLogChannel } from '../utils/channelManager';
import { db } from '../database/database';

const OWNER_ID = '1436848224555237528';

type PendingInvite = {
  id: string;
  challengerId: string;
  challengerTag: string;
  opponentId: string;
  opponentTag: string;
  channelId: string;
  messageId: string;
  rounds: number;
  timeout: NodeJS.Timeout;
};

type Move = 'tas' | 'kagit' | 'makas';

type RoundLog = {
  round: number;
  challengerMove: Move;
  opponentMove: Move;
  winner: 'challenger' | 'opponent' | 'draw';
};

type ActiveGame = {
  id: string;
  challengerId: string;
  challengerTag: string;
  opponentId: string;
  opponentTag: string;
  rounds: number;
  currentRound: number;
  challengerScore: number;
  opponentScore: number;
  challengerMove: Move | null;
  opponentMove: Move | null;
  channelId: string;
  messageId: string;
  history: RoundLog[];
};

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  matches: number;
};

const pendingInvites = new Map<string, PendingInvite>();
const activeGames = new Map<string, ActiveGame>();

function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: unknown) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

function dbRun(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function loadStats(userId: string): Promise<PlayerStats> {
  const row = await dbGet<PlayerStats>(
    'SELECT wins, losses, draws, matches FROM tkm_scores WHERE user_id = ?',
    [userId]
  );

  return {
    wins: row?.wins || 0,
    losses: row?.losses || 0,
    draws: row?.draws || 0,
    matches: row?.matches || 0,
  };
}

async function saveStats(userId: string, stats: PlayerStats): Promise<void> {
  await dbRun(
    `
    INSERT INTO tkm_scores (user_id, wins, losses, draws, matches, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      wins = excluded.wins,
      losses = excluded.losses,
      draws = excluded.draws,
      matches = excluded.matches,
      updated_at = CURRENT_TIMESTAMP
    `,
    [userId, stats.wins, stats.losses, stats.draws, stats.matches]
  );
}

async function updateLeaderboard(
  challengerId: string,
  opponentId: string,
  result: 'challenger' | 'opponent' | 'draw'
) {
  const a = await loadStats(challengerId);
  const b = await loadStats(opponentId);

  a.matches++;
  b.matches++;

  if (result === 'challenger') {
    a.wins++;
    b.losses++;
  } else if (result === 'opponent') {
    a.losses++;
    b.wins++;
  } else {
    a.draws++;
    b.draws++;
  }

  await saveStats(challengerId, a);
  await saveStats(opponentId, b);
}

function scoreBar(a: number, b: number) {
  const total = Math.max(a + b, 1);
  const aCount = Math.round((a / total) * 10);
  const bCount = 10 - aCount;
  return `🟩${'█'.repeat(aCount)}${'░'.repeat(bCount)}🟥`;
}

function moveEmoji(move: Move) {
  if (move === 'tas') return '🪨';
  if (move === 'kagit') return '📄';
  return '✂️';
}

function prettyMove(move: Move) {
  if (move === 'tas') return 'Tas';
  if (move === 'kagit') return 'Kagit';
  return 'Makas';
}

function decideRound(a: Move, b: Move): 'challenger' | 'opponent' | 'draw' {
  if (a === b) return 'draw';

  if (
    (a === 'tas' && b === 'makas') ||
    (a === 'kagit' && b === 'tas') ||
    (a === 'makas' && b === 'kagit')
  ) {
    return 'challenger';
  }

  return 'opponent';
}

function buildInviteButtons(inviteId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkm_accept_${inviteId}`)
      .setLabel('Kabul Et')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`tkm_decline_${inviteId}`)
      .setLabel('Reddet')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildMoveButtons(gameId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkm_move_${gameId}_tas`)
      .setLabel('Tas')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`tkm_move_${gameId}_kagit`)
      .setLabel('Kagit')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`tkm_move_${gameId}_makas`)
      .setLabel('Makas')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildHistoryText(history: RoundLog[], challengerTag: string, opponentTag: string) {
  if (history.length === 0) return 'Henuz tur oynanmadi.';

  return history
    .slice(-5)
    .map((h) => {
      let winnerText = 'Berabere';
      if (h.winner === 'challenger') winnerText = challengerTag;
      if (h.winner === 'opponent') winnerText = opponentTag;

      return `**Tur ${h.round}:** ${moveEmoji(h.challengerMove)} ${prettyMove(h.challengerMove)} vs ${moveEmoji(h.opponentMove)} ${prettyMove(h.opponentMove)} → **${winnerText}**`;
    })
    .join('\n');
}

function buildGameEmbed(game: ActiveGame, title: string, footerText?: string) {
  return new EmbedBuilder()
    .setColor(0x111111)
    .setTitle(title)
    .setDescription(
      `**Oyuncular**\n` +
      `🔹 ${game.challengerTag}\n` +
      `🔸 ${game.opponentTag}\n\n` +
      `**Tur:** ${Math.min(game.currentRound, game.rounds)}/${game.rounds}\n` +
      `**Skor:** ${game.challengerScore} - ${game.opponentScore}\n` +
      `${scoreBar(game.challengerScore, game.opponentScore)}`
    )
    .addFields(
      {
        name: 'Son Turlar',
        value: buildHistoryText(game.history, game.challengerTag, game.opponentTag),
        inline: false,
      },
      {
        name: 'Durum',
        value: footerText || 'Iki oyuncu da hamlesini secsin.',
        inline: false,
      }
    );
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    try {
      // BUTTONLAR
      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('tkm_accept_')) {
          const inviteId = customId.replace('tkm_accept_', '');
          const invite = pendingInvites.get(inviteId);

          if (!invite) {
            await interaction.reply({
              content: 'Bu oyun artik aktif degil. Yeni oyun baslatin.',
              ephemeral: true,
            });
            return;
          }

          if (interaction.user.id !== invite.opponentId) {
            await interaction.reply({
              content: 'Bu daveti sadece davet edilen kisi kabul edebilir.',
              ephemeral: true,
            });
            return;
          }

          clearTimeout(invite.timeout);
          pendingInvites.delete(inviteId);

          const game: ActiveGame = {
            id: invite.id,
            challengerId: invite.challengerId,
            challengerTag: invite.challengerTag,
            opponentId: invite.opponentId,
            opponentTag: invite.opponentTag,
            rounds: invite.rounds,
            currentRound: 1,
            challengerScore: 0,
            opponentScore: 0,
            challengerMove: null,
            opponentMove: null,
            channelId: invite.channelId,
            messageId: invite.messageId,
            history: [],
          };

          activeGames.set(game.id, game);

          await interaction.update({
            embeds: [
              buildGameEmbed(
                game,
                '✂️ Tas Kagit Makas Basladi',
                'Oyun basladi. Iki oyuncu da asagidan hamlesini secsin.'
              ),
            ],
            components: [buildMoveButtons(game.id)],
          });
          return;
        }

        if (customId.startsWith('tkm_decline_')) {
          const inviteId = customId.replace('tkm_decline_', '');
          const invite = pendingInvites.get(inviteId);

          if (!invite) {
            await interaction.reply({ content: 'Bu davet artik aktif degil.', ephemeral: true });
            return;
          }

          if (interaction.user.id !== invite.opponentId) {
            await interaction.reply({
              content: 'Bu daveti sadece davet edilen kisi reddedebilir.',
              ephemeral: true,
            });
            return;
          }

          clearTimeout(invite.timeout);
          pendingInvites.delete(inviteId);

          const embed = new EmbedBuilder()
            .setColor(0x111111)
            .setTitle('❌ Davet Reddedildi')
            .setDescription(`**${invite.opponentTag}** oyunu reddetti.`);

          await interaction.update({
            embeds: [embed],
            components: [buildInviteButtons(inviteId, true)],
          });
          return;
        }

        if (customId.startsWith('tkm_move_')) {
          const parts = customId.split('_');
          const gameId = parts[2];
          const move = parts[3] as Move;

          const game = activeGames.get(gameId);

          if (!game) {
            await interaction.reply({
              content: 'Bu oyun artik aktif degil. Yeni oyun baslatin.',
              ephemeral: true,
            });
            return;
          }

          if (![game.challengerId, game.opponentId].includes(interaction.user.id)) {
            await interaction.reply({
              content: 'Bu oyuna sadece iki oyuncu katilabilir.',
              ephemeral: true,
            });
            return;
          }

          if (interaction.user.id === game.challengerId) {
            if (game.challengerMove) {
              await interaction.reply({
                content: 'Bu tur icin hamleni zaten sectin.',
                ephemeral: true,
              });
              return;
            }
            game.challengerMove = move;
          } else {
            if (game.opponentMove) {
              await interaction.reply({
                content: 'Bu tur icin hamleni zaten sectin.',
                ephemeral: true,
              });
              return;
            }
            game.opponentMove = move;
          }

          await interaction.reply({
            content: `Hamlen kaydedildi: **${moveEmoji(move)} ${prettyMove(move)}**`,
            ephemeral: true,
          });

          if (game.challengerMove && game.opponentMove) {
            const result = decideRound(game.challengerMove, game.opponentMove);

            if (result === 'challenger') game.challengerScore++;
            if (result === 'opponent') game.opponentScore++;

            game.history.push({
              round: game.currentRound,
              challengerMove: game.challengerMove,
              opponentMove: game.opponentMove,
              winner: result,
            });

            const channel = interaction.channel;
            if (!channel || !(channel instanceof TextChannel)) return;

            const gameMessage = await channel.messages.fetch(game.messageId).catch(() => null);
            if (!gameMessage) return;

            const finished = game.currentRound >= game.rounds;

            if (finished) {
              let finalWinner: 'challenger' | 'opponent' | 'draw' = 'draw';
              let finalText = 'Mac berabere bitti.';

              if (game.challengerScore > game.opponentScore) {
                finalWinner = 'challenger';
                finalText = `🏆 Kazanan: **${game.challengerTag}**`;
              } else if (game.opponentScore > game.challengerScore) {
                finalWinner = 'opponent';
                finalText = `🏆 Kazanan: **${game.opponentTag}**`;
              }

              await updateLeaderboard(game.challengerId, game.opponentId, finalWinner);

              const finalEmbed = buildGameEmbed(game, '🏁 Tas Kagit Makas Bitti', finalText);

              activeGames.delete(game.id);

              await gameMessage.edit({
                embeds: [finalEmbed],
                components: [buildMoveButtons(game.id, true)],
              });
              return;
            }

            game.currentRound++;
            game.challengerMove = null;
            game.opponentMove = null;

            await gameMessage.edit({
              embeds: [
                buildGameEmbed(
                  game,
                  '🎮 Tas Kagit Makas Devam Ediyor',
                  `Tur tamamlandi. Siradaki tur: **${game.currentRound}/${game.rounds}**`
                ),
              ],
              components: [buildMoveButtons(game.id)],
            });
          }

          return;
        }
      }

      // SLASH
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'ping') {
        const apiPing = Math.round(interaction.client.ws.ping);
        const messagePing = Date.now() - interaction.createdTimestamp;

        await interaction.reply(
          `🏓 Pong!\nMesaj gecikmesi: ${messagePing}ms\nAPI gecikmesi: ${apiPing}ms`
        );
        return;
      }

      // OWNER
      const ownerOnly = ['list-guilds', 'owner-bilgi', 'owner-cikis', 'owner-duyuru'];
      if (ownerOnly.includes(interaction.commandName) && interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: 'Yetkiniz yok.', ephemeral: true });
        return;
      }

      if (interaction.commandName === 'list-guilds') {
        const guilds = interaction.client.guilds.cache
          .map((g) => `• ${g.name} (${g.id})`)
          .join('\n');

        await interaction.reply({
          content: guilds || 'Bot hicbir sunucuda degil.',
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'owner-bilgi') {
        const guildCount = interaction.client.guilds.cache.size;
        const totalUsers = interaction.client.guilds.cache.reduce(
          (sum, g) => sum + (g.memberCount || 0),
          0
        );

        await interaction.reply({
          content: `📊 Toplam sunucu: **${guildCount}**\n👥 Toplam uye: **${totalUsers}**`,
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'owner-cikis') {
        const guildId = interaction.options.getString('guild_id', true);
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
          await interaction.reply({ content: 'Bu ID ile sunucu bulunamadi.', ephemeral: true });
          return;
        }

        const name = guild.name;
        await guild.leave();

        await interaction.reply({
          content: `✅ Bot **${name}** sunucusundan cikti.`,
          ephemeral: true,
        });
        return;
      }

      if (interaction.commandName === 'owner-duyuru') {
        const message = interaction.options.getString('mesaj', true);
        const channelName = interaction.options.getString('kanal_adi') || 'security-log';

        let success = 0;

        for (const guild of interaction.client.guilds.cache.values()) {
          const channel = guild.channels.cache.find(
            (c) => c instanceof TextChannel && c.name === channelName
          ) as TextChannel | undefined;

          if (!channel) continue;

          try {
            await channel.send(message);
            success++;
          } catch {}
        }

        await interaction.reply({
          content: `✅ Duyuru gonderildi. Basarili sunucu sayisi: **${success}**`,
          ephemeral: true,
        });
        return;
      }

      // TKM SKOR
      if (interaction.commandName === 'tkm-skor') {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const stats = await loadStats(target.id);

        const matches = stats.matches;
        const winRate = matches > 0 ? Math.round((stats.wins / matches) * 100) : 0;

        const embed = new EmbedBuilder()
          .setColor(0x111111)
          .setTitle('🏆 Tas Kagit Makas Skor Tablosu')
          .setDescription(`**${target.tag}** icin genel istatistikler`)
          .addFields(
            { name: '🎮 Toplam Mac', value: `${stats.matches}`, inline: true },
            { name: '✅ Galibiyet', value: `${stats.wins}`, inline: true },
            { name: '❌ Maglubiyet', value: `${stats.losses}`, inline: true },
            { name: '🤝 Beraberlik', value: `${stats.draws}`, inline: true },
            { name: '📈 Kazanma Orani', value: `%${winRate}`, inline: true }
          );

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // TKM OYUN
      if (interaction.commandName === 'taskagitmakas') {
        if (!interaction.guild) {
          await interaction.reply({
            content: 'Bu komut sadece sunucuda kullanilir.',
            ephemeral: true,
          });
          return;
        }

        const opponent = interaction.options.getUser('oynanacak_kisi', true);
        const rounds = interaction.options.getInteger('kac_tur', true);

        if (opponent.bot) {
          await interaction.reply({ content: 'Botlarla oynayamazsin.', ephemeral: true });
          return;
        }

        if (opponent.id === interaction.user.id) {
          await interaction.reply({ content: 'Kendine davet gonderemezsin.', ephemeral: true });
          return;
        }

        if (rounds < 1 || rounds > 5) {
          await interaction.reply({ content: 'Tur sayisi 1 ile 5 arasinda olmali.', ephemeral: true });
          return;
        }

        const channel = interaction.channel;
        if (!channel || !(channel instanceof TextChannel)) {
          await interaction.reply({ content: 'Bu komut burada kullanilamaz.', ephemeral: true });
          return;
        }

        const inviteId = `${interaction.guild.id}_${interaction.user.id}_${Date.now()}`;

        const inviteEmbed = new EmbedBuilder()
          .setColor(0x111111)
          .setTitle('🎮 Tas Kagit Makas Daveti')
          .setDescription(
            `${opponent} sen bir maca davet edildin.\n\n` +
              `**Oyunu Baslatan:** ${interaction.user.tag}\n` +
              `**Oynanacak Kisi:** ${opponent.tag}\n` +
              `**Kac Tur:** ${rounds}\n\n` +
              `30 saniye icinde kabul etmezse oyun iptal olur.`
          );

        const inviteMessage = await channel.send({
          content: `${opponent}`,
          embeds: [inviteEmbed],
          components: [buildInviteButtons(inviteId)],
        });

        const timeout = setTimeout(async () => {
          const invite = pendingInvites.get(inviteId);
          if (!invite) return;

          pendingInvites.delete(inviteId);

          const expiredEmbed = new EmbedBuilder()
            .setColor(0x111111)
            .setTitle('⌛ Davet Iptal')
            .setDescription('30 saniye icinde kabul edilmedigi icin oyun iptal edildi.');

          await inviteMessage.edit({
            embeds: [expiredEmbed],
            components: [buildInviteButtons(inviteId, true)],
          }).catch(() => {});
        }, 30000);

        pendingInvites.set(inviteId, {
          id: inviteId,
          challengerId: interaction.user.id,
          challengerTag: interaction.user.tag,
          opponentId: opponent.id,
          opponentTag: opponent.tag,
          rounds,
          channelId: channel.id,
          messageId: inviteMessage.id,
          timeout,
        });

        await interaction.reply({
          content: `Davet gonderildi. **${opponent.tag}** kullanicisinin 30 saniye icinde kabul etmesi gerekiyor.`,
          ephemeral: true,
        });
        return;
      }

      // LOG KOMUTLARI
      const logCommands = [
        'kur-logs',
        'giris-log',
        'cikis-log',
        'ban-log',
        'message-log',
        'rol-log',
        'voice-log',
        'security-log',
        'ticket-log',
        'durum',
      ];

      if (logCommands.includes(interaction.commandName)) {
        if (!interaction.guild || !interaction.memberPermissions) {
          await interaction.reply({
            content: 'Bu komut sadece sunucuda kullanilir.',
            ephemeral: true,
          });
          return;
        }

        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({
            content: 'Yetkiniz yok.',
            ephemeral: true,
          });
          return;
        }

        if (interaction.commandName === 'durum') {
          const names = [
            'ticket-log',
            'giris-log',
            'voice-log',
            'ban-log',
            'security-log',
            'cikis-log',
            'rol-log',
            'message-log',
          ];

          const lines: string[] = [];

          for (const name of names) {
            const ch = await getLogChannel(interaction.guild, name);
            lines.push(`${ch ? '✅' : '❌'} ${name}${ch ? ` -> <#${ch.id}>` : ''}`);
          }

          await interaction.reply({
            content: `**Log Durumu**\n${lines.join('\n')}`,
            ephemeral: true,
          });
          return;
        }

        if (interaction.commandName === 'kur-logs') {
          await interaction.deferReply({ ephemeral: true });
          await createLogChannels(interaction.guild);
          await interaction.editReply('Tum log kanallari kuruldu veya kontrol edildi.');
          return;
        }

        const singleMap: Record<string, string> = {
          'giris-log': 'giris-log',
          'cikis-log': 'cikis-log',
          'ban-log': 'ban-log',
          'message-log': 'message-log',
          'rol-log': 'rol-log',
          'voice-log': 'voice-log',
          'security-log': 'security-log',
          'ticket-log': 'ticket-log',
        };

        if (interaction.commandName in singleMap) {
          await interaction.deferReply({ ephemeral: true });

          const channelName = singleMap[interaction.commandName];
          const channel = await createSingleLogChannel(interaction.guild, channelName);

          if (!channel) {
            await interaction.editReply('Kanal kurulurken hata olustu.');
            return;
          }

          await interaction.editReply(`${channelName} kanali kuruldu veya zaten vardi.`);
          return;
        }
      }

      // MOD KOMUTLARI
      if (!interaction.guild) {
        await interaction.reply({
          content: 'Bu komut sadece sunucuda kullanilir.',
          ephemeral: true,
        });
        return;
      }

      const needsModPerm = ['ban', 'unban', 'kick', 'mute', 'unmute', 'sil'];

      if (needsModPerm.includes(interaction.commandName)) {
        const hasBan = interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers);
        const hasKick = interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers);
        const hasMute = interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);
        const hasManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
        const hasAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

        let allowed = false;

        if (interaction.commandName === 'ban' || interaction.commandName === 'unban') {
          allowed = Boolean(hasBan || hasAdmin);
        } else if (interaction.commandName === 'kick') {
          allowed = Boolean(hasKick || hasAdmin);
        } else if (interaction.commandName === 'mute' || interaction.commandName === 'unmute') {
          allowed = Boolean(hasMute || hasAdmin);
        } else if (interaction.commandName === 'sil') {
          allowed = Boolean(hasManage || hasAdmin);
        }

        if (!allowed) {
          await interaction.reply({
            content: 'Yetkiniz yok.',
            ephemeral: true,
          });
          return;
        }
      }

      if (interaction.commandName === 'ban') {
        const member = interaction.options.getMember('uye') as GuildMember | null;
        const user = interaction.options.getUser('uye', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!member || !member.bannable) {
          await interaction.reply({
            content: 'Bu uye banlanamiyor.',
            ephemeral: true,
          });
          return;
        }

        await member.ban({ reason });

        await interaction.reply(`✅ ${user.tag} banlandi.\nSebep: ${reason}`);
        return;
      }

      if (interaction.commandName === 'unban') {
        const userId = interaction.options.getString('kullanici_id', true);

        try {
          await interaction.guild.members.unban(userId);
          await interaction.reply(`✅ ${userId} IDli kullanicinin bani kaldirildi.`);
        } catch {
          await interaction.reply({
            content: 'Bu kullanicinin bani kaldirilamadi. ID yanlis olabilir.',
            ephemeral: true,
          });
        }
        return;
      }

      if (interaction.commandName === 'kick') {
        const member = interaction.options.getMember('uye') as GuildMember | null;
        const user = interaction.options.getUser('uye', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!member || !member.kickable) {
          await interaction.reply({
            content: 'Bu uye atilamiyor.',
            ephemeral: true,
          });
          return;
        }

        await member.kick(reason);

        await interaction.reply(`✅ ${user.tag} sunucudan atildi.\nSebep: ${reason}`);
        return;
      }

      if (interaction.commandName === 'mute') {
        const member = interaction.options.getMember('uye') as GuildMember | null;
        const user = interaction.options.getUser('uye', true);
        const minutes = interaction.options.getInteger('dakika', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!member || !member.moderatable) {
          await interaction.reply({
            content: 'Bu uye timeouta alinamiyor.',
            ephemeral: true,
          });
          return;
        }

        if (minutes < 1 || minutes > 40320) {
          await interaction.reply({
            content: 'Dakika 1 ile 40320 arasinda olmali.',
            ephemeral: true,
          });
          return;
        }

        await member.timeout(minutes * 60 * 1000, reason);

        await interaction.reply(`✅ ${user.tag} ${minutes} dakika timeout aldi.\nSebep: ${reason}`);
        return;
      }

      if (interaction.commandName === 'unmute') {
        const member = interaction.options.getMember('uye') as GuildMember | null;
        const user = interaction.options.getUser('uye', true);

        if (!member || !member.moderatable) {
          await interaction.reply({
            content: 'Bu uyenin timeoutu kaldirilamiyor.',
            ephemeral: true,
          });
          return;
        }

        await member.timeout(null);

        await interaction.reply(`✅ ${user.tag} kullanicisindan timeout kaldirildi.`);
        return;
      }

      if (interaction.commandName === 'sil') {
        const amount = interaction.options.getInteger('sayi', true);

        if (amount < 1 || amount > 100) {
          await interaction.reply({
            content: '1 ile 100 arasinda bir sayi girmelisin.',
            ephemeral: true,
          });
          return;
        }

        const channel = interaction.channel;

        if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
          await interaction.reply({
            content: 'Bu kanalda mesaj silinemiyor.',
            ephemeral: true,
          });
          return;
        }

        const deleted = await channel.bulkDelete(amount, true);

        await interaction.reply({
          content: `✅ ${deleted.size} mesaj silindi.`,
          ephemeral: true,
        });
        return;
      }
    } catch (error) {
      console.error('interactionCreate hatasi:', error);

      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: 'Bir hata olustu.',
            ephemeral: true,
          }).catch(() => {});
        } else {
          await interaction.reply({
            content: 'Bir hata olustu.',
            ephemeral: true,
          }).catch(() => {});
        }
      }
    }
  },
};