import { pool, q, q1, tx, uniqueSlug } from "./db.ts";
import { importSebei4thDiv } from "./import_sebei_4th_div.ts";

async function cleanAndSeedRealSebeiOnly() {
  console.log("Purging all mock teams and mock competitions...");

  // Names of official teams to preserve
  const officialTeams = [
    "Kamet Utd",
    "Kapchorwa Vikings",
    "Kween City",
    "Kapteret FC",
    "Kapkwosho FC",
    "Kortek FC",
    "Sipi FC",
    "Kapnandi City",
    "AFC Green Eagles",
    "Kwirwot FC",
  ];

  await tx(async (c) => {
    // 1. Delete mock competitions
    await c.query("DELETE FROM matches WHERE season_id IN (SELECT id FROM competition_seasons WHERE competition_id IN (SELECT id FROM competitions WHERE name NOT LIKE '%4th%'))");
    await c.query("DELETE FROM competition_teams WHERE season_id IN (SELECT id FROM competition_seasons WHERE competition_id IN (SELECT id FROM competitions WHERE name NOT LIKE '%4th%'))");
    await c.query("DELETE FROM competition_seasons WHERE competition_id IN (SELECT id FROM competitions WHERE name NOT LIKE '%4th%')");
    await c.query("DELETE FROM competitions WHERE name NOT LIKE '%4th%'");

    // 2. Delete mock transfers & player history
    await c.query("DELETE FROM transfers WHERE player_id IN (SELECT id FROM players WHERE current_team_id NOT IN (SELECT id FROM teams WHERE name = ANY($1)))", [officialTeams]);
    await c.query("DELETE FROM player_team_history WHERE team_id NOT IN (SELECT id FROM teams WHERE name = ANY($1))", [officialTeams]);
    await c.query("DELETE FROM players WHERE current_team_id NOT IN (SELECT id FROM teams WHERE name = ANY($1))", [officialTeams]);

    // 3. Delete mock teams
    await c.query("DELETE FROM teams WHERE name <> ALL($1)", [officialTeams]);

    // 4. Delete mock news
    await c.query("DELETE FROM news_articles WHERE title ILIKE '%Kapchorwa City Clinch Dramatic%' OR title ILIKE '%Andrew Yeko Completes Landmark Switch%'");

    // 5. Update site settings
    await c.query("UPDATE site_settings SET value='Sebei Province Football' WHERE key='site_name'");
    await c.query("UPDATE site_settings SET value='Official Home of Sebei Province 4th Division League' WHERE key='tagline'");
    await c.query("UPDATE site_settings SET value='Kamet United lead Sebei 4th Div with 36 pts; Kapchorwa Vikings in pursuit with 33 pts' WHERE key='breaking_banner_text'");
  });

  console.log("Mock data purged. Re-verifying Sebei 4th Division records...");
  await importSebei4thDiv();

  // Create real transfer records between the Sebei 4th Div clubs
  const admin = await q1("SELECT id FROM admin_users LIMIT 1");
  const adminId = admin?.id;

  const vikings = (await q1("SELECT id FROM teams WHERE name='Kapchorwa Vikings'"))?.id;
  const kamet = (await q1("SELECT id FROM teams WHERE name='Kamet Utd'"))?.id;
  const kween = (await q1("SELECT id FROM teams WHERE name='Kween City'"))?.id;
  const player1 = (await q1("SELECT id FROM players WHERE full_name='Patrick Kiplangat'"))?.id;
  const player2 = (await q1("SELECT id FROM players WHERE full_name='Andrew Yeko'"))?.id;

  if (player1 && vikings) {
    await q(
      `INSERT INTO transfers(player_id, from_team_id, to_team_id, transfer_type, announced_on, window_label, fee_terms, announcement_text, status, published_by, published_at)
       VALUES($1, NULL, $2, 'permanent_signing', '2026-01-15', '2025/2026 Mid-Season Window', 'Free Transfer', 'Patrick Kiplangat signs for Kapchorwa Vikings, quickly scoring 15 goals.', 'published', $3, now())
       ON CONFLICT DO NOTHING`,
      [player1, vikings, adminId]
    );
  }

  if (player2 && kween && kamet) {
    await q(
      `INSERT INTO transfers(player_id, from_team_id, to_team_id, transfer_type, announced_on, window_label, fee_terms, announcement_text, status, published_by, published_at)
       VALUES($1, $2, $3, 'permanent_signing', '2026-02-01', '2025/2026 Mid-Season Window', 'Undisclosed Fee', 'Andrew Yeko completes move to Kween City to lead the forward line.', 'published', $4, now())
       ON CONFLICT DO NOTHING`,
      [player2, kamet, kween, adminId]
    );
  }

  console.log("Database successfully seeded ONLY with authentic Sebei Province 4th Division information.");
}

cleanAndSeedRealSebeiOnly().catch(console.error).finally(() => pool.end());
