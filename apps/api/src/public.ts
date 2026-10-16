import { Router } from "express";
import { q, q1 } from "./db.ts";
import { computeStandings } from "./standings.ts";

export const publicRouter = Router();

const PUB_ARTICLE = "a.status='published' AND a.published_at<=now()";
const PUB_SETTINGS = ["site_name","tagline","about","contact_email","contact_phone","contact_address","social_facebook","social_whatsapp","social_twitter","social_youtube","footer_text","seo_description","default_share_image","breaking_banner_enabled","breaking_banner_text","breaking_banner_link","home_sections"];

const MATCH_SELECT = `
  SELECT m.id, m.reference, m.kickoff_at, m.venue, m.status, m.round_label,
    CASE WHEN m.result_state='published' THEN m.home_score END home_score,
    CASE WHEN m.result_state='published' THEN m.away_score END away_score,
    CASE WHEN m.result_state='published' THEN m.ht_home_score END ht_home_score,
    CASE WHEN m.result_state='published' THEN m.ht_away_score END ht_away_score,
    ht.id home_id, ht.name home_name, ht.slug home_slug, ht.logo home_logo,
    at.id away_id, at.name away_name, at.slug away_slug, at.logo away_logo,
    c.name competition_name, c.slug competition_slug, c.timezone, s.label season_label, s.id season_id
  FROM matches m JOIN teams ht ON ht.id=m.home_team_id JOIN teams at ON at.id=m.away_team_id
  JOIN competition_seasons s ON s.id=m.season_id JOIN competitions c ON c.id=s.competition_id`;
// Matches whose status is completed but whose result is unpublished must not leak a result.
const VISIBLE_MATCH = "m.status <> 'cancelled' OR true";

const NEWS_COLS = `a.id,a.title,a.slug,a.summary,a.featured_image,a.author_name,a.published_at,a.updated_at,a.is_featured,a.is_breaking,c.name category,c.slug category_slug`;
const TRANSFER_SELECT = `
  SELECT t.id,t.transfer_type,t.announced_on,t.effective_date,t.window_label,t.fee_terms,t.announcement_text,t.image,t.source_note,t.status,
    p.full_name player_name,p.slug player_slug,p.photo player_photo,
    ft.name from_team,ft.slug from_slug,ft.logo from_logo,tt.name to_team,tt.slug to_slug,tt.logo to_logo
  FROM transfers t JOIN players p ON p.id=t.player_id LEFT JOIN teams ft ON ft.id=t.from_team_id LEFT JOIN teams tt ON tt.id=t.to_team_id`;

const page = (req: any, size = 12) => {
  const p = Math.max(1, parseInt(req.query.page) || 1);
  return { limit: size, offset: (p - 1) * size, page: p };
};
const like = (s: any) => `%${String(s).replace(/[%_\\]/g, "\\$&")}%`;

publicRouter.get("/settings", async (_req, res) => {
  const rows = await q("SELECT key,value FROM site_settings WHERE key = ANY($1)", [PUB_SETTINGS]);
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

publicRouter.get("/home", async (_req, res) => {
  const [featured, latest, transfers, fixtures, results, teams, competitions, announcements, urgent] = await Promise.all([
    q1(`SELECT ${NEWS_COLS} FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${PUB_ARTICLE} ORDER BY a.is_featured DESC, a.published_at DESC LIMIT 1`),
    q(`SELECT ${NEWS_COLS} FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${PUB_ARTICLE} ORDER BY a.published_at DESC LIMIT 7`),
    q(`${TRANSFER_SELECT} WHERE t.status='published' ORDER BY t.announced_on DESC, t.published_at DESC LIMIT 6`),
    q(`${MATCH_SELECT} WHERE m.status IN ('scheduled','live','half_time') AND m.kickoff_at >= now() - interval '3 hours' ORDER BY m.kickoff_at LIMIT 6`),
    q(`${MATCH_SELECT} WHERE m.status='completed' AND m.result_state='published' ORDER BY m.kickoff_at DESC LIMIT 6`),
    q(`SELECT id,name,slug,logo,location,abbreviation FROM teams WHERE status='active' ORDER BY name ASC LIMIT 20`),
    q(`SELECT c.id,c.name,c.slug,c.competition_type,c.banner,c.status,s.label season_label,s.id season_id FROM competitions c
       LEFT JOIN LATERAL (SELECT * FROM competition_seasons WHERE competition_id=c.id ORDER BY is_current DESC, created_at DESC LIMIT 1) s ON true
       WHERE c.status IN ('active','upcoming') ORDER BY c.status, c.name LIMIT 6`),
    q(`SELECT id,title,slug,LEFT(body,240) excerpt,is_urgent,is_featured,published_at FROM announcements WHERE status='published' ORDER BY is_urgent DESC, published_at DESC LIMIT 5`),
    q(`SELECT id,title,slug FROM announcements WHERE status='published' AND is_urgent ORDER BY published_at DESC LIMIT 1`),
  ]);
  const standings = [];
  for (const c of competitions.filter(c => c.season_id).slice(0, 2)) {
    const s = await computeStandings(c.season_id);
    if (s && s.rows.length) standings.push({ competition: { name: c.name, slug: c.slug, season: c.season_label }, rows: s.rows.slice(0, 6) });
  }
  res.json({ featured, latest, transfers, fixtures, results, teams, competitions, announcements, urgent: urgent[0] ?? null, standings });
});

publicRouter.get("/categories", async (_q, res) => res.json(await q("SELECT id,name,slug FROM news_categories ORDER BY sort_order,name")));

publicRouter.get("/news", async (req, res) => {
  const { limit, offset, page: p } = page(req);
  const where = [PUB_ARTICLE], params: any[] = [];
  if (req.query.category) { params.push(req.query.category); where.push(`c.slug=$${params.length}`); }
  if (req.query.tag) { params.push(req.query.tag); where.push(`EXISTS (SELECT 1 FROM article_tags at JOIN news_tags t ON t.id=at.tag_id WHERE at.article_id=a.id AND t.slug=$${params.length})`); }
  if (req.query.q) { params.push(like(req.query.q)); where.push(`(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length})`); }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${w}`, params)).n;
  const items = await q(`SELECT ${NEWS_COLS} FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${w} ORDER BY a.published_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page: p, pages: Math.ceil(total / limit) });
});

publicRouter.get("/news/:slug", async (req, res) => {
  const a = await q1(`SELECT ${NEWS_COLS}, a.body FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${PUB_ARTICLE} AND a.slug=$1`, [req.params.slug]);
  if (!a) return res.status(404).json({ error: "Article not found" });
  a.tags = await q("SELECT t.name,t.slug FROM article_tags at JOIN news_tags t ON t.id=at.tag_id WHERE at.article_id=$1", [a.id]);
  a.related = await q(`SELECT ${NEWS_COLS} FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id
    WHERE ${PUB_ARTICLE} AND a.id<>$1 AND (c.slug=$2 OR EXISTS (SELECT 1 FROM article_tags x WHERE x.article_id=a.id AND x.tag_id IN (SELECT tag_id FROM article_tags WHERE article_id=$1)))
    ORDER BY a.published_at DESC LIMIT 4`, [a.id, a.category_slug]);
  res.json(a);
});

publicRouter.get("/teams", async (req, res) => {
  const { limit, offset, page: p } = page(req, 24);
  const where = ["t.status <> 'archived'"], params: any[] = [];
  if (req.query.q) { params.push(like(req.query.q)); where.push(`(t.name ILIKE $${params.length} OR t.short_name ILIKE $${params.length})`); }
  if (req.query.location) { params.push(like(req.query.location)); where.push(`t.location ILIKE $${params.length}`); }
  if (req.query.status) { params.push(req.query.status); where.push(`t.status=$${params.length}`); }
  if (req.query.competition) { params.push(req.query.competition); where.push(`EXISTS (SELECT 1 FROM competition_teams ct JOIN competition_seasons s ON s.id=ct.season_id JOIN competitions c ON c.id=s.competition_id WHERE ct.team_id=t.id AND c.slug=$${params.length})`); }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM teams t WHERE ${w}`, params)).n;
  const items = await q(`SELECT t.id,t.name,t.slug,t.logo,t.short_name,t.abbreviation,t.location,t.home_ground,t.status FROM teams t WHERE ${w} ORDER BY t.name LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page: p, pages: Math.ceil(total / limit) });
});

publicRouter.get("/teams/:slug", async (req, res) => {
  const t = await q1("SELECT * FROM teams WHERE slug=$1 AND status<>'archived'", [req.params.slug]);
  if (!t) return res.status(404).json({ error: "Team not found" });
  const [squad, recent, upcoming, comps, transfers] = await Promise.all([
    q("SELECT id,full_name,slug,photo,position,squad_number,status FROM players WHERE current_team_id=$1 AND status<>'archived' ORDER BY squad_number NULLS LAST, full_name", [t.id]),
    q(`${MATCH_SELECT} WHERE (m.home_team_id=$1 OR m.away_team_id=$1) AND m.status='completed' AND m.result_state='published' ORDER BY m.kickoff_at DESC LIMIT 5`, [t.id]),
    q(`${MATCH_SELECT} WHERE (m.home_team_id=$1 OR m.away_team_id=$1) AND m.status IN ('scheduled','live','half_time','postponed') AND m.kickoff_at>=now()-interval '3 hours' ORDER BY m.kickoff_at LIMIT 5`, [t.id]),
    q(`SELECT c.name,c.slug,s.label season_label,s.id season_id FROM competition_teams ct JOIN competition_seasons s ON s.id=ct.season_id
       JOIN competitions c ON c.id=s.competition_id WHERE ct.team_id=$1 AND s.status<>'archived' ORDER BY s.is_current DESC, s.created_at DESC`, [t.id]),
    q(`${TRANSFER_SELECT} WHERE t.status='published' AND (t.from_team_id=$1 OR t.to_team_id=$1) ORDER BY t.announced_on DESC LIMIT 10`, [t.id]),
  ]);
  for (const c of comps) {
    const s = await computeStandings(c.season_id);
    c.position = s?.rows.find(r => r.team_id === t.id)?.position ?? null;
    c.teams_count = s?.rows.length ?? 0;
  }
  const { created_at, updated_at, ...pub } = t;
  res.json({ ...pub, squad, recent, upcoming, competitions: comps, transfers });
});

publicRouter.get("/players", async (req, res) => {
  const { limit, offset, page: p } = page(req, 24);
  const where = ["p.status <> 'archived'"], params: any[] = [];
  if (req.query.q) { params.push(like(req.query.q)); where.push(`p.full_name ILIKE $${params.length}`); }
  if (req.query.team) { params.push(req.query.team); where.push(`t.slug=$${params.length}`); }
  if (req.query.position) { params.push(req.query.position); where.push(`p.position=$${params.length}`); }
  const w = where.join(" AND ");
  const base = `FROM players p LEFT JOIN teams t ON t.id=p.current_team_id WHERE ${w}`;
  const total = (await q1(`SELECT count(*)::int n ${base}`, params)).n;
  const items = await q(`SELECT p.id,p.full_name,p.slug,p.photo,p.position,p.squad_number,p.status,t.name team_name,t.slug team_slug ${base} ORDER BY p.full_name LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page: p, pages: Math.ceil(total / limit) });
});

publicRouter.get("/players/:slug", async (req, res) => {
  const p = await q1(`SELECT p.id,p.full_name,p.slug,p.photo,p.position,p.squad_number,p.nationality,p.date_of_birth,p.biography,p.status,
    p.appearances,p.goals,p.assists,t.name team_name,t.slug team_slug,t.logo team_logo
    FROM players p LEFT JOIN teams t ON t.id=p.current_team_id WHERE p.slug=$1 AND p.status<>'archived'`, [req.params.slug]);
  if (!p) return res.status(404).json({ error: "Player not found" });
  const [history, transfers] = await Promise.all([
    q("SELECT h.start_date,h.end_date,h.is_loan,t.name team_name,t.slug team_slug FROM player_team_history h JOIN teams t ON t.id=h.team_id WHERE h.player_id=$1 ORDER BY h.start_date DESC", [p.id]),
    q(`${TRANSFER_SELECT} WHERE t.status='published' AND t.player_id=$1 ORDER BY t.announced_on DESC`, [p.id]),
  ]);
  res.json({ ...p, history, transfers });
});

publicRouter.get("/transfers", async (req, res) => {
  const { limit, offset, page: p } = page(req, 20);
  const where = ["t.status='published'"], params: any[] = [];
  if (req.query.team) { params.push(req.query.team); where.push(`(ft.slug=$${params.length} OR tt.slug=$${params.length})`); }
  if (req.query.player) { params.push(like(req.query.player)); where.push(`p.full_name ILIKE $${params.length}`); }
  if (req.query.window) { params.push(req.query.window); where.push(`t.window_label=$${params.length}`); }
  if (req.query.type) { params.push(req.query.type); where.push(`t.transfer_type=$${params.length}`); }
  if (req.query.from) { params.push(req.query.from); where.push(`t.announced_on>=$${params.length}`); }
  if (req.query.to) { params.push(req.query.to); where.push(`t.announced_on<=$${params.length}`); }
  const w = where.join(" AND ");
  const from = `FROM transfers t JOIN players p ON p.id=t.player_id LEFT JOIN teams ft ON ft.id=t.from_team_id LEFT JOIN teams tt ON tt.id=t.to_team_id WHERE ${w}`;
  const total = (await q1(`SELECT count(*)::int n ${from}`, params)).n;
  const items = await q(`${TRANSFER_SELECT} WHERE ${w} ORDER BY t.announced_on DESC, t.published_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  const windows = (await q("SELECT DISTINCT window_label FROM transfers WHERE status='published' AND window_label IS NOT NULL ORDER BY 1 DESC")).map(r => r.window_label);
  res.json({ items, total, page: p, pages: Math.ceil(total / limit), windows });
});

publicRouter.get("/competitions", async (_req, res) => {
  res.json(await q(`SELECT c.id,c.name,c.slug,c.competition_type,c.banner,c.status,c.organizer,
    (SELECT count(*)::int FROM competition_seasons WHERE competition_id=c.id) seasons FROM competitions c WHERE c.status<>'archived' ORDER BY c.status, c.name`));
});

publicRouter.get("/competitions/:slug", async (req, res) => {
  const c = await q1("SELECT id,name,slug,competition_type,banner,description,organizer,venue_info,rules,timezone,status,points_win,points_draw,points_loss,tie_breaks FROM competitions WHERE slug=$1 AND status<>'archived'", [req.params.slug]);
  if (!c) return res.status(404).json({ error: "Competition not found" });
  const seasons = await q("SELECT s.id,s.label,s.start_date,s.end_date,s.is_current,s.status,s.champion_team_id,s.runner_up_team_id,ch.name champion,ru.name runner_up FROM competition_seasons s LEFT JOIN teams ch ON ch.id=s.champion_team_id LEFT JOIN teams ru ON ru.id=s.runner_up_team_id WHERE s.competition_id=$1 AND s.status<>'archived' ORDER BY s.is_current DESC, s.created_at DESC", [c.id]);
  const season = seasons.find(s => s.id === req.query.season) ?? seasons[0] ?? null;
  let standings = null, fixtures: any[] = [], results: any[] = [], teams: any[] = [], groups: any[] = [], bracket: any[] = [];
  if (season) {
    standings = (await computeStandings(season.id))?.rows ?? [];
    fixtures = await q(`${MATCH_SELECT} WHERE m.season_id=$1 AND m.status NOT IN ('completed') ORDER BY m.kickoff_at`, [season.id]);
    results = await q(`${MATCH_SELECT} WHERE m.season_id=$1 AND m.status='completed' AND m.result_state='published' ORDER BY m.kickoff_at DESC`, [season.id]);
    teams = await q("SELECT t.id,t.name,t.slug,t.logo,t.location FROM competition_teams ct JOIN teams t ON t.id=ct.team_id WHERE ct.season_id=$1 ORDER BY t.name", [season.id]);
    groups = await q("SELECT id,name FROM competition_groups WHERE season_id=$1 ORDER BY name", [season.id]);
    if (c.competition_type !== "league")
      bracket = await q(`${MATCH_SELECT} WHERE m.season_id=$1 AND m.round_label IS NOT NULL AND m.group_id IS NULL ORDER BY m.kickoff_at`, [season.id]);
  }
  const news = await q(`SELECT ${NEWS_COLS} FROM news_articles a LEFT JOIN news_categories c2 ON c2.id=a.category_id WHERE ${PUB_ARTICLE} AND (a.title ILIKE $1 OR a.summary ILIKE $1) ORDER BY a.published_at DESC LIMIT 5`.replace("c.name category,c.slug category_slug", "c2.name category,c2.slug category_slug"), [like(c.name)]);
  res.json({ ...c, seasons, season, standings, fixtures, results, teams, groups, bracket, news });
});

publicRouter.get("/standings/:seasonId", async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.seasonId)) return res.status(400).json({ error: "Bad id" });
  const s = await computeStandings(req.params.seasonId);
  s ? res.json(s.rows) : res.status(404).json({ error: "Season not found" });
});

publicRouter.get("/matches", async (req, res) => {
  const { limit, offset, page: p } = page(req, 30);
  const where = ["TRUE"], params: any[] = [];
  const f = req.query.filter;
  const tz = "Africa/Kampala";
  if (f === "today") where.push(`(m.kickoff_at AT TIME ZONE '${tz}')::date = (now() AT TIME ZONE '${tz}')::date`);
  else if (f === "upcoming") where.push("m.status IN ('scheduled','live','half_time','postponed') AND m.kickoff_at>=now()-interval '3 hours'");
  else if (f === "completed") where.push("m.status='completed' AND m.result_state='published'");
  if (req.query.competition) { params.push(req.query.competition); where.push(`c.slug=$${params.length}`); }
  const order = f === "completed" ? "m.kickoff_at DESC" : "m.kickoff_at ASC";
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM matches m JOIN competition_seasons s ON s.id=m.season_id JOIN competitions c ON c.id=s.competition_id WHERE ${w}`, params)).n;
  const items = await q(`${MATCH_SELECT} WHERE ${w} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page: p, pages: Math.ceil(total / limit) });
});

publicRouter.get("/matches/:ref", async (req, res) => {
  const m = await q1(`${MATCH_SELECT} WHERE m.reference=$1`, [req.params.ref]);
  if (!m) return res.status(404).json({ error: "Match not found" });
  const published = (await q1("SELECT result_state, report FROM matches WHERE id=$1", [m.id]));
  const isPub = published.result_state === "published";
  m.report = isPub ? published.report : null;
  m.events = isPub ? await q(`SELECT e.minute,e.event_type,e.note,t.name team_name,p.full_name player_name FROM match_events e LEFT JOIN teams t ON t.id=e.team_id LEFT JOIN players p ON p.id=e.player_id WHERE e.match_id=$1 ORDER BY e.minute`, [m.id]) : [];
  res.json(m);
});

publicRouter.get("/announcements", async (_req, res) =>
  res.json(await q("SELECT id,title,slug,body,is_urgent,is_featured,published_at FROM announcements WHERE status='published' ORDER BY is_urgent DESC, published_at DESC LIMIT 50")));

publicRouter.get("/search", async (req, res) => {
  const term = String(req.query.q || "").trim();
  if (term.length < 2) return res.json({ news: [], teams: [], players: [], competitions: [], matches: [], transfers: [] });
  const l = like(term);
  const [news, teams, players, competitions, matches, transfers] = await Promise.all([
    q(`SELECT a.title,a.slug,a.summary FROM news_articles a WHERE ${PUB_ARTICLE} AND (a.title ILIKE $1 OR a.summary ILIKE $1) ORDER BY a.published_at DESC LIMIT 8`, [l]),
    q("SELECT name,slug,logo,location FROM teams WHERE status<>'archived' AND (name ILIKE $1 OR short_name ILIKE $1) LIMIT 8", [l]),
    q("SELECT full_name,slug,position FROM players WHERE status<>'archived' AND full_name ILIKE $1 LIMIT 8", [l]),
    q("SELECT name,slug,competition_type FROM competitions WHERE status<>'archived' AND name ILIKE $1 LIMIT 8", [l]),
    q(`${MATCH_SELECT} WHERE ht.name ILIKE $1 OR at.name ILIKE $1 ORDER BY m.kickoff_at DESC LIMIT 8`, [l]),
    q(`${TRANSFER_SELECT} WHERE t.status='published' AND (p.full_name ILIKE $1 OR ft.name ILIKE $1 OR tt.name ILIKE $1) ORDER BY t.announced_on DESC LIMIT 8`, [l]),
  ]);
  res.json({ news, teams, players, competitions, matches, transfers });
});

publicRouter.get("/sitemap", async (_req, res) => {
  const [n, t, p, c] = await Promise.all([
    q("SELECT slug,updated_at FROM news_articles a WHERE " + PUB_ARTICLE),
    q("SELECT slug,updated_at FROM teams WHERE status<>'archived'"),
    q("SELECT slug,updated_at FROM players WHERE status<>'archived'"),
    q("SELECT slug,updated_at FROM competitions WHERE status<>'archived'"),
  ]);
  res.json({ news: n, teams: t, players: p, competitions: c });
});
