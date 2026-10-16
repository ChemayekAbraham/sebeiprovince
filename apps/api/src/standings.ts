import { q, q1 } from "./db.ts";

export interface Row {
  team_id: string; name: string; slug: string; logo: string | null; group_id: string | null; group_name: string | null;
  played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number; adjustment: number;
  position?: number;
}

/**
 * Standings are always derived from published, completed matches in the season,
 * plus clearly separated manual adjustments (stored in `standings`).
 */
export async function computeStandings(seasonId: string): Promise<{ rows: Row[]; adjustments: any[] } | null> {
  const season = await q1(
    `SELECT s.id, c.points_win pw, c.points_draw pd, c.points_loss pl, c.tie_breaks FROM competition_seasons s
     JOIN competitions c ON c.id=s.competition_id WHERE s.id=$1`, [seasonId]);
  if (!season) return null;
  const teams = await q(
    `SELECT t.id team_id, t.name, t.slug, t.logo, ct.group_id, g.name group_name FROM competition_teams ct
     JOIN teams t ON t.id=ct.team_id LEFT JOIN competition_groups g ON g.id=ct.group_id WHERE ct.season_id=$1`, [seasonId]);
  const matches = await q(
    `SELECT home_team_id h, away_team_id a, home_score hs, away_score aws FROM matches
     WHERE season_id=$1 AND status='completed' AND result_state='published' AND home_score IS NOT NULL AND away_score IS NOT NULL`, [seasonId]);
  const adjustments = await q(
    `SELECT s.*, t.name team_name, u.email adjusted_by_email FROM standings s JOIN teams t ON t.id=s.team_id
     LEFT JOIN admin_users u ON u.id=s.adjusted_by WHERE s.season_id=$1 ORDER BY s.created_at DESC`, [seasonId]);

  const map = new Map<string, Row>();
  for (const t of teams)
    map.set(t.team_id, { ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, adjustment: 0 });
  for (const a of adjustments) { const r = map.get(a.team_id); if (r) r.adjustment += a.points_adjustment; }
  const apply = (id: string, f: number, a: number) => {
    const r = map.get(id); if (!r) return;
    r.played++; r.gf += f; r.ga += a;
    if (f > a) { r.won++; r.points += season.pw; } else if (f === a) { r.drawn++; r.points += season.pd; } else { r.lost++; r.points += season.pl; }
  };
  for (const m of matches) { apply(m.h, m.hs, m.aws); apply(m.a, m.aws, m.hs); }
  const rows = [...map.values()];
  for (const r of rows) { r.gd = r.gf - r.ga; r.points += r.adjustment; }

  const rules = String(season.tie_breaks).split(",").map((s: string) => s.trim());
  const h2h = (a: Row, b: Row) => {
    let pa = 0, pb = 0;
    for (const m of matches) {
      const isAB = m.h === a.team_id && m.a === b.team_id, isBA = m.h === b.team_id && m.a === a.team_id;
      if (!isAB && !isBA) continue;
      const fa = isAB ? m.hs : m.aws, fb = isAB ? m.aws : m.hs;
      if (fa > fb) pa += season.pw; else if (fa < fb) pb += season.pw; else { pa += season.pd; pb += season.pd; }
    }
    return pb - pa;
  };
  const cmp = (a: Row, b: Row) => {
    if (b.points !== a.points) return b.points - a.points;
    for (const rule of rules) {
      const d = rule === "goal_difference" ? b.gd - a.gd : rule === "goals_for" ? b.gf - a.gf :
        rule === "wins" ? b.won - a.won : rule === "head_to_head" ? h2h(a, b) : 0;
      if (d) return d;
    }
    return a.name.localeCompare(b.name);
  };
  rows.sort(cmp);
  // Position is numbered within each group (or the whole table when ungrouped).
  const counters = new Map<string, number>();
  for (const r of rows) { const k = r.group_id ?? "_"; const n = (counters.get(k) ?? 0) + 1; counters.set(k, n); r.position = n; }
  return { rows, adjustments };
}
