import { NextResponse } from 'next/server';

const FD_API = 'https://api.football-data.org/v4';
const WC_ID  = 2000;

// Cache simples em memória (dura até o próximo deploy)
let cachedData: any = null;
let cachedAt: number = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas

export async function GET() {
  // Retorna cache se ainda válido
  if (cachedData && Date.now() - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedData);
  }

  try {
    const res = await fetch(`${FD_API}/competitions/${WC_ID}/teams`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }
    });
    const json = await res.json();
    const teams = json.teams ?? [];

    const result = {
      teams: teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        flag: t.crestUrl ?? null
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      players: teams.flatMap((t: any) =>
        (t.squad ?? []).map((p: any) => ({
          name: p.name,
          team: t.name,
          position: p.position,
          nationality: p.nationality
        }))
      ).sort((a: any, b: any) => a.name.localeCompare(b.name))
    };

    cachedData = result;
    cachedAt = Date.now();

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
