import { NextResponse } from 'next/server';

const FD_API = 'https://api.football-data.org/v4';
const WC_ID  = 2000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca todos os times da Copa do Mundo 2026
    const resTeams = await fetch(`${FD_API}/competitions/${WC_ID}/teams`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });
    const jsonTeams = await resTeams.json();
    const teams = jsonTeams.teams ?? [];

    if (!teams.length) {
      return NextResponse.json({ error: 'Sem times', raw: jsonTeams });
    }

    // Testa squad do primeiro time
    const firstTeam = teams[0];
    const sample = firstTeam.squad?.slice(0, 5)?.map((p: any) => ({
      name: p.name,
      position: p.position,
      nationality: p.nationality
    }));

    return NextResponse.json({
      total_teams: teams.length,
      teams: teams.map((t: any) => ({ id: t.id, name: t.name, squad_size: t.squad?.length })),
      squad_sample: { team: firstTeam.name, players: sample }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
