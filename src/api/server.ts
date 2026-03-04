/// <reference types="node" />
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const { db } = require('../database/database');
const { client } = require('../botClient');

const app = express();
const PORT = Number(process.env.DASHBOARD_PORT || 3000);

const DISCORD_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_OAUTH_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_OAUTH_REDIRECT_URI || '';
const DASHBOARD_OWNER_EMAIL = (process.env.DASHBOARD_OWNER_EMAIL || '').trim().toLowerCase();

const DISCORD_API = 'https://discord.com/api/v10';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.DASHBOARD_SESSION_SECRET || 'change-this-now',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

type SessionUser = {
  id: number;
  username: string;
  role: 'owner' | 'member';
};

type DbUser = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  banned?: number;
  ban_reason?: string | null;
  force_password_change?: number;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  discord_access_token?: string | null;
  discord_refresh_token?: string | null;
};

type OAuthGuild = {
  id: string;
  name: string;
  permissions?: string;
  owner?: boolean;
};

function getSessionUser(req: express.Request): SessionUser | null {
  return req.session.user || null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Giris yapman gerekiyor.' });
    return;
  }
  next();
}

function requireOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Bu islem sadece owner icin.' });
    return;
  }
  next();
}

function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: unknown) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: unknown) => {
      if (err) reject(err);
      else resolve((rows as T[]) || []);
    });
  });
}

function dbRun(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err: Error | null) {
      if (err) reject(err);
      else resolve({ lastID: this?.lastID, changes: this?.changes });
    });
  });
}

function hasManagePermission(guild: OAuthGuild) {
  if (guild.owner) return true;

  const permissions = BigInt(guild.permissions || '0');
  const ADMINISTRATOR = 0x8n;
  const MANAGE_GUILD = 0x20n;

  return (
    (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
    (permissions & MANAGE_GUILD) === MANAGE_GUILD
  );
}

async function getLinkedDiscordAccessToken(userId: number) {
  const user = await dbGet<DbUser>(
    'SELECT discord_access_token FROM dashboard_users WHERE id = ?',
    [userId]
  );
  return user?.discord_access_token || null;
}

app.get('/', (req, res) => {
  const user = getSessionUser(req);
  const statusText = user ? user.username + ' (' + user.role + ')' : 'Giris yok';

  res.send(`
<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>V Guard Dashboard</title>
  <style>
    body{font-family:Arial,sans-serif;background:#0b0b0f;color:#fff;margin:0;padding:24px}
    .box{background:#15151d;border:1px solid #2a2a38;border-radius:14px;padding:18px;margin-bottom:16px;max-width:760px}
    input,button,select{width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid #333;background:#0f0f15;color:#fff;box-sizing:border-box}
    button{cursor:pointer;background:#1f6feb;border:none}
    a{color:#8ab4ff}
    pre{background:#0f0f15;padding:12px;border-radius:8px;white-space:pre-wrap;overflow:auto}
    h1,h2{margin-top:0}
    .muted{opacity:.8}
  </style>
</head>
<body>
  <div class="box">
    <h1>V Guard Dashboard</h1>
    <p><b>Durum:</b> ${statusText}</p>
    <p class="muted">Owner maili ile kayit olursan owner olursun.</p>
  </div>

  <div class="box">
    <h2>Kayit</h2>
    <input id="reg_username" placeholder="Kullanici adi" />
    <input id="reg_email" placeholder="Email" />
    <input id="reg_password" type="password" placeholder="Sifre" />
    <button onclick="registerUser()">Kayit Ol</button>
  </div>

  <div class="box">
    <h2>Giris</h2>
    <input id="login_email" placeholder="Email" />
    <input id="login_password" type="password" placeholder="Sifre" />
    <button onclick="loginUser()">Giris Yap</button>
    <button onclick="logoutUser()">Cikis Yap</button>
    <button onclick="loadMe()">Ben Kimim</button>
    <button onclick="loadGuilds()">Sunucularim</button>
    <p><a href="/auth/discord">Discord Hesabini Bagla</a></p>
    <pre id="out"></pre>
  </div>

  <div class="box">
    <h2>Guard Ayari</h2>
    <input id="guard_guild_id" placeholder="Guild ID" />
    <select id="guard_enabled">
      <option value="1">Anti-Ban Acik</option>
      <option value="0">Anti-Ban Kapali</option>
    </select>
    <input id="guard_limit" type="number" value="3" />
    <input id="guard_window" type="number" value="60" />
    <select id="guard_punishment">
      <option value="ban">ban</option>
      <option value="kick">kick</option>
      <option value="rolestrip">rolestrip</option>
    </select>
    <button onclick="saveGuard()">Guard Kaydet</button>
    <button onclick="loadGuard()">Guard Getir</button>
  </div>

  <div class="box">
    <h2>Owner Islemleri</h2>
    <p class="muted">Sadece owner hesapta calisir.</p>
    <button onclick="adminUsers()">Kullanicilari Listele</button>
    <input id="admin_user_id" type="number" placeholder="User ID" />
    <input id="admin_reason" placeholder="Ban sebebi" />
    <button onclick="adminBan()">Kalici Banla</button>
    <button onclick="adminUnban()">Ban Kaldir</button>
    <button onclick="adminReset()">Sifre Sifirla</button>
    <button onclick="adminDelete()">Kullaniciyi Sil</button>
  </div>

  <script>
    async function api(url, method='GET', body=null) {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
      });
      const data = await res.json().catch(() => ({ error: 'JSON okunamadi' }));
      document.getElementById('out').textContent = JSON.stringify(data, null, 2);
      return data;
    }

    async function registerUser() {
      await api('/register', 'POST', {
        username: document.getElementById('reg_username').value,
        email: document.getElementById('reg_email').value,
        password: document.getElementById('reg_password').value
      });
    }

    async function loginUser() {
      await api('/login', 'POST', {
        email: document.getElementById('login_email').value,
        password: document.getElementById('login_password').value
      });
    }

    async function logoutUser() { await api('/logout', 'POST'); }
    async function loadMe() { await api('/api/me'); }
    async function loadGuilds() { await api('/api/guilds'); }

    async function loadGuard() {
      const id = document.getElementById('guard_guild_id').value;
      await api('/api/guilds/' + id + '/guard');
    }

    async function saveGuard() {
      const id = document.getElementById('guard_guild_id').value;
      await api('/api/guilds/' + id + '/guard', 'POST', {
        anti_ban_enabled: Number(document.getElementById('guard_enabled').value),
        anti_ban_limit: Number(document.getElementById('guard_limit').value),
        anti_ban_window_seconds: Number(document.getElementById('guard_window').value),
        anti_ban_punishment: document.getElementById('guard_punishment').value
      });
    }

    async function adminUsers() { await api('/api/admin/users'); }

    async function adminBan() {
      const id = document.getElementById('admin_user_id').value;
      await api('/api/admin/users/' + id + '/ban', 'POST', {
        reason: document.getElementById('admin_reason').value
      });
    }

    async function adminUnban() {
      const id = document.getElementById('admin_user_id').value;
      await api('/api/admin/users/' + id + '/unban', 'POST');
    }

    async function adminReset() {
      const id = document.getElementById('admin_user_id').value;
      await api('/api/admin/users/' + id + '/reset-password', 'POST');
    }

    async function adminDelete() {
      const id = document.getElementById('admin_user_id').value;
      await api('/api/admin/users/' + id + '/delete', 'POST');
    }
  </script>
</body>
</html>
  `);
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Tum alanlar zorunlu.' });
      return;
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existing = await dbGet<{ id: number }>(
      'SELECT id FROM dashboard_users WHERE username = ? OR email = ?',
      [cleanUsername, cleanEmail]
    );

    if (existing) {
      res.status(400).json({ error: 'Bu kullanici adi veya email zaten kayitli.' });
      return;
    }

    const role: 'owner' | 'member' =
      DASHBOARD_OWNER_EMAIL && cleanEmail === DASHBOARD_OWNER_EMAIL ? 'owner' : 'member';

    const passwordHash = await bcrypt.hash(password, 10);

    await dbRun(
      `INSERT INTO dashboard_users
       (username, email, password_hash, role, is_active, banned, force_password_change)
       VALUES (?, ?, ?, ?, 1, 0, 0)`,
      [cleanUsername, cleanEmail, passwordHash, role]
    );

    res.json({
      success: true,
      role,
      message: role === 'owner' ? 'Kayit tamamlandi. Owner olarak olusturuldun.' : 'Kayit tamamlandi.',
    });
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ error: 'Kayit sirasinda bir hata olustu.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email ve sifre zorunlu.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await dbGet<DbUser>(
      'SELECT id, username, email, password_hash, role, is_active, banned, ban_reason, force_password_change, discord_id, discord_username FROM dashboard_users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      res.status(400).json({ error: 'Kullanici bulunamadi.' });
      return;
    }

    if (user.banned === 1) {
      res.status(403).json({
        error: 'Hesap banli. Sebep: ' + (user.ban_reason || 'Belirtilmedi'),
      });
      return;
    }

    if (user.is_active !== 1) {
      res.status(403).json({ error: 'Hesap pasif.' });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(400).json({ error: 'Sifre yanlis.' });
      return;
    }

    const safeRole: 'owner' | 'member' = user.role === 'owner' ? 'owner' : 'member';

    await dbRun(
      'UPDATE dashboard_users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?',
      [req.ip, user.id]
    );

    req.session.user = {
      id: user.id,
      username: user.username,
      role: safeRole,
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: safeRole,
        discord_id: user.discord_id || null,
        discord_username: user.discord_username || null,
      },
    });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Giris sirasinda bir hata olustu.' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', async (req, res) => {
  const sessionUser = getSessionUser(req);

  if (!sessionUser) {
    res.json({ logged_in: false });
    return;
  }

  const dbUser = await dbGet<DbUser>(
    'SELECT id, username, email, role, discord_id, discord_username FROM dashboard_users WHERE id = ?',
    [sessionUser.id]
  );

  res.json({
    logged_in: true,
    user: {
      id: dbUser?.id,
      username: dbUser?.username,
      email: dbUser?.email,
      role: dbUser?.role === 'owner' ? 'owner' :  'member',
      discord_id: dbUser?.discord_id || null,
      discord_username: dbUser?.discord_username || null,
    },
  });
});

app.get('/auth/discord', requireAuth, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.discord_oauth_state = state;

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: 'identify guilds',
    state,
    prompt: 'consent',
  });

  res.redirect('https://discord.com/oauth2/authorize?' + params.toString());
});

app.get('/auth/discord/callback', requireAuth, async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = req.session.discord_oauth_state;

    if (!code || !state || state !== savedState) {
      res.status(400).send('OAuth state gecersiz.');
      return;
    }

    const tokenBody = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    });

    const tokenRes = await fetch(DISCORD_API + '/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });

    const tokenJson: any = await tokenRes.json();

    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('token error:', tokenJson);
      res.status(400).send('Discord token alinamadi.');
      return;
    }

    const accessToken = tokenJson.access_token as string;
    const refreshToken = tokenJson.refresh_token as string;

    const meRes = await fetch(DISCORD_API + '/users/@me', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    const meJson: any = await meRes.json();

    if (!meRes.ok || !meJson.id) {
      console.error('me error:', meJson);
      res.status(400).send('Discord kullanici bilgisi alinamadi.');
      return;
    }

    const sessionUser = getSessionUser(req)!;

    await dbRun(
      'UPDATE dashboard_users SET discord_id = ?, discord_username = ?, discord_access_token = ?, discord_refresh_token = ? WHERE id = ?',
      [meJson.id, meJson.username, accessToken, refreshToken, sessionUser.id]
    );

    res.redirect('/');
  } catch (error) {
    console.error('discord callback error:', error);
    res.status(500).send('Discord baglama hatasi.');
  }
});

app.get('/api/guilds', requireAuth, async (req, res) => {
  try {
    const sessionUser = getSessionUser(req)!;
    const accessToken = await getLinkedDiscordAccessToken(sessionUser.id);

    if (!accessToken) {
      res.status(400).json({
        error: 'Discord hesabi bagli degil. Once Discord bagla.',
      });
      return;
    }

    const guildsRes = await fetch(DISCORD_API + '/users/@me/guilds', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    const oauthGuilds: OAuthGuild[] = (await guildsRes.json()) as OAuthGuild[];

    if (!guildsRes.ok || !Array.isArray(oauthGuilds)) {
      res.status(400).json({ error: 'Discord sunuculari alinamadi.' });
      return;
    }

    const botGuildIds = new Set(client.guilds.cache.map((g: any) => g.id));

    const manageable = oauthGuilds
      .filter((g) => botGuildIds.has(g.id))
      .filter((g) => hasManagePermission(g))
      .map((g) => ({
        id: g.id,
        name: g.name,
        bot_in_guild: true,
        can_manage: true,
      }));

    res.json({ guilds: manageable });
  } catch (error) {
    console.error('guilds error:', error);
    res.status(500).json({ error: 'Sunucular alinamadi.' });
  }
});

app.get('/api/guilds/:guildId/guard', requireAuth, async (req, res) => {
  try {
    const sessionUser = getSessionUser(req)!;
    const guildId = req.params.guildId;
    const accessToken = await getLinkedDiscordAccessToken(sessionUser.id);

    if (!accessToken) {
      res.status(400).json({ error: 'Discord hesabi bagli degil.' });
      return;
    }

    const guildsRes = await fetch(DISCORD_API + '/users/@me/guilds', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    const oauthGuilds: OAuthGuild[] = (await guildsRes.json()) as OAuthGuild[];
    const target = oauthGuilds.find((g) => g.id === guildId);

    if (!target || !client.guilds.cache.has(guildId) || !hasManagePermission(target)) {
      res.status(403).json({ error: 'Bu sunucuyu yonetemezsin.' });
      return;
    }

    const settings = await dbGet<any>(
      'SELECT anti_ban_enabled, anti_ban_limit, anti_ban_window_seconds, anti_ban_punishment FROM guild_guard_settings WHERE guild_id = ?',
      [guildId]
    );

    res.json({
      guild_id: guildId,
      settings: settings || {
        anti_ban_enabled: 0,
        anti_ban_limit: 3,
        anti_ban_window_seconds: 60,
        anti_ban_punishment: 'ban',
      },
    });
  } catch (error) {
    console.error('get guard error:', error);
    res.status(500).json({ error: 'Guard ayarlari alinamadi.' });
  }
});

app.post('/api/guilds/:guildId/guard', requireAuth, async (req, res) => {
  try {
    const sessionUser = getSessionUser(req)!;
    const guildId = req.params.guildId;
    const accessToken = await getLinkedDiscordAccessToken(sessionUser.id);

    if (!accessToken) {
      res.status(400).json({ error: 'Discord hesabi bagli degil.' });
      return;
    }

    const guildsRes = await fetch(DISCORD_API + '/users/@me/guilds', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    const oauthGuilds: OAuthGuild[] = (await guildsRes.json()) as OAuthGuild[];
    const target = oauthGuilds.find((g) => g.id === guildId);

    if (!target || !client.guilds.cache.has(guildId) || !hasManagePermission(target)) {
      res.status(403).json({ error: 'Bu sunucuyu yonetemezsin.' });
      return;
    }

    const {
      anti_ban_enabled,
      anti_ban_limit,
      anti_ban_window_seconds,
      anti_ban_punishment,
    } = req.body as {
      anti_ban_enabled?: number;
      anti_ban_limit?: number;
      anti_ban_window_seconds?: number;
      anti_ban_punishment?: string;
    };

    await dbRun(
      `INSERT INTO guild_guard_settings
       (guild_id, anti_ban_enabled, anti_ban_limit, anti_ban_window_seconds, anti_ban_punishment, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(guild_id) DO UPDATE SET
         anti_ban_enabled = excluded.anti_ban_enabled,
         anti_ban_limit = excluded.anti_ban_limit,
         anti_ban_window_seconds = excluded.anti_ban_window_seconds,
         anti_ban_punishment = excluded.anti_ban_punishment,
         updated_by = excluded.updated_by,
         updated_at = CURRENT_TIMESTAMP`,
      [
        guildId,
        Number(anti_ban_enabled ?? 0),
        Number(anti_ban_limit ?? 3),
        Number(anti_ban_window_seconds ?? 60),
        anti_ban_punishment || 'ban',
        sessionUser.id,
      ]
    );

    res.json({ success: true, message: 'Guard ayarlari kaydedildi.' });
  } catch (error) {
    console.error('save guard error:', error);
    res.status(500).json({ error: 'Guard ayarlari kaydedilemedi.' });
  }
});

app.get('/api/admin/users', requireOwner, async (_req, res) => {
  const users = await dbAll(
    `SELECT id, username, email, role, is_active, banned, ban_reason,
            force_password_change, last_login_at, last_login_ip,
            discord_id, discord_username, created_at
     FROM dashboard_users
     ORDER BY id DESC`
  );

  res.json({ users });
});

app.post('/api/admin/users/:id/ban', requireOwner, async (req, res) => {
  const userId = Number(req.params.id);
  const reason = String(req.body.reason || 'Sebep belirtilmedi');

  await dbRun(
    'UPDATE dashboard_users SET banned = 1, is_active = 0, ban_reason = ? WHERE id = ?',
    [reason, userId]
  );

  res.json({ success: true, message: 'Kullanici kalici banlandi.' });
});

app.post('/api/admin/users/:id/unban', requireOwner, async (req, res) => {
  const userId = Number(req.params.id);

  await dbRun(
    'UPDATE dashboard_users SET banned = 0, is_active = 1, ban_reason = NULL WHERE id = ?',
    [userId]
  );

  res.json({ success: true, message: 'Kullanici bani kaldirildi.' });
});

app.post('/api/admin/users/:id/reset-password', requireOwner, async (req, res) => {
  const userId = Number(req.params.id);

  const temporaryPassword =
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8);

  const hash = await bcrypt.hash(temporaryPassword, 10);

  await dbRun(
    'UPDATE dashboard_users SET password_hash = ?, force_password_change = 1 WHERE id = ?',
    [hash, userId]
  );

  res.json({
    success: true,
    temporaryPassword,
    message: 'Sifre sifirlandi. Kullanici ilk giriste degistirmeli.',
  });
});

app.post('/api/admin/users/:id/delete', requireOwner, async (req, res) => {
  const userId = Number(req.params.id);

  await dbRun('DELETE FROM dashboard_users WHERE id = ?', [userId]);

  res.json({ success: true, message: 'Kullanici silindi.' });
});

app.listen(PORT, () => {
  console.log('Dashboard aktif: http://localhost:' + PORT);
});