import { Router, Request, Response } from "express";
import multer from "multer";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { pool, q, q1, tx, uniqueSlug } from "./db.ts";
import {
  requireAuth, requirePerm, AuthedReq, audit, can,
  login, issueSession, COOKIE, createResetToken, consumeResetToken, validPassword
} from "./auth.ts";
import { computeStandings } from "./standings.ts";

export const adminRouter = Router();

// Configure file uploads for media library, logos, photos
const uploadDir = join(process.cwd(), "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (/image\/(jpeg|png|webp|gif|svg\+xml)/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are permitted (JPEG, PNG, WebP, GIF, SVG)"));
  },
});

// Helper for pagination
const getPage = (req: Request, defaultSize = 20) => {
  const p = Math.max(1, parseInt(req.query.page as string) || 1);
  const size = Math.max(1, Math.min(100, parseInt(req.query.size as string) || defaultSize));
  return { limit: size, offset: (p - 1) * size, page: p, size };
};

// -------------------------------------------------------------
// 1. AUTHENTICATION & SESSION ENDPOINTS (No auth required for login/forgot/reset)
// -------------------------------------------------------------

adminRouter.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const result = await login(email, password, req);
  if ("error" in result) return res.status(result.status || 401).json({ error: result.error });

  issueSession(res, result.id);
  const user = await q1("SELECT id,email,name,last_login_at FROM admin_users WHERE id=$1", [result.id]);
  const roles = (await q("SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1", [result.id])).map(r => r.name);
  const permissions = (await q(`SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$1`, [result.id])).map(r => r.code);
  res.json({ user: { ...user, roles, permissions } });
});

adminRouter.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  await audit(req, "auth.logout", "admin_users", (req as AuthedReq).user.id);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

adminRouter.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: (req as AuthedReq).user });
});

adminRouter.post("/auth/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!validPassword(newPassword)) {
    return res.status(400).json({ error: "New password must be at least 10 chars with numbers and letters" });
  }
  const u = (req as AuthedReq).user;
  const dbUser = await q1("SELECT password_hash FROM admin_users WHERE id=$1", [u.id]);
  const bcrypt = (await import("bcryptjs")).default;
  if (!(await bcrypt.compare(currentPassword, dbUser.password_hash))) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await q("UPDATE admin_users SET password_hash=$2, password_changed_at=now() WHERE id=$1", [u.id, hash]);
  await audit(req, "auth.change_password", "admin_users", u.id);
  issueSession(res, u.id); // re-issue token
  res.json({ ok: true, message: "Password updated successfully" });
});

adminRouter.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  const token = await createResetToken(email);
  // In development, log or return token hint for testing
  res.json({ ok: true, message: "If an active account exists with that email, reset instructions were generated.", dev_token: token });
});

adminRouter.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !validPassword(newPassword)) {
    return res.status(400).json({ error: "Invalid token or password requirements not met (min 10 chars with letters & numbers)" });
  }
  const ok = await consumeResetToken(token, newPassword);
  if (!ok) return res.status(400).json({ error: "Invalid, expired, or already-used reset token" });
  res.json({ ok: true, message: "Password has been reset. You may now log in." });
});

// All following admin endpoints require authentication
adminRouter.use(requireAuth);

// -------------------------------------------------------------
// 2. DASHBOARD OVERVIEW & AUDIT LOGS
// -------------------------------------------------------------

adminRouter.get("/dashboard", async (_req: Request, res: Response) => {
  const [
    teamsCount,
    playersCount,
    publishedNews,
    draftScheduledNews,
    activeTournaments,
    activeLeagues,
    upcomingFixtures,
    matchesAwaitingResults,
    recentTransfers,
    pendingTransfers,
    recentAudit,
  ] = await Promise.all([
    q1("SELECT count(*)::int n FROM teams WHERE status<>'archived'"),
    q1("SELECT count(*)::int n FROM players WHERE status<>'archived'"),
    q1("SELECT count(*)::int n FROM news_articles WHERE status='published'"),
    q1("SELECT count(*)::int n FROM news_articles WHERE status IN ('draft','in_review','approved','scheduled')"),
    q1("SELECT count(*)::int n FROM competitions WHERE competition_type<>'league' AND status='active'"),
    q1("SELECT count(*)::int n FROM competitions WHERE competition_type='league' AND status='active'"),
    q1("SELECT count(*)::int n FROM matches WHERE status='scheduled' AND kickoff_at>=now()"),
    q1("SELECT count(*)::int n FROM matches WHERE status='completed' AND result_state IN ('none','entered','reviewed')"),
    q("SELECT t.id, t.transfer_type, t.announced_on, t.status, p.full_name player_name, ft.name from_team, tt.name to_team FROM transfers t JOIN players p ON p.id=t.player_id LEFT JOIN teams ft ON ft.id=t.from_team_id LEFT JOIN teams tt ON tt.id=t.to_team_id ORDER BY t.created_at DESC LIMIT 5"),
    q1("SELECT count(*)::int n FROM transfers WHERE status IN ('draft','pending')"),
    q("SELECT id, user_email, action, entity, entity_id, created_at, details FROM audit_logs ORDER BY created_at DESC LIMIT 8"),
  ]);

  res.json({
    counts: {
      teams: teamsCount.n,
      players: playersCount.n,
      publishedNews: publishedNews.n,
      draftScheduledNews: draftScheduledNews.n,
      activeTournaments: activeTournaments.n,
      activeLeagues: activeLeagues.n,
      upcomingFixtures: upcomingFixtures.n,
      matchesAwaitingResults: matchesAwaitingResults.n,
      pendingTransfers: pendingTransfers.n,
    },
    recentTransfers,
    recentAudit,
  });
});

adminRouter.get("/audit-logs", requirePerm("audit.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req, 25);
  const where: string[] = ["TRUE"], params: any[] = [];
  if (req.query.action) {
    params.push(`%${req.query.action}%`);
    where.push(`action ILIKE $${params.length}`);
  }
  if (req.query.entity) {
    params.push(req.query.entity);
    where.push(`entity = $${params.length}`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM audit_logs WHERE ${w}`, params)).n;
  const items = await q(`SELECT * FROM audit_logs WHERE ${w} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

// -------------------------------------------------------------
// 3. NEWS MANAGEMENT
// -------------------------------------------------------------

adminRouter.get("/news", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req);
  const where: string[] = ["TRUE"], params: any[] = [];
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`a.status = $${params.length}`);
  }
  if (req.query.category) {
    params.push(req.query.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(`(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length})`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM news_articles a LEFT JOIN news_categories c ON c.id=a.category_id WHERE ${w}`, params)).n;
  const items = await q(`
    SELECT a.*, c.name category_name, c.slug category_slug, u.name author_user_name
    FROM news_articles a
    LEFT JOIN news_categories c ON c.id=a.category_id
    LEFT JOIN admin_users u ON u.id=a.created_by
    WHERE ${w}
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.get("/news/:id", requirePerm("content.view"), async (req: Request, res: Response) => {
  const item = await q1("SELECT * FROM news_articles WHERE id=$1", [req.params.id]);
  if (!item) return res.status(404).json({ error: "Article not found" });
  item.tags = await q("SELECT t.id, t.name, t.slug FROM article_tags at JOIN news_tags t ON t.id=at.tag_id WHERE at.article_id=$1", [item.id]);
  res.json(item);
});

adminRouter.post("/news", requirePerm("news.write"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { title, summary, body, featured_image, author_name, category_id, is_featured, is_breaking, status, publish_at, tags } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  const targetStatus = status || "draft";
  const slug = await uniqueSlug("news_articles", title);

  const article = await tx(async (c) => {
    const isPub = targetStatus === "published";
    const publishedAt = isPub ? new Date() : (targetStatus === "scheduled" && publish_at ? new Date(publish_at) : null);
    const pubBy = isPub ? u.id : null;

    const res = await c.query(
      `INSERT INTO news_articles(
        title, slug, summary, body, featured_image, author_name, category_id,
        status, is_featured, is_breaking, publish_at, published_at,
        created_by, published_by
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        title, slug, summary || null, body || "", featured_image || null,
        author_name || u.name, category_id ? parseInt(category_id) : null,
        targetStatus, Boolean(is_featured), Boolean(is_breaking),
        publish_at ? new Date(publish_at) : null, publishedAt, u.id, pubBy
      ]
    );
    const row = res.rows[0];

    if (Array.isArray(tags)) {
      for (const t of tags) {
        const tagSlug = await uniqueSlug("news_tags", t);
        const tagRow = (await c.query("INSERT INTO news_tags(name, slug) VALUES($1, $2) ON CONFLICT(slug) DO UPDATE SET name=$1 RETURNING id", [t, tagSlug])).rows[0];
        await c.query("INSERT INTO article_tags(article_id, tag_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [row.id, tagRow.id]);
      }
    }
    return row;
  });

  await audit(req, "news.create", "news_articles", article.id, { title, status: article.status });
  res.status(201).json(article);
});

adminRouter.put("/news/:id", requirePerm("news.write"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const existing = await q1("SELECT * FROM news_articles WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Article not found" });

  const { title, summary, body, featured_image, author_name, category_id, is_featured, is_breaking, status, publish_at, tags } = req.body;
  const slug = title && title !== existing.title ? await uniqueSlug("news_articles", title, existing.id) : existing.slug;

  const targetStatus = status || existing.status;
  // If promoting to published, require news.publish permission
  if (targetStatus === "published" && existing.status !== "published" && !can(u, "news.publish")) {
    return res.status(403).json({ error: "Permission 'news.publish' required to publish articles" });
  }

  const updated = await tx(async (c) => {
    let publishedAt = existing.published_at;
    let publishedBy = existing.published_by;
    let approvedBy = existing.approved_by;

    if (targetStatus === "published" && !existing.published_at) {
      publishedAt = new Date();
      publishedBy = u.id;
    }
    if (targetStatus === "approved" && !existing.approved_by) {
      approvedBy = u.id;
    }

    const res = await c.query(
      `UPDATE news_articles SET
        title=COALESCE($2, title),
        slug=$3,
        summary=$4,
        body=COALESCE($5, body),
        featured_image=$6,
        author_name=COALESCE($7, author_name),
        category_id=$8,
        status=$9,
        is_featured=COALESCE($10, is_featured),
        is_breaking=COALESCE($11, is_breaking),
        publish_at=$12,
        published_at=$13,
        published_by=$14,
        approved_by=$15,
        updated_at=now()
      WHERE id=$1 RETURNING *`,
      [
        existing.id,
        title ?? existing.title,
        slug,
        summary ?? existing.summary,
        body ?? existing.body,
        featured_image ?? existing.featured_image,
        author_name ?? existing.author_name,
        category_id !== undefined ? (category_id ? parseInt(category_id) : null) : existing.category_id,
        targetStatus,
        is_featured !== undefined ? Boolean(is_featured) : existing.is_featured,
        is_breaking !== undefined ? Boolean(is_breaking) : existing.is_breaking,
        publish_at ? new Date(publish_at) : (publish_at === null ? null : existing.publish_at),
        publishedAt,
        publishedBy,
        approvedBy,
      ]
    );

    if (Array.isArray(tags)) {
      await c.query("DELETE FROM article_tags WHERE article_id=$1", [existing.id]);
      for (const t of tags) {
        const tagSlug = await uniqueSlug("news_tags", t);
        const tagRow = (await c.query("INSERT INTO news_tags(name, slug) VALUES($1, $2) ON CONFLICT(slug) DO UPDATE SET name=$1 RETURNING id", [t, tagSlug])).rows[0];
        await c.query("INSERT INTO article_tags(article_id, tag_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [existing.id, tagRow.id]);
      }
    }
    return res.rows[0];
  });

  await audit(req, "news.update", "news_articles", updated.id, { title: updated.title, status: updated.status });
  res.json(updated);
});

adminRouter.delete("/news/:id", requirePerm("records.delete"), async (req: Request, res: Response) => {
  const item = await q1("SELECT id, title FROM news_articles WHERE id=$1", [req.params.id]);
  if (!item) return res.status(404).json({ error: "Article not found" });
  await q("DELETE FROM news_articles WHERE id=$1", [item.id]);
  await audit(req, "news.delete", "news_articles", item.id, { title: item.title });
  res.json({ ok: true });
});

// Categories
adminRouter.get("/categories", requirePerm("content.view"), async (_req: Request, res: Response) => {
  res.json(await q("SELECT * FROM news_categories ORDER BY sort_order, name"));
});
adminRouter.post("/categories", requirePerm("news.write"), async (req: Request, res: Response) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: "Category name required" });
  const slug = await uniqueSlug("news_categories", name);
  const row = await q1("INSERT INTO news_categories(name, slug, sort_order) VALUES($1, $2, $3) RETURNING *", [name, slug, parseInt(sort_order) || 0]);
  await audit(req, "category.create", "news_categories", row.id, { name });
  res.status(201).json(row);
});

// -------------------------------------------------------------
// 4. TEAMS MANAGEMENT
// -------------------------------------------------------------

adminRouter.get("/teams", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req, 30);
  const where = ["TRUE"], params: any[] = [];
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`t.status = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(`(t.name ILIKE $${params.length} OR t.short_name ILIKE $${params.length} OR t.location ILIKE $${params.length})`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM teams t WHERE ${w}`, params)).n;
  const items = await q(`
    SELECT t.*,
      (SELECT count(*)::int FROM players p WHERE p.current_team_id=t.id AND p.status<>'archived') squad_size
    FROM teams t
    WHERE ${w}
    ORDER BY t.name
    LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.get("/teams/:id", requirePerm("content.view"), async (req: Request, res: Response) => {
  const team = await q1("SELECT * FROM teams WHERE id=$1", [req.params.id]);
  if (!team) return res.status(404).json({ error: "Team not found" });
  team.squad = await q("SELECT * FROM players WHERE current_team_id=$1 AND status<>'archived' ORDER BY squad_number NULLS LAST, full_name", [team.id]);
  team.competitions = await q(`
    SELECT c.name, c.slug, s.label season_label, s.id season_id
    FROM competition_teams ct
    JOIN competition_seasons s ON s.id=ct.season_id
    JOIN competitions c ON c.id=s.competition_id
    WHERE ct.team_id=$1`, [team.id]);
  res.json(team);
});

adminRouter.post("/teams", requirePerm("teams.manage"), async (req: Request, res: Response) => {
  const { name, short_name, abbreviation, logo, description, history, home_ground, location, founded_year, colors, coach, contact, social_links, status } = req.body;
  if (!name) return res.status(400).json({ error: "Team name is required" });
  const slug = await uniqueSlug("teams", name);
  const row = await q1(
    `INSERT INTO teams(
      name, slug, short_name, abbreviation, logo, description, history,
      home_ground, location, founded_year, colors, coach, contact, social_links, status
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      name, slug, short_name || null, abbreviation || null, logo || null,
      description || null, history || null, home_ground || null, location || null,
      founded_year ? parseInt(founded_year) : null, colors || null, coach || null,
      contact || null, social_links || null, status || "active"
    ]
  );
  await audit(req, "teams.create", "teams", row.id, { name });
  res.status(201).json(row);
});

adminRouter.put("/teams/:id", requirePerm("teams.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM teams WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Team not found" });

  const { name, short_name, abbreviation, logo, description, history, home_ground, location, founded_year, colors, coach, contact, social_links, status } = req.body;
  const slug = name && name !== existing.name ? await uniqueSlug("teams", name, existing.id) : existing.slug;

  const row = await q1(
    `UPDATE teams SET
      name=COALESCE($2, name),
      slug=$3,
      short_name=$4,
      abbreviation=$5,
      logo=$6,
      description=$7,
      history=$8,
      home_ground=$9,
      location=$10,
      founded_year=$11,
      colors=$12,
      coach=$13,
      contact=$14,
      social_links=$15,
      status=COALESCE($16, status),
      updated_at=now()
    WHERE id=$1 RETURNING *`,
    [
      existing.id,
      name ?? existing.name,
      slug,
      short_name ?? existing.short_name,
      abbreviation ?? existing.abbreviation,
      logo ?? existing.logo,
      description ?? existing.description,
      history ?? existing.history,
      home_ground ?? existing.home_ground,
      location ?? existing.location,
      founded_year !== undefined ? (founded_year ? parseInt(founded_year) : null) : existing.founded_year,
      colors ?? existing.colors,
      coach ?? existing.coach,
      contact ?? existing.contact,
      social_links ?? existing.social_links,
      status ?? existing.status,
    ]
  );
  await audit(req, "teams.update", "teams", row.id, { name: row.name });
  res.json(row);
});

adminRouter.delete("/teams/:id", requirePerm("records.delete"), async (req: Request, res: Response) => {
  const team = await q1("SELECT id, name FROM teams WHERE id=$1", [req.params.id]);
  if (!team) return res.status(404).json({ error: "Team not found" });

  // Soft delete / archive to protect match and transfer histories
  await q("UPDATE teams SET status='archived', updated_at=now() WHERE id=$1", [team.id]);
  await audit(req, "teams.archive", "teams", team.id, { name: team.name });
  res.json({ ok: true, message: "Team archived safely to preserve match histories." });
});

// -------------------------------------------------------------
// 5. PLAYERS MANAGEMENT
// -------------------------------------------------------------

adminRouter.get("/players", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req, 30);
  const where = ["TRUE"], params: any[] = [];
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`p.status = $${params.length}`);
  }
  if (req.query.team_id) {
    params.push(req.query.team_id);
    where.push(`p.current_team_id = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(`p.full_name ILIKE $${params.length}`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM players p WHERE ${w}`, params)).n;
  const items = await q(`
    SELECT p.*, t.name team_name, t.slug team_slug, t.logo team_logo
    FROM players p
    LEFT JOIN teams t ON t.id=p.current_team_id
    WHERE ${w}
    ORDER BY p.full_name
    LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.get("/players/:id", requirePerm("content.view"), async (req: Request, res: Response) => {
  const player = await q1(`
    SELECT p.*, t.name team_name, t.slug team_slug, t.logo team_logo
    FROM players p
    LEFT JOIN teams t ON t.id=p.current_team_id
    WHERE p.id=$1`, [req.params.id]);
  if (!player) return res.status(404).json({ error: "Player not found" });

  player.history = await q(`
    SELECT h.*, t.name team_name
    FROM player_team_history h
    JOIN teams t ON t.id=h.team_id
    WHERE h.player_id=$1
    ORDER BY h.start_date DESC`, [player.id]);

  player.transfers = await q(`
    SELECT t.*, ft.name from_team, tt.name to_team
    FROM transfers t
    LEFT JOIN teams ft ON ft.id=t.from_team_id
    LEFT JOIN teams tt ON tt.id=t.to_team_id
    WHERE t.player_id=$1
    ORDER BY t.announced_on DESC`, [player.id]);

  res.json(player);
});

adminRouter.post("/players", requirePerm("players.manage"), async (req: Request, res: Response) => {
  const { full_name, photo, position, squad_number, nationality, date_of_birth, biography, current_team_id, status, appearances, goals, assists } = req.body;
  if (!full_name) return res.status(400).json({ error: "Player full name is required" });
  const slug = await uniqueSlug("players", full_name);

  const player = await tx(async (c) => {
    const res = await c.query(
      `INSERT INTO players(
        full_name, slug, photo, position, squad_number, nationality,
        date_of_birth, biography, current_team_id, status, appearances, goals, assists
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        full_name, slug, photo || null, position || null,
        squad_number ? parseInt(squad_number) : null, nationality || "Uganda",
        date_of_birth ? new Date(date_of_birth) : null, biography || null,
        current_team_id || null, status || "active",
        parseInt(appearances) || 0, parseInt(goals) || 0, parseInt(assists) || 0
      ]
    );
    const p = res.rows[0];
    if (p.current_team_id) {
      await c.query(
        "INSERT INTO player_team_history(player_id, team_id, start_date) VALUES($1, $2, current_date)",
        [p.id, p.current_team_id]
      );
    }
    return p;
  });

  await audit(req, "players.create", "players", player.id, { full_name });
  res.status(201).json(player);
});

adminRouter.put("/players/:id", requirePerm("players.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM players WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Player not found" });

  const { full_name, photo, position, squad_number, nationality, date_of_birth, biography, current_team_id, status, appearances, goals, assists } = req.body;
  const slug = full_name && full_name !== existing.full_name ? await uniqueSlug("players", full_name, existing.id) : existing.slug;

  const updated = await tx(async (c) => {
    // If team changed directly here (not via transfer workflow), manage history
    if (current_team_id !== undefined && current_team_id !== existing.current_team_id) {
      // Close existing open history
      await c.query("UPDATE player_team_history SET end_date=current_date WHERE player_id=$1 AND end_date IS NULL", [existing.id]);
      if (current_team_id) {
        await c.query("INSERT INTO player_team_history(player_id, team_id, start_date) VALUES($1, $2, current_date)", [existing.id, current_team_id]);
      }
    }

    const res = await c.query(
      `UPDATE players SET
        full_name=COALESCE($2, full_name),
        slug=$3,
        photo=$4,
        position=$5,
        squad_number=$6,
        nationality=$7,
        date_of_birth=$8,
        biography=$9,
        current_team_id=$10,
        status=COALESCE($11, status),
        appearances=COALESCE($12, appearances),
        goals=COALESCE($13, goals),
        assists=COALESCE($14, assists),
        updated_at=now()
      WHERE id=$1 RETURNING *`,
      [
        existing.id,
        full_name ?? existing.full_name,
        slug,
        photo ?? existing.photo,
        position ?? existing.position,
        squad_number !== undefined ? (squad_number ? parseInt(squad_number) : null) : existing.squad_number,
        nationality ?? existing.nationality,
        date_of_birth ? new Date(date_of_birth) : (date_of_birth === null ? null : existing.date_of_birth),
        biography ?? existing.biography,
        current_team_id !== undefined ? (current_team_id || null) : existing.current_team_id,
        status ?? existing.status,
        appearances !== undefined ? parseInt(appearances) : existing.appearances,
        goals !== undefined ? parseInt(goals) : existing.goals,
        assists !== undefined ? parseInt(assists) : existing.assists,
      ]
    );
    return res.rows[0];
  });

  await audit(req, "players.update", "players", updated.id, { full_name: updated.full_name });
  res.json(updated);
});

adminRouter.delete("/players/:id", requirePerm("records.delete"), async (req: Request, res: Response) => {
  const p = await q1("SELECT id, full_name FROM players WHERE id=$1", [req.params.id]);
  if (!p) return res.status(404).json({ error: "Player not found" });
  await q("UPDATE players SET status='archived', updated_at=now() WHERE id=$1", [p.id]);
  await audit(req, "players.archive", "players", p.id, { full_name: p.full_name });
  res.json({ ok: true });
});

// -------------------------------------------------------------
// 6. TRANSFER CENTRE & ATOMIC PUBLISHING WORKFLOW
// -------------------------------------------------------------

adminRouter.get("/transfers", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req);
  const where = ["TRUE"], params: any[] = [];
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`t.status = $${params.length}`);
  }
  if (req.query.type) {
    params.push(req.query.type);
    where.push(`t.transfer_type = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(`(p.full_name ILIKE $${params.length} OR ft.name ILIKE $${params.length} OR tt.name ILIKE $${params.length})`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM transfers t JOIN players p ON p.id=t.player_id LEFT JOIN teams ft ON ft.id=t.from_team_id LEFT JOIN teams tt ON tt.id=t.to_team_id WHERE ${w}`, params)).n;
  const items = await q(`
    SELECT t.*,
      p.full_name player_name, p.photo player_photo,
      ft.name from_team, ft.logo from_logo,
      tt.name to_team, tt.logo to_logo,
      u1.name creator_name, u2.name verifier_name, u3.name publisher_name
    FROM transfers t
    JOIN players p ON p.id=t.player_id
    LEFT JOIN teams ft ON ft.id=t.from_team_id
    LEFT JOIN teams tt ON tt.id=t.to_team_id
    LEFT JOIN admin_users u1 ON u1.id=t.created_by
    LEFT JOIN admin_users u2 ON u2.id=t.verified_by
    LEFT JOIN admin_users u3 ON u3.id=t.published_by
    WHERE ${w}
    ORDER BY t.announced_on DESC, t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.get("/transfers/:id", requirePerm("content.view"), async (req: Request, res: Response) => {
  const t = await q1(`
    SELECT t.*,
      p.full_name player_name, p.photo player_photo,
      ft.name from_team, tt.name to_team
    FROM transfers t
    JOIN players p ON p.id=t.player_id
    LEFT JOIN teams ft ON ft.id=t.from_team_id
    LEFT JOIN teams tt ON tt.id=t.to_team_id
    WHERE t.id=$1`, [req.params.id]);
  if (!t) return res.status(404).json({ error: "Transfer not found" });
  res.json(t);
});

adminRouter.post("/transfers", requirePerm("transfers.manage"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { player_id, from_team_id, to_team_id, transfer_type, announced_on, effective_date, window_label, fee_terms, announcement_text, image, source_note, status } = req.body;
  if (!player_id || !transfer_type) return res.status(400).json({ error: "Player and transfer type are required" });

  const targetStatus = status || "draft";
  const row = await q1(
    `INSERT INTO transfers(
      player_id, from_team_id, to_team_id, transfer_type, announced_on,
      effective_date, window_label, fee_terms, announcement_text, image,
      source_note, status, created_by
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      player_id, from_team_id || null, to_team_id || null, transfer_type,
      announced_on ? new Date(announced_on) : new Date(),
      effective_date ? new Date(effective_date) : null,
      window_label || null, fee_terms || null, announcement_text || null,
      image || null, source_note || null, targetStatus, u.id
    ]
  );
  await audit(req, "transfers.create", "transfers", row.id, { player_id, transfer_type, status: row.status });
  res.status(201).json(row);
});

adminRouter.put("/transfers/:id", requirePerm("transfers.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM transfers WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Transfer not found" });

  const { from_team_id, to_team_id, transfer_type, announced_on, effective_date, window_label, fee_terms, announcement_text, image, source_note } = req.body;
  const row = await q1(
    `UPDATE transfers SET
      from_team_id=$2,
      to_team_id=$3,
      transfer_type=COALESCE($4, transfer_type),
      announced_on=COALESCE($5, announced_on),
      effective_date=$6,
      window_label=$7,
      fee_terms=$8,
      announcement_text=$9,
      image=$10,
      source_note=$11,
      updated_at=now()
    WHERE id=$1 RETURNING *`,
    [
      existing.id,
      from_team_id !== undefined ? (from_team_id || null) : existing.from_team_id,
      to_team_id !== undefined ? (to_team_id || null) : existing.to_team_id,
      transfer_type ?? existing.transfer_type,
      announced_on ? new Date(announced_on) : existing.announced_on,
      effective_date ? new Date(effective_date) : (effective_date === null ? null : existing.effective_date),
      window_label ?? existing.window_label,
      fee_terms ?? existing.fee_terms,
      announcement_text ?? existing.announcement_text,
      image ?? existing.image,
      source_note ?? existing.source_note,
    ]
  );
  await audit(req, "transfers.update", "transfers", row.id, { status: row.status });
  res.json(row);
});

// Verification step: moves transfer to confirmed or rejected
adminRouter.post("/transfers/:id/verify", requirePerm("transfers.verify"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { decision, note } = req.body; // 'confirmed' or 'rejected'
  if (!["confirmed", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'confirmed' or 'rejected'" });
  }
  const existing = await q1("SELECT * FROM transfers WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Transfer not found" });

  const row = await q1(
    `UPDATE transfers SET
      status=$2, verified_by=$3, source_note=COALESCE($4, source_note), updated_at=now()
    WHERE id=$1 RETURNING *`,
    [existing.id, decision, u.id, note || null]
  );
  await audit(req, "transfers.verify", "transfers", row.id, { decision, note });
  res.json(row);
});

// Safe atomic publication: updates transfer status to published AND safely updates player's current_team and player_team_history
adminRouter.post("/transfers/:id/publish", requirePerm("transfers.publish"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const existing = await q1("SELECT * FROM transfers WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Transfer not found" });

  if (existing.status !== "confirmed" && existing.status !== "published") {
    return res.status(400).json({ error: "Only verified (confirmed) transfers can be published. Please confirm first." });
  }

  const result = await tx(async (c) => {
    // 1. Mark transfer published
    const tRes = await c.query(
      `UPDATE transfers SET status='published', published_by=$2, published_at=now(), updated_at=now() WHERE id=$1 RETURNING *`,
      [existing.id, u.id]
    );
    const transfer = tRes.rows[0];

    // 2. Safely apply to player record if to_team or departure
    const isLoan = transfer.transfer_type.includes("loan");
    const isDeparture = transfer.transfer_type === "departure";
    const nextTeamId = isDeparture ? null : (transfer.to_team_id || null);

    // Close any previous open history
    await c.query(
      "UPDATE player_team_history SET end_date=current_date WHERE player_id=$1 AND end_date IS NULL",
      [transfer.player_id]
    );

    // If assigned to a new team, open a new history row
    if (nextTeamId) {
      await c.query(
        "INSERT INTO player_team_history(player_id, team_id, start_date, is_loan, transfer_id) VALUES($1, $2, current_date, $3, $4)",
        [transfer.player_id, nextTeamId, isLoan, transfer.id]
      );
    }

    // Update player current_team_id
    await c.query(
      "UPDATE players SET current_team_id=$2, updated_at=now() WHERE id=$1",
      [transfer.player_id, nextTeamId]
    );

    return transfer;
  });

  await audit(req, "transfers.publish", "transfers", result.id, { player_id: result.player_id, to_team_id: result.to_team_id });
  res.json({ ok: true, transfer: result, message: "Transfer published and player squad affiliation atomically updated." });
});

// -------------------------------------------------------------
// 7. COMPETITIONS & SEASONS & GROUPS
// -------------------------------------------------------------

adminRouter.get("/competitions", requirePerm("content.view"), async (_req: Request, res: Response) => {
  const items = await q(`
    SELECT c.*,
      (SELECT count(*)::int FROM competition_seasons s WHERE s.competition_id=c.id) seasons_count
    FROM competitions c
    ORDER BY c.status, c.name`);
  res.json(items);
});

adminRouter.get("/competitions/:id", requirePerm("content.view"), async (req: Request, res: Response) => {
  const c = await q1("SELECT * FROM competitions WHERE id=$1", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Competition not found" });
  c.seasons = await q(`
    SELECT s.*, ch.name champion_name, ru.name runner_up_name,
      (SELECT count(*)::int FROM competition_teams ct WHERE ct.season_id=s.id) teams_count,
      (SELECT count(*)::int FROM matches m WHERE m.season_id=s.id) matches_count
    FROM competition_seasons s
    LEFT JOIN teams ch ON ch.id=s.champion_team_id
    LEFT JOIN teams ru ON ru.id=s.runner_up_team_id
    WHERE s.competition_id=$1
    ORDER BY s.is_current DESC, s.created_at DESC`, [c.id]);
  res.json(c);
});

adminRouter.post("/competitions", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const { name, competition_type, banner, description, organizer, venue_info, rules, timezone, points_win, points_draw, points_loss, tie_breaks, status, season_label } = req.body;
  if (!name) return res.status(400).json({ error: "Competition name is required" });
  const slug = await uniqueSlug("competitions", name);

  const comp = await tx(async (c) => {
    const res = await c.query(
      `INSERT INTO competitions(
        name, slug, competition_type, banner, description, organizer,
        venue_info, rules, timezone, points_win, points_draw, points_loss,
        tie_breaks, status
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        name, slug, competition_type || "league", banner || null,
        description || null, organizer || null, venue_info || null, rules || null,
        timezone || "Africa/Kampala", parseInt(points_win) || 3,
        parseInt(points_draw) || 1, parseInt(points_loss) || 0,
        tie_breaks || "goal_difference,goals_for", status || "upcoming"
      ]
    );
    const row = res.rows[0];

    // Automatically create the initial season if provided
    const label = season_label || "2026/2027";
    await c.query(
      "INSERT INTO competition_seasons(competition_id, label, is_current, status) VALUES($1, $2, true, 'active')",
      [row.id, label]
    );
    return row;
  });

  await audit(req, "competitions.create", "competitions", comp.id, { name });
  res.status(201).json(comp);
});

adminRouter.put("/competitions/:id", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM competitions WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Competition not found" });

  const { name, competition_type, banner, description, organizer, venue_info, rules, timezone, points_win, points_draw, points_loss, tie_breaks, status } = req.body;
  const slug = name && name !== existing.name ? await uniqueSlug("competitions", name, existing.id) : existing.slug;

  const row = await q1(
    `UPDATE competitions SET
      name=COALESCE($2, name),
      slug=$3,
      competition_type=COALESCE($4, competition_type),
      banner=$5,
      description=$6,
      organizer=$7,
      venue_info=$8,
      rules=$9,
      timezone=COALESCE($10, timezone),
      points_win=COALESCE($11, points_win),
      points_draw=COALESCE($12, points_draw),
      points_loss=COALESCE($13, points_loss),
      tie_breaks=COALESCE($14, tie_breaks),
      status=COALESCE($15, status),
      updated_at=now()
    WHERE id=$1 RETURNING *`,
    [
      existing.id,
      name ?? existing.name,
      slug,
      competition_type ?? existing.competition_type,
      banner ?? existing.banner,
      description ?? existing.description,
      organizer ?? existing.organizer,
      venue_info ?? existing.venue_info,
      rules ?? existing.rules,
      timezone ?? existing.timezone,
      points_win !== undefined ? parseInt(points_win) : existing.points_win,
      points_draw !== undefined ? parseInt(points_draw) : existing.points_draw,
      points_loss !== undefined ? parseInt(points_loss) : existing.points_loss,
      tie_breaks ?? existing.tie_breaks,
      status ?? existing.status,
    ]
  );
  await audit(req, "competitions.update", "competitions", row.id, { name: row.name });
  res.json(row);
});

// Season endpoints
adminRouter.post("/competitions/:id/seasons", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const { label, start_date, end_date, is_current, status } = req.body;
  if (!label) return res.status(400).json({ error: "Season label (e.g. 2026/2027) is required" });
  const compId = req.params.id;

  if (is_current) {
    await q("UPDATE competition_seasons SET is_current=false WHERE competition_id=$1", [compId]);
  }
  const row = await q1(
    "INSERT INTO competition_seasons(competition_id, label, start_date, end_date, is_current, status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [compId, label, start_date ? new Date(start_date) : null, end_date ? new Date(end_date) : null, Boolean(is_current), status || "upcoming"]
  );
  await audit(req, "seasons.create", "competition_seasons", row.id, { compId, label });
  res.status(201).json(row);
});

// Manage participating teams in a season
adminRouter.get("/seasons/:seasonId/teams", requirePerm("content.view"), async (req: Request, res: Response) => {
  const teams = await q(`
    SELECT t.id, t.name, t.slug, t.logo, t.location, ct.group_id, g.name group_name
    FROM competition_teams ct
    JOIN teams t ON t.id=ct.team_id
    LEFT JOIN competition_groups g ON g.id=ct.group_id
    WHERE ct.season_id=$1
    ORDER BY t.name`, [req.params.seasonId]);
  res.json(teams);
});

adminRouter.post("/seasons/:seasonId/teams", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const { team_id, group_id } = req.body;
  if (!team_id) return res.status(400).json({ error: "team_id is required" });
  await q(
    "INSERT INTO competition_teams(season_id, team_id, group_id) VALUES($1, $2, $3) ON CONFLICT(season_id, team_id) DO UPDATE SET group_id=$3",
    [req.params.seasonId, team_id, group_id || null]
  );
  await audit(req, "seasons.add_team", "competition_teams", req.params.seasonId, { team_id, group_id });
  res.json({ ok: true });
});

adminRouter.delete("/seasons/:seasonId/teams/:teamId", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  await q("DELETE FROM competition_teams WHERE season_id=$1 AND team_id=$2", [req.params.seasonId, req.params.teamId]);
  await audit(req, "seasons.remove_team", "competition_teams", req.params.seasonId, { teamId: req.params.teamId });
  res.json({ ok: true });
});

// Groups
adminRouter.get("/seasons/:seasonId/groups", requirePerm("content.view"), async (req: Request, res: Response) => {
  res.json(await q("SELECT * FROM competition_groups WHERE season_id=$1 ORDER BY name", [req.params.seasonId]));
});
adminRouter.post("/seasons/:seasonId/groups", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Group name required" });
  const row = await q1("INSERT INTO competition_groups(season_id, name) VALUES($1, $2) RETURNING *", [req.params.seasonId, name]);
  res.status(201).json(row);
});

// -------------------------------------------------------------
// 8. FIXTURES & MATCH RESULTS
// -------------------------------------------------------------

adminRouter.get("/matches", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req, 40);
  const where = ["TRUE"], params: any[] = [];
  if (req.query.season_id) {
    params.push(req.query.season_id);
    where.push(`m.season_id = $${params.length}`);
  }
  if (req.query.status) {
    params.push(req.query.status);
    where.push(`m.status = $${params.length}`);
  }
  if (req.query.result_state) {
    params.push(req.query.result_state);
    where.push(`m.result_state = $${params.length}`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM matches m WHERE ${w}`, params)).n;
  const items = await q(`
    SELECT m.*,
      ht.name home_team, ht.logo home_logo,
      at.name away_team, at.logo away_logo,
      c.name competition_name, s.label season_label
    FROM matches m
    JOIN teams ht ON ht.id=m.home_team_id
    JOIN teams at ON at.id=m.away_team_id
    JOIN competition_seasons s ON s.id=m.season_id
    JOIN competitions c ON c.id=s.competition_id
    WHERE ${w}
    ORDER BY m.kickoff_at DESC
    LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.post("/matches", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const { season_id, group_id, round_label, home_team_id, away_team_id, kickoff_at, venue } = req.body;
  if (!season_id || !home_team_id || !away_team_id || !kickoff_at) {
    return res.status(400).json({ error: "Season, home team, away team, and kickoff date/time are required" });
  }
  if (home_team_id === away_team_id) {
    return res.status(400).json({ error: "Home team and away team cannot be the same" });
  }

  const crypto = await import("node:crypto");
  const reference = `M-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const row = await q1(
    `INSERT INTO matches(
      reference, season_id, group_id, round_label, home_team_id, away_team_id,
      kickoff_at, venue, status
    ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'scheduled') RETURNING *`,
    [reference, season_id, group_id || null, round_label || null, home_team_id, away_team_id, new Date(kickoff_at), venue || null]
  );
  await audit(req, "matches.schedule", "matches", row.id, { home_team_id, away_team_id, kickoff_at });
  res.status(201).json(row);
});

adminRouter.put("/matches/:id", requirePerm("competitions.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM matches WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Match not found" });

  const { kickoff_at, venue, round_label, group_id, status } = req.body;
  const row = await q1(
    `UPDATE matches SET
      kickoff_at=COALESCE($2, kickoff_at),
      venue=$3,
      round_label=$4,
      group_id=$5,
      status=COALESCE($6, status),
      updated_at=now()
    WHERE id=$1 RETURNING *`,
    [
      existing.id,
      kickoff_at ? new Date(kickoff_at) : existing.kickoff_at,
      venue ?? existing.venue,
      round_label ?? existing.round_label,
      group_id !== undefined ? (group_id || null) : existing.group_id,
      status ?? existing.status,
    ]
  );
  await audit(req, "matches.update", "matches", row.id, { status: row.status });
  res.json(row);
});

// Result entry & publish
adminRouter.post("/matches/:id/result", requirePerm("results.enter"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { home_score, away_score, ht_home_score, ht_away_score, report, events, publish } = req.body;
  const hs = parseInt(home_score);
  const as = parseInt(away_score);
  if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
    return res.status(400).json({ error: "Valid non-negative scores are required" });
  }

  const existing = await q1("SELECT * FROM matches WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Match not found" });

  const isPublish = Boolean(publish);
  if (isPublish && !can(u, "results.publish")) {
    return res.status(403).json({ error: "Permission 'results.publish' required to publish match results" });
  }

  const resultState = isPublish ? "published" : "entered";
  const updated = await tx(async (c) => {
    const res = await c.query(
      `UPDATE matches SET
        home_score=$2, away_score=$3,
        ht_home_score=$4, ht_away_score=$5,
        status='completed',
        result_state=$6,
        report=$7,
        result_entered_by=COALESCE(result_entered_by, $8),
        result_published_by=CASE WHEN $9 THEN $8 ELSE result_published_by END,
        updated_at=now()
      WHERE id=$1 RETURNING *`,
      [
        existing.id, hs, as,
        ht_home_score !== undefined ? parseInt(ht_home_score) : null,
        ht_away_score !== undefined ? parseInt(ht_away_score) : null,
        resultState, report || null, u.id, isPublish
      ]
    );
    const m = res.rows[0];

    // Events if supplied
    if (Array.isArray(events)) {
      await c.query("DELETE FROM match_events WHERE match_id=$1", [m.id]);
      for (const ev of events) {
        if (!ev.event_type) continue;
        await c.query(
          "INSERT INTO match_events(match_id, minute, event_type, team_id, player_id, note) VALUES($1,$2,$3,$4,$5,$6)",
          [m.id, parseInt(ev.minute) || 0, ev.event_type, ev.team_id || null, ev.player_id || null, ev.note || null]
        );
      }
    }
    return m;
  });

  await audit(req, isPublish ? "results.publish" : "results.enter", "matches", updated.id, {
    score: `${hs} - ${as}`,
    result_state: resultState,
  });

  // Return recalculated standings for that season
  const standings = await computeStandings(updated.season_id);
  res.json({ match: updated, standings: standings?.rows });
});

// -------------------------------------------------------------
// 9. STANDINGS & AUDITED MANUAL ADJUSTMENTS
// -------------------------------------------------------------

adminRouter.get("/standings/:seasonId", requirePerm("content.view"), async (req: Request, res: Response) => {
  const data = await computeStandings(req.params.seasonId);
  if (!data) return res.status(404).json({ error: "Season not found" });
  res.json(data);
});

adminRouter.post("/standings/:seasonId/adjust", requirePerm("results.publish"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { team_id, points_adjustment, reason } = req.body;
  if (!team_id || points_adjustment === undefined || !reason) {
    return res.status(400).json({ error: "team_id, points_adjustment, and a mandatory reason are required" });
  }

  const row = await q1(
    `INSERT INTO standings(season_id, team_id, points_adjustment, reason, adjusted_by)
     VALUES($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.seasonId, team_id, parseInt(points_adjustment), reason, u.id]
  );
  await audit(req, "standings.adjust", "standings", row.id, { season_id: req.params.seasonId, team_id, points_adjustment, reason });

  const refreshed = await computeStandings(req.params.seasonId);
  res.json({ adjustment: row, standings: refreshed?.rows });
});

// -------------------------------------------------------------
// 10. ANNOUNCEMENTS
// -------------------------------------------------------------

adminRouter.get("/announcements", requirePerm("content.view"), async (_req: Request, res: Response) => {
  res.json(await q("SELECT a.*, u.name author_name FROM announcements a LEFT JOIN admin_users u ON u.id=a.created_by ORDER BY a.created_at DESC"));
});

adminRouter.post("/announcements", requirePerm("announcements.manage"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const { title, body, is_urgent, is_featured, status, publish_at } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const slug = await uniqueSlug("announcements", title);
  const targetStatus = status || "published";
  const pubAt = targetStatus === "published" ? new Date() : (publish_at ? new Date(publish_at) : null);

  const row = await q1(
    `INSERT INTO announcements(title, slug, body, is_urgent, is_featured, status, publish_at, published_at, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [title, slug, body || "", Boolean(is_urgent), Boolean(is_featured), targetStatus, publish_at ? new Date(publish_at) : null, pubAt, u.id]
  );
  await audit(req, "announcements.create", "announcements", row.id, { title, is_urgent: row.is_urgent });
  res.status(201).json(row);
});

adminRouter.put("/announcements/:id", requirePerm("announcements.manage"), async (req: Request, res: Response) => {
  const existing = await q1("SELECT * FROM announcements WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Announcement not found" });

  const { title, body, is_urgent, is_featured, status } = req.body;
  const slug = title && title !== existing.title ? await uniqueSlug("announcements", title, existing.id) : existing.slug;

  const row = await q1(
    `UPDATE announcements SET
      title=COALESCE($2, title),
      slug=$3,
      body=COALESCE($4, body),
      is_urgent=COALESCE($5, is_urgent),
      is_featured=COALESCE($6, is_featured),
      status=COALESCE($7, status),
      updated_at=now()
    WHERE id=$1 RETURNING *`,
    [
      existing.id,
      title ?? existing.title,
      slug,
      body ?? existing.body,
      is_urgent !== undefined ? Boolean(is_urgent) : existing.is_urgent,
      is_featured !== undefined ? Boolean(is_featured) : existing.is_featured,
      status ?? existing.status,
    ]
  );
  await audit(req, "announcements.update", "announcements", row.id, { title: row.title });
  res.json(row);
});

adminRouter.delete("/announcements/:id", requirePerm("records.delete"), async (req: Request, res: Response) => {
  await q("DELETE FROM announcements WHERE id=$1", [req.params.id]);
  await audit(req, "announcements.delete", "announcements", req.params.id);
  res.json({ ok: true });
});

// -------------------------------------------------------------
// 11. MEDIA LIBRARY
// -------------------------------------------------------------

adminRouter.get("/media", requirePerm("content.view"), async (req: Request, res: Response) => {
  const { limit, offset, page, size } = getPage(req, 24);
  const where = ["TRUE"], params: any[] = [];
  if (req.query.category) {
    params.push(req.query.category);
    where.push(`category = $${params.length}`);
  }
  const w = where.join(" AND ");
  const total = (await q1(`SELECT count(*)::int n FROM media_assets WHERE ${w}`, params)).n;
  const items = await q(`SELECT * FROM media_assets WHERE ${w} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items, total, page, pages: Math.ceil(total / limit), size });
});

adminRouter.post("/media/upload", requirePerm("media.manage"), upload.single("file"), async (req: Request, res: Response) => {
  const u = (req as AuthedReq).user;
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const { category, alt_text, caption } = req.body;
  const asset = await q1(
    `INSERT INTO media_assets(filename, original_name, mime_type, size_bytes, category, alt_text, caption, uploaded_by)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [file.filename, file.originalname, file.mimetype, file.size, category || "general", alt_text || null, caption || null, u.id]
  );
  await audit(req, "media.upload", "media_assets", asset.id, { filename: asset.filename });
  res.status(201).json({ ...asset, url: `/uploads/${asset.filename}` });
});

// -------------------------------------------------------------
// 12. SITE SETTINGS
// -------------------------------------------------------------

adminRouter.get("/settings", requirePerm("content.view"), async (_req: Request, res: Response) => {
  const rows = await q("SELECT key, value FROM site_settings");
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

adminRouter.put("/settings", requirePerm("settings.manage"), async (req: Request, res: Response) => {
  const entries = Object.entries(req.body);
  for (const [k, v] of entries) {
    await q("INSERT INTO site_settings(key, value, updated_at) VALUES($1, $2, now()) ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=now()", [k, String(v)]);
  }
  await audit(req, "settings.update", "site_settings", null, { keys: entries.map(e => e[0]) });
  res.json({ ok: true });
});

// -------------------------------------------------------------
// 13. STAFF USERS & ROLES MANAGEMENT
// -------------------------------------------------------------

adminRouter.get("/users", requirePerm("users.manage"), async (_req: Request, res: Response) => {
  const users = await q(`
    SELECT u.id, u.email, u.name, u.is_active, u.created_at, u.last_login_at,
      ARRAY(SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=u.id) roles
    FROM admin_users u
    ORDER BY u.created_at`);
  res.json(users);
});

adminRouter.post("/users", requirePerm("users.manage"), async (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !validPassword(password)) {
    return res.status(400).json({ error: "Email, name, and valid password (min 10 chars, letters+numbers) required" });
  }
  const bcrypt = (await import("bcryptjs")).default;
  const hash = await bcrypt.hash(password, 12);
  const u = await q1(
    "INSERT INTO admin_users(email, name, password_hash) VALUES($1, $2, $3) RETURNING id, email, name, is_active, created_at",
    [String(email).toLowerCase(), name, hash]
  );
  if (role) {
    await q("INSERT INTO user_roles SELECT $1, id FROM roles WHERE name=$2 ON CONFLICT DO NOTHING", [u.id, role]);
  }
  await audit(req, "users.create", "admin_users", u.id, { email: u.email, role });
  res.status(201).json(u);
});

adminRouter.put("/users/:id", requirePerm("users.manage"), async (req: Request, res: Response) => {
  const { is_active, role, name, reset_password } = req.body;
  const u = await q1("SELECT * FROM admin_users WHERE id=$1", [req.params.id]);
  if (!u) return res.status(404).json({ error: "User not found" });

  if (name || is_active !== undefined) {
    await q(
      "UPDATE admin_users SET name=COALESCE($2, name), is_active=COALESCE($3, is_active), updated_at=now() WHERE id=$1",
      [u.id, name ?? u.name, is_active !== undefined ? Boolean(is_active) : u.is_active]
    );
  }
  if (role) {
    await q("DELETE FROM user_roles WHERE user_id=$1", [u.id]);
    await q("INSERT INTO user_roles SELECT $1, id FROM roles WHERE name=$2", [u.id, role]);
  }
  if (reset_password) {
    if (!validPassword(reset_password)) return res.status(400).json({ error: "Password does not meet complexity requirements" });
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash(reset_password, 12);
    await q("UPDATE admin_users SET password_hash=$2, password_changed_at=now() WHERE id=$1", [u.id, hash]);
  }

  await audit(req, "users.update", "admin_users", u.id, { role, is_active });
  res.json({ ok: true });
});

// Roles and permissions reference
adminRouter.get("/roles", requirePerm("users.manage"), async (_req: Request, res: Response) => {
  const roles = await q(`
    SELECT r.id, r.name,
      ARRAY(SELECT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=r.id) permissions
    FROM roles r
    ORDER BY r.name`);
  const allPermissions = await q("SELECT * FROM permissions ORDER BY code");
  res.json({ roles, allPermissions });
});
