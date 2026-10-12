import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

export async function testDatabase() {
  const migrationsDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
  const migrations = (await readdir(migrationsDirectory)).filter((name) => name.endsWith('.sql')).sort();
  const miniflare = new Miniflare({
    compatibilityDate: '2026-10-11',
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { DB: '00000000-0000-0000-0000-000000000001' },
  });
  const db = await miniflare.getD1Database('DB');
  for (const migration of migrations) {
    const sql = await readFile(`${migrationsDirectory}/${migration}`, 'utf8');
    for (const statement of sql.split(';').map((item) => item.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
  return { db, close: () => miniflare.dispose() };
}
