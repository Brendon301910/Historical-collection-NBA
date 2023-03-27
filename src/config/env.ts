import 'dotenv/config';

export const ENV = String(process.env.NODE_ENV);
export const APPLICATION = String(process.env.APPLICATION);
export const VERSION = String(process.env.VERSION);
export const PORT = Number(process.env.PORT);
export const DATABASE_URL = String(process.env.DATABASE_URL);
