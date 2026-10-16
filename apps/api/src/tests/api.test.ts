import test from "node:test";
import assert from "node:assert/strict";
import { pool, q1 } from "../db.ts";
import { login, createResetToken, consumeResetToken } from "../auth.ts";
import { computeStandings } from "../standings.ts";

test("Database connection and core tables exist", async () => {
  const r = await q1("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'");
  assert.ok(r.n >= 15, "Expected at least 15 core database tables");
});

test("Super Administrator authentication works", async () => {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@sebeiprovincefootball.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!12345";
  const fakeReq: any = { ip: "127.0.0.1" };

  const success = await login(email, password, fakeReq);
  assert.ok("id" in success, "Super admin login should succeed");

  const fail = await login(email, "WrongPassword999!", fakeReq);
  assert.equal("error" in fail, true, "Bad password should be rejected");
});

test("Password reset token flow functions securely", async () => {
  const email = "admin@sebeiprovincefootball.com";
  const token = await createResetToken(email);
  assert.ok(token && typeof token === "string", "Reset token generated");

  const newPw = "BrandNewPass2026!";
  const ok = await consumeResetToken(token, newPw);
  assert.equal(ok, true, "Reset token consumed successfully");

  // Re-verify login with new password
  const logged = await login(email, newPw, { ip: "127.0.0.1" } as any);
  assert.ok("id" in logged, "Should log in with the newly reset password");

  // Revert password back for consistency
  await consumeResetToken(await createResetToken(email) as string, "ChangeMe!12345");
});

test("Standings engine dynamically computes correct points, goal difference and order", async () => {
  const comp = await q1("SELECT id FROM competitions WHERE name LIKE '%4th%'");
  assert.ok(comp, "Sebei Province 4th Division League exists");
  const season = await q1("SELECT id FROM competition_seasons WHERE competition_id=$1 AND is_current", [comp.id]);
  assert.ok(season, "Current season exists");

  const standings = await computeStandings(season.id);
  assert.ok(standings, "Standings computed");
  assert.equal(standings.rows.length, 10, "Expected 10 Sebei Province clubs in standings");

  // Verify leader Kamet Utd has 36 points and 17 matches played
  const leader = standings.rows[0];
  assert.equal(leader.name, "Kamet Utd", "Kamet Utd is leading the league");
  assert.equal(leader.played, 17, "Played 17 matches");
  assert.equal(leader.points, 36, "Kamet Utd has 36 points");
  assert.equal(leader.gd, 14, "Goal difference is +14");
  assert.equal(leader.position, 1, "Top team is position 1");

  // Verify Kapchorwa Vikings in second position
  const second = standings.rows[1];
  assert.equal(second.name, "Kapchorwa Vikings");
  assert.equal(second.points, 33);
  assert.equal(second.position, 2);
});

test("Transfers table maintains safe constraints", async () => {
  const transfer = await q1("SELECT * FROM transfers WHERE status='published' LIMIT 1");
  assert.ok(transfer, "Published transfer exists");
  assert.ok(transfer.player_id, "Transfer references a player");
});
