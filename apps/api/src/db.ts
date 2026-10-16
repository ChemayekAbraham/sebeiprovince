import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const q = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows;
export const q1 = async (text: string, params: any[] = []) => (await pool.query(text, params)).rows[0];

/** Run fn inside a transaction; rolls back on any error. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 90) || "item";

/** Produce a unique slug for a table column. */
export async function uniqueSlug(table: string, base: string, excludeId?: string) {
  const root = slugify(base);
  let slug = root, n = 2;
  for (;;) {
    const hit = await q1(`SELECT id FROM ${table} WHERE slug=$1 ${excludeId ? "AND id::text<>$2" : ""}`, excludeId ? [slug, excludeId] : [slug]);
    if (!hit) return slug;
    slug = `${root}-${n++}`;
  }
}
