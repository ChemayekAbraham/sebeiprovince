import { pool, q, q1, tx, uniqueSlug } from "./db.ts";

async function populateRegionalDemoData() {
  console.log("Populating Sebei Province demo football data...");
  const admin = await q1("SELECT id FROM admin_users LIMIT 1");
  const adminId = admin?.id;

  // 1. Teams in Sebei Province (Kapchorwa, Kween, Bukwo)
  const teamsData = [
    {
      name: "Kapchorwa City FC",
      short_name: "Kapchorwa City",
      abbreviation: "KPC",
      location: "Kapchorwa Town",
      home_ground: "Kapchorwa Boma Grounds",
      founded_year: 2012,
      colors: "Forest Green & Gold",
      coach: "Moses Chemangei",
      description: "One of the premier teams in Sebei Province, boasting a vibrant fanbase and high-altitude training tradition.",
      history: "Founded in 2012 by community leaders to harness the exceptional endurance of young athletes in high-altitude athletics into football excellence.",
    },
    {
      name: "Bukwo United FC",
      short_name: "Bukwo United",
      abbreviation: "BKW",
      location: "Bukwo District",
      home_ground: "Amanang Stadium",
      founded_year: 2015,
      colors: "Royal Blue & White",
      coach: "Patrick Kwemoi",
      description: "Fierce eastern Sebei powerhouse known for disciplined defense and swift wing play.",
      history: "Formed after the merger of local township clubs across Amanang and Bukwo border communities.",
    },
    {
      name: "Kween Warriors FC",
      short_name: "Kween Warriors",
      abbreviation: "KWN",
      location: "Binyiny, Kween",
      home_ground: "Binyiny Sports Arena",
      founded_year: 2018,
      colors: "Red & Black",
      coach: "David Kiprop",
      description: "The pride of Kween district, featuring rapid counter-attacking play and passionate regional support.",
      history: "Emerged in 2018 and quickly climbed the regional ranks, making history in the Mount Elgon regional cup.",
    },
    {
      name: "Tingey Stars FC",
      short_name: "Tingey Stars",
      abbreviation: "TNG",
      location: "Tingey, Kapchorwa",
      home_ground: "Tingey Community Grounds",
      founded_year: 2019,
      colors: "Emerald Green & White",
      coach: "Isaac Cherotich",
      description: "Youthful and high-pressing side developing the most promising grassroots talent in Tingey county.",
      history: "Created with a focus on youth sports academy development in Kapchorwa highlands.",
    },
    {
      name: "Sipi Falls Wanderers",
      short_name: "Sipi Wanderers",
      abbreviation: "SFW",
      location: "Sipi, Kapchorwa",
      home_ground: "Sipi View Grounds",
      founded_year: 2017,
      colors: "Sky Blue & Gold",
      coach: "Simon Arap Chelangat",
      description: "Set against the iconic backdrop of Sipi Falls, famous for attractive possession football.",
      history: "Sponsored by the local tourism and hospitality fraternity to unite the scenic Sipi valley communities through football.",
    },
    {
      name: "Kongasis FC",
      short_name: "Kongasis",
      abbreviation: "KNG",
      location: "Kongasis, Bukwo",
      home_ground: "Kongasis Ground",
      founded_year: 2020,
      colors: "Orange & Navy",
      coach: "Stephen Chemutai",
      description: "Resilient community squad with formidable home advantage near the Kenya border.",
      history: "Built by local youth leaders to engage border athletics communities in competitive league football.",
    },
  ];

  const createdTeams: Record<string, string> = {};
  for (const t of teamsData) {
    const slug = await uniqueSlug("teams", t.name);
    const row = await q1(
      `INSERT INTO teams(name, slug, short_name, abbreviation, location, home_ground, founded_year, colors, coach, description, history, status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
       ON CONFLICT(name) DO UPDATE SET location=$5, home_ground=$6 RETURNING id`,
      [t.name, slug, t.short_name, t.abbreviation, t.location, t.home_ground, t.founded_year, t.colors, t.coach, t.description, t.history]
    );
    createdTeams[t.name] = row.id;
  }

  // 2. Players
  const playersData = [
    { name: "Joshua Chelangat", team: "Kapchorwa City FC", pos: "Forward", num: 9, nat: "Uganda", apps: 18, goals: 14, assists: 5 },
    { name: "Emmanuel Arap Cherotich", team: "Kapchorwa City FC", pos: "Midfielder", num: 8, nat: "Uganda", apps: 20, goals: 6, assists: 9 },
    { name: "Fred Kwemoi", team: "Kapchorwa City FC", pos: "Goalkeeper", num: 1, nat: "Uganda", apps: 22, goals: 0, assists: 0 },
    { name: "Dennis Kiprotich", team: "Bukwo United FC", pos: "Forward", num: 10, nat: "Uganda", apps: 19, goals: 12, assists: 7 },
    { name: "Solomon Chemutai", team: "Bukwo United FC", pos: "Defender", num: 4, nat: "Uganda", apps: 21, goals: 2, assists: 1 },
    { name: "Andrew Yeko", team: "Kween Warriors FC", pos: "Forward", num: 11, nat: "Uganda", apps: 17, goals: 10, assists: 4 },
    { name: "Benjamin Cherop", team: "Kween Warriors FC", pos: "Midfielder", num: 6, nat: "Uganda", apps: 16, goals: 3, assists: 6 },
    { name: "Allan Kiplangat", team: "Tingey Stars FC", pos: "Midfielder", num: 7, nat: "Uganda", apps: 15, goals: 5, assists: 8 },
    { name: "Brian Chesang", team: "Sipi Falls Wanderers", pos: "Forward", num: 9, nat: "Uganda", apps: 14, goals: 8, assists: 3 },
  ];

  const createdPlayers: Record<string, string> = {};
  for (const p of playersData) {
    const slug = await uniqueSlug("players", p.name);
    const teamId = createdTeams[p.team];
    const row = await q1(
      `INSERT INTO players(full_name, slug, position, squad_number, nationality, current_team_id, status, appearances, goals, assists)
       VALUES($1,$2,$3,$4,$5,$6,'active',$7,$8,$9)
       ON CONFLICT(slug) DO UPDATE SET current_team_id=$6 RETURNING id`,
      [p.name, slug, p.pos, p.num, p.nat, teamId, p.apps, p.goals, p.assists]
    );
    createdPlayers[p.name] = row.id;
    await q("INSERT INTO player_team_history(player_id, team_id, start_date) VALUES($1, $2, '2025-08-01') ON CONFLICT DO NOTHING", [row.id, teamId]);
  }

  // 3. Competitions: Sebei Premier League & Mount Elgon Cup
  const leagueSlug = await uniqueSlug("competitions", "Sebei Premier League");
  const spl = await q1(
    `INSERT INTO competitions(name, slug, competition_type, description, organizer, venue_info, points_win, points_draw, points_loss, status)
     VALUES('Sebei Premier League', $1, 'league', 'The top flight football championship of Sebei Province featuring clubs from Kapchorwa, Bukwo, and Kween.', 'Sebei Football Association', 'Multiple regional venues', 3, 1, 0, 'active')
     ON CONFLICT(name) DO UPDATE SET description='The top flight football championship of Sebei Province.' RETURNING id`,
    [leagueSlug]
  );

  const cupSlug = await uniqueSlug("competitions", "Mount Elgon Championship Cup");
  const cup = await q1(
    `INSERT INTO competitions(name, slug, competition_type, description, organizer, status)
     VALUES('Mount Elgon Championship Cup', $1, 'knockout', 'Annual regional knockout cup competition bringing together top community and academy clubs.', 'Sebei Sports Committee', 'active')
     ON CONFLICT(name) DO UPDATE SET description='Annual regional knockout cup competition.' RETURNING id`,
    [cupSlug]
  );

  // Seasons
  const splSeason = await q1(
    `INSERT INTO competition_seasons(competition_id, label, is_current, status)
     VALUES($1, '2026/2027', true, 'active')
     ON CONFLICT(competition_id, label) DO UPDATE SET is_current=true RETURNING id`,
    [spl.id]
  );

  // Register all 6 teams to the season
  for (const tid of Object.values(createdTeams)) {
    await q("INSERT INTO competition_teams(season_id, team_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [splSeason.id, tid]);
  }

  // 4. Sample Completed Matches with Published Results to populate standings
  const kCity = createdTeams["Kapchorwa City FC"];
  const bUnited = createdTeams["Bukwo United FC"];
  const kWarriors = createdTeams["Kween Warriors FC"];
  const tStars = createdTeams["Tingey Stars FC"];
  const sWanderers = createdTeams["Sipi Falls Wanderers"];
  const kongasis = createdTeams["Kongasis FC"];

  const pastMatches = [
    { ref: "M-SPL-01", h: kCity, a: bUnited, hs: 2, as: 1, v: "Kapchorwa Boma Grounds", ago: "6 days" },
    { ref: "M-SPL-02", h: kWarriors, a: tStars, hs: 3, as: 2, v: "Binyiny Sports Arena", ago: "6 days" },
    { ref: "M-SPL-03", h: sWanderers, a: kongasis, hs: 1, as: 1, v: "Sipi View Grounds", ago: "5 days" },
    { ref: "M-SPL-04", h: kCity, a: kWarriors, hs: 1, as: 0, v: "Kapchorwa Boma Grounds", ago: "2 days" },
    { ref: "M-SPL-05", h: bUnited, a: sWanderers, hs: 2, as: 0, v: "Amanang Stadium", ago: "2 days" },
  ];

  for (const m of pastMatches) {
    await q(
      `INSERT INTO matches(reference, season_id, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score, result_state, result_published_by)
       VALUES($1, $2, $3, $4, now() - ($5)::interval, $6, 'completed', $7, $8, 'published', $9)
       ON CONFLICT(reference) DO NOTHING`,
      [m.ref, splSeason.id, m.h, m.a, m.ago, m.v, m.hs, m.as, adminId]
    );
  }

  // Upcoming matches
  const upcomingMatches = [
    { ref: "M-SPL-06", h: tStars, a: kCity, v: "Tingey Community Grounds", inTime: "2 days" },
    { ref: "M-SPL-07", h: kongasis, a: bUnited, v: "Kongasis Ground", inTime: "3 days" },
    { ref: "M-SPL-08", h: kWarriors, a: sWanderers, v: "Binyiny Sports Arena", inTime: "4 days" },
  ];
  for (const m of upcomingMatches) {
    await q(
      `INSERT INTO matches(reference, season_id, home_team_id, away_team_id, kickoff_at, venue, status)
       VALUES($1, $2, $3, $4, now() + ($5)::interval, $6, 'scheduled')
       ON CONFLICT(reference) DO NOTHING`,
      [m.ref, splSeason.id, m.h, m.a, m.inTime, m.v]
    );
  }

  // 5. News Articles
  const catLocal = (await q1("SELECT id FROM news_categories WHERE slug='local-football'"))?.id;
  const catTransfers = (await q1("SELECT id FROM news_categories WHERE slug='transfer-news'"))?.id;
  const catBreaking = (await q1("SELECT id FROM news_categories WHERE slug='breaking-news'"))?.id;

  const newsItems = [
    {
      title: "Kapchorwa City Clinch Dramatic Late Win in High-Altitude Derby Against Bukwo United",
      slug: "kapchorwa-city-clinch-dramatic-derby-win-over-bukwo",
      summary: "A thrilling 89th-minute strike by Joshua Chelangat secured all three points at the packed Boma Grounds in one of the most intense Sebei derbies of the season.",
      body: "High altitude intensity was on full display this past weekend as Kapchorwa City FC edged past rivals Bukwo United 2-1 in front of a capacity crowd at Kapchorwa Boma Grounds.\n\nThe game commenced with rapid tempo as Bukwo United's forward Dennis Kiprotich opened the scoring in the 24th minute following a crisp counter-attack. However, Kapchorwa responded before half-time with an equalizer from Emmanuel Arap Cherotich.\n\nWith both sides trading heavy blows, Joshua Chelangat produced a sensational volley from 20 yards out to ensure the home side claimed maximum points and took early charge of the Sebei Premier League table.",
      is_featured: true,
      is_breaking: false,
      featured_image: "/uploads/sebei_hero_match.jpg",
      cat: catLocal,
    },
    {
      title: "Sebei Province Football Launches Central Digital Platform for Regional Leagues and Transfers",
      slug: "sebei-province-football-launches-central-digital-platform",
      summary: "Regional sports leadership announces a milestone digital system to unify team records, live scores, confirmed transfers, and verified tournament standings across Kapchorwa, Bukwo, and Kween.",
      body: "Football development in the Sebei sub-region took an immense leap forward today with the official rollout of the Sebei Province Football platform.\n\nDesigned to elevate grassroots talent and provide sports journalists, scouts, and supporters with verified real-time match data, the portal tracks all registered clubs and fixtures from the highlands of Tingey down to the border communities of Amanang.",
      is_featured: false,
      is_breaking: true,
      featured_image: "/uploads/sebei_cup_trophy.jpg",
      cat: catBreaking,
    },
    {
      title: "Transfer Hub: Andrew Yeko Completes Landmark Switch to Kween Warriors",
      slug: "transfer-hub-andrew-yeko-completes-landmark-switch-to-kween-warriors",
      summary: "In one of the most talked-about deals in the province, prolific attacker Andrew Yeko has put pen to paper on a permanent contract with Kween Warriors.",
      body: "Kween Warriors have finalized the acquisition of forward Andrew Yeko. Club officials confirmed all registration formalities have been approved by the provincial competitions committee.",
      is_featured: false,
      is_breaking: false,
      featured_image: "/uploads/sebei_transfer_signing.jpg",
      cat: catTransfers,
    },
  ];

  for (const n of newsItems) {
    await q(
      `INSERT INTO news_articles(title, slug, summary, body, category_id, status, is_featured, is_breaking, published_at, created_by, published_by)
       VALUES($1,$2,$3,$4,$5,'published',$6,$7,now(),$8,$8)
       ON CONFLICT(slug) DO NOTHING`,
      [n.title, n.slug, n.summary, n.body, n.cat, n.is_featured, n.is_breaking, adminId]
    );
  }

  // 6. Verified and Published Transfer Record
  await q(
    `INSERT INTO transfers(player_id, from_team_id, to_team_id, transfer_type, announced_on, window_label, fee_terms, announcement_text, status, published_by, published_at)
     VALUES($1, $2, $3, 'permanent_signing', current_date, '2026 Mid-Season Window', 'Undisclosed Terms', 'Kween Warriors officially announce the signing of forward Andrew Yeko.', 'published', $4, now())
     ON CONFLICT DO NOTHING`,
    [createdPlayers["Andrew Yeko"], createdTeams["Kapchorwa City FC"], createdTeams["Kween Warriors FC"], adminId]
  );

  // 7. Announcements
  await q(
    `INSERT INTO announcements(title, slug, body, is_urgent, is_featured, status, published_at, created_by)
     VALUES('Registration Open for the 2026 Mount Elgon Championship Cup', 'mount-elgon-championship-cup-registration-open',
     'All amateur, community, and institution teams across Sebei Province are invited to submit their team rosters for the upcoming knockout tournament by end of next month.',
     true, true, 'published', now(), $1)
     ON CONFLICT(slug) DO NOTHING`,
    [adminId]
  );

  // 8. Site Settings update
  await q("UPDATE site_settings SET value='true' WHERE key='breaking_banner_enabled'");
  await q("UPDATE site_settings SET value='Welcome to Sebei Province Football — Follow Live Scores, Official Transfers and Standings!' WHERE key='breaking_banner_text'");

  console.log("Sebei Province demo data successfully populated.");
}

populateRegionalDemoData().catch(console.error).finally(() => pool.end());
