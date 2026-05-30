import { NextResponse } from 'next/server';

const API_FOOTBALL = 'https://v3.football.api-sports.io';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Busca TODAS as ligas disponíveis pra conta
    const res = await fetch(`${API_FOOTBALL}/leagues?current=true`, {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! }
    });

    const json = await res.json();

    return NextResponse.json({
      total: json?.results,
      leagues: json?.response?.map((l: any) => ({
        id: l.league?.id,
        name: l.league?.name,
        country: l.country?.name,
        season: l.seasons?.find((s: any) => s.current)?.year
      })).sort((a: any, b: any) => a.country?.localeCompare(b.country))
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
