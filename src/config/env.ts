import 'dotenv/config';
import { z } from 'zod';

const result = z
  .object({
    NODE_ENV: z.string().default('development'),
    APPLICATION: z.string().default('NBA Historical Collection'),
    VERSION: z.string().default('1.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .string()
      .url()
      .regex(/^postgres(?:ql)?:\/\//),
  })
  .safeParse(process.env);

if (result.success === false) {
  const fields = result.error.issues.map((issue) => issue.path.join('.'));
  throw new Error(`Invalid environment variables: ${fields.join(', ')}`);
}

export const ENV = result.data.NODE_ENV;
export const APPLICATION = result.data.APPLICATION;
export const VERSION = result.data.VERSION;
export const PORT = result.data.PORT;
export const DATABASE_URL = result.data.DATABASE_URL;
