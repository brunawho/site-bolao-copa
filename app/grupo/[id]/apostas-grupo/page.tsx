'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Member = { id: string; name: string; user_id: string; color: string };
type Competition = { id: string; name: string; code: string };
type SpecialBet = {
  group_member_id: string;
  competition_id: string;
  champion: string;
  runner_up: string;
  top_scorer: string;
  top4: string[];
  relegated: string[];
};
type WCBet = {
  group_member_id: string;
  champion: string;
  runner_up: string;
  third_place: string;
  top_scorer: string;
};

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}20`, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 900, color, flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyBet() {
  return <span style={{ color: 'var(--dim)', fontSize: 11, fontStyle: 'italic' }}>—</span>;
}

export default function ApostasGrupoPage() {
  const params  = useParams();
  const groupId = String(params.id);

  const [members, setMembers]           = useState<Member[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compBets, setCompBets]         = useState<SpecialBet[]>([]);
  const [wcBets, setWcBets]             = useState<WCBet[]>([]);
  const [selectedComp, setSelectedComp] = useState<string>('wc');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      // Membros do grupo
      const { data: mData } = await supabase
        .from('group_members')
        .select('id, user_id, color, profiles(name)')
        .eq('group_id', groupId)
        .order('created_at');
      const mList = (mData || []).map((m: any) => ({
        id: m.id, user_id: m.user_id,
        name: m.profiles?.name || 'Anon',
        color: m.color || '#39FF14',
      }));
      setMembers(mList);

      // Campeonatos ativos
      const { data: gcData } = await supabase
        .from('group_competitions')
        .select('competitions(id, name, code)')
        .eq('group_id', groupId);
      const comps = (gcData || []).map((gc: any) => gc.competitions).filter(Boolean);
      setCompetitions(comps);

      // Apostas especiais por campeonato
      const { data: cbData } = await supabase
        .from('competition_special_bets')
        .select('*')
        .in('group_member_id', mList.map(m => m.id));
      setCompBets(cbData || []);

      // Apostas especiais da Copa do Mundo
      const { data: wbData } = await supabase
        .from('special_bets')
        .select('*')
        .in('group_member_id', mList.map(m => m.id));
      setWcBets(wbData || []);

      setLoading(false);
    })();
  }, [groupId]);

  if (loading) return (
    <main className="app">
      <h1 className="brand" style={{ marginTop: 16, marginBottom: 16 }}>
        APOSTA<span style={{ color: 'var(--neon)', textShadow: 'var(--shadow-neon)' }}>S</span>
      </h1>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height: 64, background: 'var(--bg3)', borderRadius: 'var(--radius)', marginBottom: 8, animation: 'shimmer 1.5s infinite' }} />
      ))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
    </main>
  );

  // Abas: Copa + campeonatos ativos
  const tabs = [
    { id: 'wc', label: '🏆 Copa 2026' },
    ...competitions.map(c => ({
      id: c.id,
      label: c.code === 'BSA' ? '🇧🇷 Brasileirão' : c.code === 'CL' ? '⭐ Champions' : c.name,
    })),
  ];

  // ── Conteúdo da aba Copa ──
  function WCContent() {
    const fields = [
      { key: 'champion',    label: '🏆 Campeão',    pts: 25 },
      { key: 'runner_up',  label: '🥈 Vice',        pts: 20 },
      { key: 'third_place',label: '🥉 3º Lugar',    pts: 15 },
      { key: 'top_scorer', label: '⚽ Artilheiro',  pts: 15 },
    ];

    return (
      <div>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '.04em', color: 'var(--text)' }}>
                {f.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                +{f.pts} pts
              </span>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {members.map((m, i) => {
                const bet = wcBets.find(b => b.group_member_id === m.id);
                const val = bet ? (bet as any)[f.key] : null;
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <Avatar name={m.name} color={m.color} size={28} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>{m.name}</span>
                    {val
                      ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{val}</span>
                      : <EmptyBet />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Conteúdo das abas de campeonato ──
  function CompContent({ compId }: { compId: string }) {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return null;

    const isBSA = comp.code === 'BSA';
    const isCL  = comp.code === 'CL';

    const fields = [
      { key: 'champion',   label: '🏆 Campeão',    pts: isBSA ? 50 : 25, show: true },
      { key: 'runner_up',  label: '🥈 Vice',        pts: 10,              show: isCL },
      { key: 'top_scorer', label: '⚽ Artilheiro',  pts: isBSA ? 50 : 25, show: true },
    ];

    return (
      <div>
        {fields.filter(f => f.show).map(f => (
          <div key={f.key} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '.04em', color: 'var(--text)' }}>
                {f.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                +{f.pts} pts
              </span>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {members.map((m, i) => {
                const bet = compBets.find(b => b.group_member_id === m.id && b.competition_id === compId);
                const val = bet ? (bet as any)[f.key] : null;
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <Avatar name={m.name} color={m.color} size={28} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>{m.name}</span>
                    {val
                      ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{val}</span>
                      : <EmptyBet />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Top 4 — só Brasileirão */}
        {isBSA && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '.04em', color: 'var(--text)' }}>
                🔝 Top 4 (G4)
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                +10 pts cada
              </span>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {members.map((m, i) => {
                const bet = compBets.find(b => b.group_member_id === m.id && b.competition_id === compId);
                const vals = bet?.top4 || [];
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <Avatar name={m.name} color={m.color} size={28} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--sub)', paddingTop: 4 }}>{m.name}</span>
                    {vals.length > 0
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                          {vals.map((v, vi) => (
                            <span key={vi} style={{ fontSize: 11, fontWeight: 700, color: 'var(--neon)', background: 'var(--neon)15', padding: '2px 8px', borderRadius: 2 }}>{v}</span>
                          ))}
                        </div>
                      : <EmptyBet />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rebaixados — só Brasileirão */}
        {isBSA && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '.04em', color: 'var(--text)' }}>
                ⬇️ Rebaixados (Z4)
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' }}>
                +10 pts cada
              </span>
            </div>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {members.map((m, i) => {
                const bet = compBets.find(b => b.group_member_id === m.id && b.competition_id === compId);
                const vals = bet?.relegated || [];
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <Avatar name={m.name} color={m.color} size={28} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--sub)', paddingTop: 4 }}>{m.name}</span>
                    {vals.length > 0
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                          {vals.map((v, vi) => (
                            <span key={vi} style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'rgba(212,0,15,0.1)', padding: '2px 8px', borderRadius: 2 }}>{v}</span>
                          ))}
                        </div>
                      : <EmptyBet />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="app">
      <h1 className="brand" style={{ marginTop: 16, marginBottom: 16 }}>
        APOSTA<span style={{ color: 'var(--neon)', textShadow: 'var(--shadow-neon)' }}>S</span>
      </h1>

      {/* Abas de campeonato */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 20 }}>
        {tabs.map((tab, i) => (
          <button key={tab.id} onClick={() => setSelectedComp(tab.id)} style={{
            flex: 1, padding: '10px 4px', border: 'none',
            borderRight: i < tabs.length - 1 ? '1px solid var(--line2)' : 'none',
            background: selectedComp === tab.id ? 'var(--bg2)' : 'transparent',
            color: selectedComp === tab.id ? 'var(--neon)' : 'var(--sub)',
            fontSize: 10, fontWeight: selectedComp === tab.id ? 800 : 600,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em',
            borderBottom: selectedComp === tab.id ? '2px solid var(--neon)' : '2px solid transparent',
            transition: 'all .2s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {selectedComp === 'wc'
        ? <WCContent />
        : <CompContent compId={selectedComp} />
      }

      <div style={{ height: 80 }} />
    </main>
  );
}
