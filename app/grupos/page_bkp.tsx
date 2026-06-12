'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Group } from '@/lib/supabase';

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type Mode = 'none' | 'join' | 'create';

export default function Grupos() {
  const router = useRouter();
  const [groups, setGroups]       = useState<Group[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userName, setUserName]   = useState('');
  const [mode, setMode]           = useState<Mode>('none');
  const [code, setCode]           = useState('');
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');
  const [toast, setToast]         = useState('');
  const [showMirror, setShowMirror] = useState(false);
  const [mirrorFrom, setMirrorFrom] = useState<string>('');
  const [mirrorTo, setMirrorTo]     = useState<string>('');
  const [copying, setCopying]       = useState(false);
  const [userId, setUserId]         = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { router.push('/login'); return; }

    const userId = session.session.user.id;
    setUserId(userId);

    const { data: profile } = await supabase
      .from('profiles').select('name').eq('id', userId).maybeSingle();
    setUserName(profile?.name || '');

    const { data: members } = await supabase
      .from('group_members').select('group_id').eq('user_id', userId);

    if (!members?.length) { setGroups([]); setLoading(false); return; }

    const groupIds = members.map((m: any) => m.group_id);
    const { data: gs } = await supabase
      .from('groups').select('id, name, invite_code, created_at').in('id', groupIds);

    setGroups(gs || []);
    setLoading(false);
  }

  async function entrarComCodigo() {
    setErr(''); setSaving(true);
    const clean = code.trim().toUpperCase();

    const { data: g } = await supabase
      .from('groups').select('id, name').eq('invite_code', clean).maybeSingle();

    if (!g) { setErr('Código inválido ou grupo não encontrado'); setSaving(false); return; }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session!.user.id;

    // Verifica se já é membro
    const { data: existing } = await supabase
      .from('group_members').select('id')
      .eq('group_id', g.id).eq('user_id', userId).maybeSingle();
    if (existing) { setErr('Você já faz parte deste grupo!'); setSaving(false); return; }

    const { error } = await supabase
      .from('group_members').insert({ group_id: g.id, user_id: userId });

    if (error) { setErr('Erro ao entrar: ' + error.message); setSaving(false); return; }

    setSaving(false); setMode('none'); setCode('');
    showToast(`Você entrou no grupo "${g.name}"! 🎉`);
    load();
  }

  async function criarGrupo() {
    if (!groupName.trim()) { setErr('Digite o nome do grupo'); return; }
    setErr(''); setSaving(true);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session!.user.id;

    // Gera código único
    let inviteCode = randomCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('groups').select('id').eq('invite_code', inviteCode).maybeSingle();
      if (!existing) break;
      inviteCode = randomCode();
      attempts++;
    }

    // Cria o grupo
    const { data: newGroup, error: groupErr } = await supabase
      .from('groups').insert({ name: groupName.trim(), invite_code: inviteCode, created_by: userId })
      .select().single();

    if (groupErr || !newGroup) {
      setErr('Erro ao criar grupo'); setSaving(false); return;
    }

    // Adiciona o criador como membro
    const { error: memberErr } = await supabase
      .from('group_members').insert({ group_id: newGroup.id, user_id: userId });

    if (memberErr) {
      setErr('Erro ao entrar no grupo'); setSaving(false); return;
    }

    setSaving(false); setMode('none'); setGroupName('');
    showToast(`Grupo "${newGroup.name}" criado! Código: ${inviteCode} 🎉`);
    load();
  }

  async function espelharPalpites() {
    if (!userId || !mirrorFrom || !mirrorTo) return;
    setCopying(true);

    const { data: fromMember } = await supabase
      .from('group_members').select('id')
      .eq('group_id', mirrorFrom).eq('user_id', userId).maybeSingle();
    if (!fromMember) { setCopying(false); showToast('❌ Você não é membro do grupo origem'); return; }

    const { data: toMember } = await supabase
      .from('group_members').select('id')
      .eq('group_id', mirrorTo).eq('user_id', userId).maybeSingle();
    if (!toMember) { setCopying(false); showToast('❌ Você não é membro do grupo destino'); return; }

    const { data: sourceGuesses } = await supabase
      .from('guesses').select('*').eq('group_member_id', fromMember.id);
    if (!sourceGuesses?.length) { setCopying(false); showToast('❌ Nenhum palpite encontrado no grupo origem'); return; }

    let totalCopied = 0;
    for (const guess of sourceGuesses) {
      const { data: existing } = await supabase
        .from('guesses').select('id')
        .eq('group_member_id', toMember.id).eq('match_id', guess.match_id).maybeSingle();
      if (existing) continue;

      await supabase.from('guesses').insert({
        group_member_id: toMember.id,
        match_id: guess.match_id,
        guess_a: guess.guess_a,
        guess_b: guess.guess_b,
        guess_penalty_winner: guess.guess_penalty_winner,
      });
      totalCopied++;
    }

    setCopying(false);
    setShowMirror(false);
    showToast(`✅ ${totalCopied} palpites espelhados com sucesso!`);
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 4000);
  }

  function cancelar() {
    setMode('none'); setCode(''); setGroupName(''); setErr('');
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  return (
    <main className="app">
      {toast && <div className="toast" style={{ background: 'var(--gold)', color: '#1a1a1a' }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="brand" style={{ fontSize: 28 }}>Meus<br /><span>Bolões</span></h1>
        <button onClick={logout} style={{
          background: 'transparent', border: '1px solid var(--line)',
          color: 'var(--muted)', padding: '6px 12px', borderRadius: 8,
          fontSize: 12, cursor: 'pointer'
        }}>Sair</button>
      </div>

      <p className="subtitle" style={{ marginBottom: 24 }}>Oi, {userName}! Escolha um grupo:</p>

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <div className="empty" style={{ marginBottom: 16 }}>
          Você ainda não participa de nenhum grupo.<br />
          Crie um novo ou entre com um código de convite.
        </div>
      ) : (
        groups.map(g => (
          <Link key={g.id} href={`/grupo/${g.id}/palpites`} className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>{g.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Código: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace', letterSpacing: 2 }}>{g.invite_code}</strong>
                </p>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 20 }}>›</span>
            </div>
          </Link>
        ))
      )}

      {/* BOTÃO ESPELHAR PALPITES */}
      {groups.length > 1 && (
        <button className="btn btn-ghost" onClick={() => { setShowMirror(true); setMirrorFrom(''); setMirrorTo(''); }}
          style={{ marginBottom: 16 }}>
          📋 Espelhar palpites
        </button>
      )}

      {/* MODAL ESPELHAR */}
      {showMirror && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid var(--gold)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--gold)' }}>
            📋 Espelhar palpites
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            Copia todos os palpites de um grupo para outro. Palpites já existentes não são sobrescritos.
          </p>

          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            De qual grupo?
          </label>
          <select className="input" value={mirrorFrom}
            onChange={e => { setMirrorFrom(e.target.value); setMirrorTo(''); }}
            style={{ marginBottom: 12 }}>
            <option value="">Selecione o grupo origem...</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Para qual grupo?
          </label>
          <select className="input" value={mirrorTo}
            onChange={e => setMirrorTo(e.target.value)}
            style={{ marginBottom: 16 }}>
            <option value="">Selecione o grupo destino...</option>
            {groups.filter(g => g.id !== mirrorFrom).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setShowMirror(false)} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn" disabled={!mirrorFrom || !mirrorTo || copying}
              onClick={espelharPalpites} style={{ flex: 1 }}>
              {copying ? 'Espelhando...' : 'Espelhar'}
            </button>
          </div>
        </div>
      )}

      {/* Formulário criar/entrar */}
      {mode !== 'none' ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--gold)' }}>
            {mode === 'create' ? '🆕 Criar novo grupo' : '🔑 Entrar com código'}
          </h3>

          {mode === 'create' ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                Dê um nome pro seu bolão:
              </p>
              <input className="input" placeholder="Ex: Bolão do Trabalho"
                value={groupName} onChange={e => setGroupName(e.target.value)}
                maxLength={40} style={{ marginBottom: 10 }}
                onKeyDown={e => e.key === 'Enter' && criarGrupo()} />
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                Digite o código de 6 letras do grupo:
              </p>
              <input className="input" placeholder="ABC123" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ marginBottom: 10, fontFamily: 'monospace', textAlign: 'center', fontSize: 20, letterSpacing: 6 }}
                onKeyDown={e => e.key === 'Enter' && entrarComCodigo()} />
            </>
          )}

          {err && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={cancelar} style={{ flex: 1 }}>
              Cancelar
            </button>
            <button className="btn" disabled={saving}
              onClick={mode === 'create' ? criarGrupo : entrarComCodigo}
              style={{ flex: 1 }}>
              {saving ? '...' : mode === 'create' ? 'Criar grupo' : 'Entrar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn" onClick={() => { setMode('create'); setErr(''); }}
            style={{ flex: 1 }}>
            + Criar grupo
          </button>
          <button className="btn btn-ghost" onClick={() => { setMode('join'); setErr(''); }}
            style={{ flex: 1 }}>
            🔑 Entrar com código
          </button>
        </div>
      )}
    </main>
  );
}
