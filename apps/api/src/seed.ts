import bcrypt from "bcryptjs";
import { pool, q1, slugify } from "./db.ts";

export const PERMISSIONS: Record<string, string> = {
  "content.view": "View admin records",
  "news.write": "Create and edit articles",
  "news.publish": "Approve and publish articles",
  "teams.manage": "Manage teams",
  "players.manage": "Manage players",
  "transfers.manage": "Create and edit transfers",
  "transfers.verify": "Confirm or reject transfers",
  "transfers.publish": "Publish confirmed transfers",
  "competitions.manage": "Manage competitions, seasons and fixtures",
  "results.enter": "Enter match results",
  "results.publish": "Publish and correct results",
  "announcements.manage": "Manage announcements",
  "media.manage": "Manage media library",
  "settings.manage": "Manage website settings",
  "users.manage": "Manage staff and permissions",
  "audit.view": "View audit logs",
  "records.delete": "Delete or archive records",
};

export const ROLES: Record<string, string[]> = {
  "Super Administrator": Object.keys(PERMISSIONS),
  Administrator: ["content.view","news.write","news.publish","teams.manage","players.manage","transfers.manage","transfers.verify","transfers.publish","competitions.manage","results.enter","results.publish","announcements.manage","media.manage","settings.manage","records.delete"],
  Editor: ["content.view","news.write","news.publish","announcements.manage","media.manage"],
  "Sports Data Manager": ["content.view","teams.manage","players.manage","competitions.manage","results.enter","media.manage"],
  "Transfer Manager": ["content.view","transfers.manage","media.manage"],
  "Read-Only Staff": ["content.view"],
};

const CATEGORIES = ["Breaking News","Local Football","Transfer News","Match Reports","Tournament Updates","Team News","Player News","Interviews","Football Development","Official Announcements"];

const SETTINGS: Record<string, string> = {
  site_name: "Sebei Province Football",
  tagline: "The Home of Football in Sebei Province.",
  about: "Sebei Province Football is the central digital home for football news, teams, players, transfers, leagues and tournaments in Sebei Province.",
  contact_email: "", contact_phone: "", contact_address: "",
  social_facebook: "", social_whatsapp: "", social_twitter: "", social_youtube: "",
  footer_text: "",
  seo_description: "Football news, teams, players, transfers, fixtures, results and standings from Sebei Province.",
  default_share_image: "",
  breaking_banner_enabled: "false", breaking_banner_text: "", breaking_banner_link: "",
  home_sections: "news,transfers,standings,fixtures,results,teams,competitions,announcements",
};

export async function seedBase() {
  for (const [code, d] of Object.entries(PERMISSIONS))
    await pool.query("INSERT INTO permissions(code,description) VALUES($1,$2) ON CONFLICT(code) DO UPDATE SET description=$2", [code, d]);
  for (const [name, perms] of Object.entries(ROLES)) {
    const r = await q1("INSERT INTO roles(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=$1 RETURNING id", [name]);
    // Only (re)apply defaults when a role has no permissions yet, so Super Admin customisations persist.
    const has = await q1("SELECT 1 x FROM role_permissions WHERE role_id=$1 LIMIT 1", [r.id]);
    if (!has)
      await pool.query("INSERT INTO role_permissions SELECT $1, id FROM permissions WHERE code = ANY($2) ON CONFLICT DO NOTHING", [r.id, perms]);
  }
  let i = 0;
  for (const c of CATEGORIES)
    await pool.query("INSERT INTO news_categories(name,slug,sort_order) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [c, slugify(c), i++]);
  for (const [k, v] of Object.entries(SETTINGS))
    await pool.query("INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING", [k, v]);
}

export async function createUser(email: string, name: string, password: string, role: string) {
  const hash = await bcrypt.hash(password, 12);
  const u = await q1(
    "INSERT INTO admin_users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET email=$1 RETURNING id",
    [email.toLowerCase(), name, hash]);
  await pool.query("INSERT INTO user_roles SELECT $1, id FROM roles WHERE name=$2 ON CONFLICT DO NOTHING", [u.id, role]);
  return u.id;
}

if (process.argv[1]?.endsWith("seed.ts")) {
  await seedBase();
  const email = process.env.SEED_ADMIN_EMAIL!, pw = process.env.SEED_ADMIN_PASSWORD!;
  const exists = await q1("SELECT 1 x FROM admin_users WHERE email=$1", [email.toLowerCase()]);
  if (!exists) { await createUser(email, "Super Administrator", pw, "Super Administrator"); console.log("Created super admin:", email); }
  else console.log("Super admin already exists; base data refreshed.");
  await pool.end();
}
