require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Bot cevap verir'),

  // LOG KOMUTLARI
  new SlashCommandBuilder().setName('kur-logs').setDescription('Tum log kanallarini kurar'),
  new SlashCommandBuilder().setName('giris-log').setDescription('Giris log kanalini kurar'),
  new SlashCommandBuilder().setName('cikis-log').setDescription('Cikis log kanalini kurar'),
  new SlashCommandBuilder().setName('ban-log').setDescription('Ban log kanalini kurar'),
  new SlashCommandBuilder().setName('message-log').setDescription('Mesaj log kanalini kurar'),
  new SlashCommandBuilder().setName('rol-log').setDescription('Rol log kanalini kurar'),
  new SlashCommandBuilder().setName('voice-log').setDescription('Ses log kanalini kurar'),
  new SlashCommandBuilder().setName('security-log').setDescription('Guvenlik log kanalini kurar'),
  new SlashCommandBuilder().setName('ticket-log').setDescription('Ticket log kanalini kurar'),
  new SlashCommandBuilder().setName('durum').setDescription('Kurulu log kanallarini gosterir'),

  // MOD KOMUTLARI
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bir uyeyi banlar')
    .addUserOption(option =>
      option.setName('uye').setDescription('Banlanacak uye').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep').setDescription('Ban sebebi').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Bir kullanicinin banini kaldirir')
    .addStringOption(option =>
      option.setName('kullanici_id').setDescription('Kullanici ID').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Bir uyeyi sunucudan atar')
    .addUserOption(option =>
      option.setName('uye').setDescription('Atilacak uye').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep').setDescription('Atma sebebi').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Bir uyeyi timeouta alir')
    .addUserOption(option =>
      option.setName('uye').setDescription('Susturulacak uye').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('dakika').setDescription('Kac dakika').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('sebep').setDescription('Mute sebebi').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Bir uyenin timeoutunu kaldirir')
    .addUserOption(option =>
      option.setName('uye').setDescription('Timeoutu kaldirilacak uye').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('sil')
    .setDescription('Kanaldan mesaj siler')
    .addIntegerOption(option =>
      option.setName('sayi').setDescription('Kac mesaj silinecek').setRequired(true)
    ),

  // TAS KAGIT MAKAS
  new SlashCommandBuilder()
    .setName('taskagitmakas')
    .setDescription('Bir kullaniciyla tas kagit makas oynarsin')
    .addUserOption(option =>
      option.setName('oynanacak_kisi').setDescription('Rakip').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('kac_tur').setDescription('1-5 arasi tur sayisi').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('tkm-skor')
    .setDescription('Tas kagit makas istatistiklerini gosterir')
    .addUserOption(option =>
      option.setName('kullanici').setDescription('Bakilacak kullanici').setRequired(false)
    ),

  // OWNER KOMUTLARI
  new SlashCommandBuilder().setName('list-guilds').setDescription('Botun bulundugu tum sunuculari listeler'),
  new SlashCommandBuilder().setName('owner-bilgi').setDescription('Toplam sunucu ve uye sayisini gosterir'),

  new SlashCommandBuilder()
    .setName('owner-cikis')
    .setDescription('Botu belirtilen sunucudan cikarir')
    .addStringOption(option =>
      option.setName('guild_id').setDescription('Cikilacak sunucu ID').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('owner-duyuru')
    .setDescription('Tum sunucularda bir log kanalina mesaj yollar')
    .addStringOption(option =>
      option.setName('mesaj').setDescription('Gonderilecek mesaj').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('kanal_adi').setDescription('Varsayilan: security-log').setRequired(false)
    ),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands }
);

    console.log('Komutlar yuklendi.');
  } catch (error) {
    console.error('Komut yukleme hatasi:', error);
  }
})();