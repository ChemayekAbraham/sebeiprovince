import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { q, q1 } from "./db.ts";

const SECRET = process.env.SESSION_SECRET || "dev-secret";
export const COOKIE = "sebei_session";
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export interface AuthedUser { id: string; email: string; name: string; roles: string[]; permissions: string[] }
export type AuthedReq = Request & { user: AuthedUser };

export async function loadUser(id: string, iat?: number): Promise<AuthedUser | null> {
  const u = await q1("SELECT id,email,name,is_active,password_changed_at FROM admin_users WHERE id=$1", [id]);
  if (!u || !u.is_active) return null;
  // Tokens issued before a password change are revoked
  if (iat && new Date(u.password_changed_at).getTime() / 1000 > iat + 1) return null;
  const roles = (await q("SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1", [id])).map(r => r.name);
  const permissions = (await q(
    `SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id
     JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$1`, [id])).map(r => r.code);
  return { id: u.id, email: u.email, name: u.name, roles, permissions };
}

export function issueSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: `${SESSION_HOURS}h` });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 3600 * 1000, domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

/** Authenticates the request from the session cookie; attaches req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const p = jwt.verify(token, SECRET) as any;
    const user = await loadUser(p.sub, p.iat);
    if (!user) return res.status(401).json({ error: "Session invalid or expired" });
    (req as AuthedReq).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session invalid or expired" });
  }
}

/** Server-side permission check. Super Administrator passes everything. */
export const can = (u: AuthedUser, perm: string) => u.roles.includes("Super Administrator") || u.permissions.includes(perm);

export const requirePerm = (perm: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!can((req as AuthedReq).user, perm)) return res.status(403).json({ error: `Missing permission: ${perm}` });
  next();
};

/** CSRF defence: state-changing requests must carry a custom header and an allowed Origin. */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-requested-with") !== "sebei-admin") return res.status(403).json({ error: "CSRF check failed" });
  const origin = req.get("origin");
  if (origin && origin !== process.env.ADMIN_ORIGIN && process.env.NODE_ENV === "production")
    return res.status(403).json({ error: "Origin not allowed" });
  next();
}

export async function audit(req: Request | null, action: string, entity?: string, entityId?: string, details?: any, user?: { id: string; email: string }) {
  const u = user || (req && (req as AuthedReq).user);
  await q("INSERT INTO audit_logs(user_id,user_email,action,entity,entity_id,details,ip) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [u?.id ?? null, u?.email ?? null, action, entity ?? null, entityId ?? null, details ? JSON.stringify(details) : null, req?.ip ?? null]);
}

export async function login(email: string, password: string, req: Request) {
  const u = await q1("SELECT * FROM admin_users WHERE email=$1", [String(email).toLowerCase()]);
  const fail = { error: "Invalid email or password" };
  if (!u || !u.is_active) { await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali"); return { ...fail, status: 401 }; }
  if (u.locked_until && new Date(u.locked_until) > new Date())
    return { error: "Account temporarily locked after repeated failed attempts. Try again later.", status: 423 };
  if (!(await bcrypt.compare(password, u.password_hash))) {
    const fails = u.failed_attempts + 1;
    if (fails >= MAX_FAILS) {
      await q("UPDATE admin_users SET failed_attempts=0, locked_until=now()+($2||' minutes')::interval WHERE id=$1", [u.id, LOCK_MINUTES]);
      await audit(req, "auth.lockout", "admin_users", u.id, null, u);
    } else await q("UPDATE admin_users SET failed_attempts=$2 WHERE id=$1", [u.id, fails]);
    await audit(req, "auth.login_failed", "admin_users", u.id, null, u);
    return { ...fail, status: 401 };
  }
  await q("UPDATE admin_users SET failed_attempts=0, locked_until=NULL, last_login_at=now() WHERE id=$1", [u.id]);
  await audit(req, "auth.login", "admin_users", u.id, null, u);
  return { id: u.id as string };
}

export async function createResetToken(email: string) {
  const u = await q1("SELECT id FROM admin_users WHERE email=$1 AND is_active", [String(email).toLowerCase()]);
  if (!u) return null;
  const token = crypto.randomBytes(32).toString("hex");
  await q("INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",
    [u.id, crypto.createHash("sha256").update(token).digest("hex")]);
  return token;
}

export async function consumeResetToken(token: string, newPassword: string) {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const r = await q1("SELECT id,user_id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()", [hash]);
  if (!r) return false;
  await q("UPDATE admin_users SET password_hash=$2, password_changed_at=now(), failed_attempts=0, locked_until=NULL WHERE id=$1",
    [r.user_id, await bcrypt.hash(newPassword, 12)]);
  await q("UPDATE password_resets SET used_at=now() WHERE id=$1", [r.id]);
  return true;
}

export const validPassword = (p: any) => typeof p === "string" && p.length >= 10 && /[a-z]/i.test(p) && /\d/.test(p);
