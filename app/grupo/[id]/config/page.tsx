'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Payment = {
  id?: string;
  entry_value: number;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
};

type MemberPayment = {
  user_id: string;
  name: string;
  paid: boolean;
  paid_at: string | null;
  notes: string;
};

export default function ConfigGrupo() {
  const params  = useParams();
  const groupId = String(params.id);

  const [payment, setPayment]         = useState<Payment>({ entry_value: 0, prize_1st: 60, prize_2nd: 30, prize_3rd: 10 });
  const [members, setMembers]         = useState<MemberPayment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');
  const [activeTab, setActiveTab]     = useState<'pagamentos' | 'premio'>('pagamentos');
  const [ranking, setRanking]         = useState<{ name: string; total_points: number }[]>([]);

  useEffect(() => { load(); }, [groupId]);

  async function load() {
    // Busca configuração de pagamento
    const { data: payData } = await supabase
      .from('group_payments').select('*').eq('group_id', groupId).maybeSingle();
    if (payData) setPayment(payData);

    // Busca membros
    const { data: ms } = await supabase
      .from('group_members').select('user_id').eq('group_id', groupId);
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    const { data: memberPays } = await supabase
      .from('member_payments').select('*').eq('group_id', groupId);

    const memberList: MemberPayment[] = (ms || []).map((m: any) => {
      const profile = profiles?.find((p: any) => p.id === m.user_id);
      const pay = memberPays?.find((p: any) => p.user_id === m.user_id);
      return {
        user_id: m.user_id,
        name: profile?.name || 'Sem nome',
        paid: pay?.paid || false,
        paid_at: pay?.paid_at || null,
        notes: pay?.notes || '',
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    setMembers(memberList);

    // Busca ranking atual
    const { data: rankData } = await supabase
      .from('ranking').select('name, total_points').eq('group_id', groupId)
      .order('total_points', { ascending: false });
    setRanking(rankData || []);

    setLoading(false);
  }

  async function savePaymentConfig() {
    setSaving(true);
    const total = payment.prize_1st + payment.prize_2nd + payment.prize_3rd;
    if (total !== 100) { showToast('⚠️ A soma das % deve ser 100%'); setSaving(false); return; }

    if (payment.id) {
      await supabase.from('group_payments').update({
        entry_value: payment.entry_value,
        prize_1st: payment.prize_1st,
        prize_2nd: payment.prize_2nd,
        prize_3rd: payment.prize_3rd,
        updated_at: new Date().toISOString()
      }).eq('id', payment.id);
    } else {
      const { data } = await supabase.from('group_payments').insert({
        group_id: groupId,
        entry_value: payment.entry_value,
        prize_1st: payment.prize_1st,
        prize_2nd: payment.prize_2nd,
        prize_3rd: payment.prize_3rd,
      }).select().single();
      if (data) setPayment(data);
    }
    setSaving(false);
    showToast('Configurações salvas! ✅');
  }

  async function togglePaid(userId: string, currentPaid: boolean) {
    const { data: existing } = await supabase
      .from('member_payments').select('id').eq('group_id', groupId).eq('user_id', userId).maybeSingle();

    if (existing) {
      await supabase.from('member_payments').update({
        paid: !currentPaid,
        paid_at: !currentPaid ? new Date().toISOString() : null
      }).eq('id', existing.id);
    } else {
      await supabase.from('member_payments').insert({
        group_id: groupId, user_id: userId,
        paid: true, paid_at: new Date().toISOString()
      });
    }
    setMembers(ms => ms.map(m => m.user_id === userId
      ? { ...m, paid: !currentPaid, paid_at: !currentPaid ? new Date().toISOString() : null }
      : m
    ));
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const totalArrecadado = members.filter(m => m.paid).length * payment.entry_value;
  const pago = members.filter(m => m.paid).length;
  const pendente = members.filter(m => !m.paid).length;

  // Cálculo do prêmio
  const premio1 = (totalArrecadado * payment.prize_1st / 100);
  const premio2 = (totalArrecadado * payment.prize_2nd / 100);
  const premio3 = (totalArrecadado * payment.prize_3rd / 100);

  if (loading) return <main className="app"><div className="empty">Carregando...</div></main>;

  return (
    <main className="app">
      {toast && <div className="toast" style={{ background: 'var(--gold)', color: '#1a1a1a' }}>{toast}</div>}

      <h1 className="brand" style={{ fontSize: 28, marginBottom: 4, marginTop: 20 }}>Configurações</h1>
      <p className="subtitle" style={{ marginBottom: 20 }}>Gerencie pagamentos e prêmios do grupo.</p>

      {/* Resumo financeiro */}
      <div className="card" style={{ marginBottom: 20, background: 'rgba(212,167,44,0.08)', border: '1px solid var(--gold)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: 'var(--gold)' }}>
              R$ {totalArrecadado.toFixed(0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>arrecadado</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#2ea84c' }}>{pago}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>pagaram</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: 'var(--danger)' }}>{pendente}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>pendentes</div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['pagamentos', 'premio'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px', borderRadius: 12, border: '1px solid',
            borderColor: activeTab === tab ? 'var(--gold)' : 'var(--line)',
            background: activeTab === tab ? 'var(--gold)' : 'var(--card)',
            color: activeTab === tab ? '#1a1a1a' : 'var(--text)',
            fontWeight: activeTab === tab ? 700 : 400, fontSize: 13, cursor: 'pointer'
          }}>
            {tab === 'pagamentos' ? '💰 Pagamentos' : '🏆 Prêmio'}
          </button>
        ))}
      </div>

      {activeTab === 'pagamentos' && (
        <>
          {/* Configuração do valor */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💵 Valor da entrada</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>R$</span>
              <input className="input" type="number" min="0" step="1"
                value={payment.entry_value}
                onChange={e => setPayment(p => ({ ...p, entry_value: Number(e.target.value) }))}
                style={{ flex: 1 }} />
            </div>
            <button className="btn" style={{ marginTop: 12 }} onClick={savePaymentConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>

          {/* Lista de membros */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>👥 Status de pagamento</h3>
            </div>
            {members.map((m, i) => (
              <div key={m.user_id} style={{
                padding: '14px 16px',
                borderBottom: i < members.length - 1 ? '1px solid var(--line)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  {m.paid && m.paid_at && (
                    <div style={{ fontSize: 11, color: '#2ea84c', marginTop: 2 }}>
                      Pago em {new Date(m.paid_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  {!m.paid && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>Pendente</div>
                  )}
                </div>
                <button onClick={() => togglePaid(m.user_id, m.paid)} style={{
                  padding: '8px 16px', borderRadius: 10, border: '1px solid',
                  borderColor: m.paid ? '#2ea84c' : 'var(--line)',
                  background: m.paid ? 'rgba(46,168,76,0.15)' : 'var(--bg-soft)',
                  color: m.paid ? '#2ea84c' : 'var(--muted)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}>
                  {m.paid ? '✅ Pago' : '⏳ Marcar'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'premio' && (
        <>
          {/* Distribuição */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🎯 Distribuição do prêmio</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              A soma deve ser 100%. Total arrecadado: <strong style={{ color: 'var(--gold)' }}>R$ {totalArrecadado.toFixed(2)}</strong>
            </p>
            {[
              { label: '🥇 1º lugar', key: 'prize_1st' as const, value: premio1 },
              { label: '🥈 2º lugar', key: 'prize_2nd' as const, value: premio2 },
              { label: '🥉 3º lugar', key: 'prize_3rd' as const, value: premio3 },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</label>
                  <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>
                    R$ {f.value.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" type="number" min="0" max="100" step="1"
                    value={payment[f.key]}
                    onChange={e => setPayment(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    style={{ flex: 1 }} />
                  <span style={{ color: 'var(--muted)', fontSize: 14, width: 20 }}>%</span>
                </div>
              </div>
            ))}
            <div style={{
              padding: '10px 12px', borderRadius: 10, marginBottom: 12,
              background: payment.prize_1st + payment.prize_2nd + payment.prize_3rd === 100
                ? 'rgba(46,168,76,0.1)' : 'rgba(227,93,93,0.1)',
              border: `1px solid ${payment.prize_1st + payment.prize_2nd + payment.prize_3rd === 100 ? '#2ea84c' : 'var(--danger)'}`,
              fontSize: 13, textAlign: 'center' as const
            }}>
              Total: <strong>{payment.prize_1st + payment.prize_2nd + payment.prize_3rd}%</strong>
              {payment.prize_1st + payment.prize_2nd + payment.prize_3rd === 100
                ? ' ✅' : ' ⚠️ Deve ser 100%'}
            </div>
            <button className="btn" onClick={savePaymentConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar distribuição'}
            </button>
          </div>

          {/* Preview dos prêmios com ranking atual */}
          {ranking.length > 0 && totalArrecadado > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>🏆 Projeção atual</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Baseado no ranking atual
                </p>
              </div>
              {[
                { pos: 0, label: '🥇 1º lugar', prize: premio1 },
                { pos: 1, label: '🥈 2º lugar', prize: premio2 },
                { pos: 2, label: '🥉 3º lugar', prize: premio3 },
              ].map(({ pos, label, prize }) => (
                ranking[pos] && (
                  <div key={pos} style={{
                    padding: '14px 16px',
                    borderBottom: pos < 2 ? '1px solid var(--line)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{ranking[pos].name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ranking[pos].total_points} pts</div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: 'var(--gold)' }}>
                      R$ {prize.toFixed(2)}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ height: 100 }} />
    </main>
  );
}
