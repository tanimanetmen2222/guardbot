# Hoowers Logs Bot

Full stack Discord bot for logging server events. Bot automatically creates log channels when it joins a server.

## Özellikler

- ✅ Otomatik log kanalı oluşturma
- ✅ 9 farklı log kanalı:
  - `md-kontrol` - Şüpheli mesaj kontrolü
  - `ticket-log` - Ticket logları
  - `security-log` - Güvenlik logları
  - `voice-log` - Ses kanalı logları
  - `ban-log` - Yasaklama logları
  - `giris-log` - Giriş logları
  - `cikis-log` - Çıkış logları
  - `rol-log` - Rol değişiklik logları
  - `message-log` - Mesaj silme logları

- ✅ SQLite veritabanı ile log kayıtları
- ✅ REST API endpoint'leri
- ✅ Event-based logging sistemi

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyasını oluşturun:
```bash
cp .env.example .env
```

3. `.env` dosyasını düzenleyin ve Discord bot token'ınızı ekleyin:
```
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
```

4. Botu derleyin:
```bash
npm run build
```

5. Botu başlatın:
```bash
npm start
```

## Geliştirme

Geliştirme modunda çalıştırmak için:
```bash
npm run dev
```
-

## API Endpoints

- `GET /api/logs/:channelName` - Belirli bir kanalın loglarını getirir
- `GET /api/channels` - Tüm log kanallarını listeler
- `GET /api/stats` - Log istatistiklerini getirir

## Gerekli İzinler

Bot'un aşağıdaki izinlere ihtiyacı vardır:
- Manage Channels (Kanal Yönet)
- View Channels (Kanalları Görüntüle)
- Send Messages (Mesaj Gönder)
- Embed Links (Embed Bağlantıları)
- Attach Files (Dosya Ekle)

## Notlar

- Bot sunucuya katıldığında otomatik olarak log kanallarını oluşturur
- Log kanalları varsayılan olarak herkese kapalıdır (sadece bot görebilir)
- Tüm loglar hem Discord'a hem de veritabanına kaydedilir
