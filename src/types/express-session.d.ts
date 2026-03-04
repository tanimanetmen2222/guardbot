import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: 'owner' | 'member';
    };
    discord_oauth_state?: string;
  }
}