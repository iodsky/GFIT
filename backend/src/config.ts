import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const corsOriginSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''
    );
  }, 'must be an HTTP(S) origin without credentials, path, query, or fragment')
  .transform((value) => new URL(value).origin)
  .optional()
  .default('');

const supabaseUrlSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'must use HTTP or HTTPS')
    .optional(),
);

const serviceRoleKeySchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ALLOWED_ORIGIN: corsOriginSchema,
    SUPABASE_URL: supabaseUrlSchema,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKeySchema,
  })
  .superRefine(({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, context) => {
    if (SUPABASE_URL && !SUPABASE_SERVICE_ROLE_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'is required when SUPABASE_URL is set',
      });
    }

    if (!SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['SUPABASE_URL'],
        message: 'is required when SUPABASE_SERVICE_ROLE_KEY is set',
      });
    }
  })
  .transform(({ NODE_ENV, PORT, CORS_ALLOWED_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }) => ({
    nodeEnv: NODE_ENV,
    port: PORT,
    corsAllowedOrigin: CORS_ALLOWED_ORIGIN,
    supabase:
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? { url: SUPABASE_URL, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY }
        : undefined,
  }));

export type BackendConfig = z.infer<typeof environmentSchema>;

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): BackendConfig => {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid backend configuration: ${issues}`);
  }

  return result.data;
};

export const config = loadConfig();