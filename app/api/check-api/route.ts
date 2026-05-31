import { NextResponse } from 'next/server';

const API_FOOTBALL = 'https://v3.football.api-sports.io';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca os times da Copa do Mundo 2026 (league=1, season=2026)
    const resTeams = await fetch(`${API_FOOTBALL}/teams?league=1&season=2026`, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
    });
    const jsonTeams = await resTeams.json();
    const teams = jsonTeams.response ?? [];

    if (!teams.length) {
      return NextResponse.json({
        error: 'Nenhum time encontrado para Copa 2026',
        raw: jsonTeams
      });
    }

    // Testa buscar squad do primeiro time
    const firstTeam = teams[0];
    const resSquad = await fetch(
      `${API_FOOTBALL}/players/squads?team=${firstTeam.team.id}`,
      { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } }
    );
    const jsonSquad = await resSquad.json();

    return NextResponse.json({
      teams_found: teams.length,
      first_team: firstTeam.team.name,
      squad_sample: jsonSquad?.response?.[0]?.players?.slice(0, 5)?.map((p: any) => ({
        id: p.id,
        name: p.name,
        position: p.position
      })),
      squad_errors: jsonSquad?.errors
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
