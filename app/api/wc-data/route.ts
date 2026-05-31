import { NextResponse } from 'next/server';

const FD_API = 'https://api.football-data.org/v4';
const WC_ID  = 2000;

// Mapa de nome do time → código ISO do país (para flagcdn.com)
const FLAG_CODES: Record<string, string> = {
  'Algeria': 'dz', 'Argentina': 'ar', 'Australia': 'au', 'Austria': 'at',
  'Belgium': 'be', 'Bosnia-Herzegovina': 'ba', 'Brazil': 'br', 'Canada': 'ca',
  'Cape Verde Islands': 'cv', 'Colombia': 'co', 'Congo DR': 'cd', 'Croatia': 'hr',
  'Curaçao': 'cw', 'Czechia': 'cz', 'Ecuador': 'ec', 'Egypt': 'eg',
  'England': 'gb-eng', 'France': 'fr', 'Germany': 'de', 'Ghana': 'gh',
  'Haiti': 'ht', 'Iran': 'ir', 'Iraq': 'iq', 'Ivory Coast': 'ci',
  'Japan': 'jp', 'Jordan': 'jo', 'Mexico': 'mx', 'Morocco': 'ma',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Norway': 'no', 'Panama': 'pa',
  'Paraguay': 'py', 'Portugal': 'pt', 'Qatar': 'qa', 'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct', 'Senegal': 'sn', 'South Africa': 'za', 'South Korea': 'kr',
  'Spain': 'es', 'Sweden': 'se', 'Switzerland': 'ch', 'Tunisia': 'tn',
  'Turkey': 'tr', 'United States': 'us', 'Uruguay': 'uy', 'Uzbekistan': 'uz',
};

function getFlagUrl(teamName: string): string | null {
  const code = FLAG_CODES[teamName];
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}

let cachedData: any = null;
let cachedAt: number = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas

export async function GET() {
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
        flag: getFlagUrl(t.name)
      })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      players: teams.flatMap((t: any) =>
        (t.squad ?? []).map((p: any) => ({
          name: p.name,
          team: t.name,
          position: p.position,
          nationality: p.nationality,
          flag: getFlagUrl(t.name)
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
