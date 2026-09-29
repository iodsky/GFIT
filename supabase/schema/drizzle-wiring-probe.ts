import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const drizzleWiringProbe = pgTable('drizzle_wiring_probe', {
  id: serial('id').primaryKey(),
  probeValue: text('probe_value'),
});
