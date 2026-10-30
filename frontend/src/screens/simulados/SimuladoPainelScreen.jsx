import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Edit2, Camera, Check, Clock } from 'lucide-react';
import { C } from '../../data/constants.js';
import { listarAlunosDaTurma, normalizeAluno } from '../../services/alunosService.js';
import { MobileShell } from '../../components/ui.jsx';

// Ações do menu ⋮ do cabeçalho. Para incluir outra, basta acrescentar um item aqui.
const MENU_ACOES = [
  { label: 'Editar simulado', icon: Edit2, screen: 'simulado-editar' },
];

export function SimuladoPainelScreen({ go, simulado }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [alunos, setAlunos] = useState([]);

  useEffect(() => {
    if (!simulado) return undefined;
    let isMounted = true;

    // Nada é salvo por aluno, então todos aparecem como não corrigidos.
    Promise.all(simulado.turmas.map((t) => listarAlunosDaTurma(t.id)))
      .then((porTurma) => {
        if (isMounted) setAlunos(porTurma.flat().map(normalizeAluno).map((a) => ({ ...a, corrected: false })));
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar os alunos.');
      });

    return () => {
      isMounted = false;
    };
  }, [simulado]);

  const filtered = alunos.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const corrected = alunos.filter((a) => a.corrected).length;
  const pct = alunos.length ? Math.round((corrected / alunos.length) * 100) : 0;

  return (
    <MobileShell>
      <header className="bg-white pt-12 pb-4 px-4 shadow-sm z-20 flex items-center justify-between border-b border-gray-100">
        <button type="button" onClick={() => go('prof-dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>{simulado?.turmas.map((t) => t.nome).join(', ')}</p>
          <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{simulado?.titulo}</h1>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Mais opções"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-11 z-40 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                {MENU_ACOES.map((acao) => (
                  <button
                    key={acao.label}
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); go(acao.screen); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <acao.icon size={16} /> {acao.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="bg-white px-6 py-4 border-b border-gray-100 z-10 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Progresso da Turma</h2>
            <p className="text-xs text-gray-500 mt-0.5">{corrected} de {alunos.length} provas corrigidas</p>
          </div>
          <span className="text-sm font-bold" style={{ color: C.orange }}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: C.orange }} />
        </div>
        <button type="button" onClick={() => go('simulado-gabarito')} className="flex items-center gap-1.5 mb-3 text-xs font-bold hover:underline" style={{ color: C.orange }}>
          <Edit2 size={14} /> Editar gabarito oficial
        </button>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-8" style={{ scrollbarWidth: 'none' }}>
        {filtered.map((aluno) => (
          <div key={aluno.id} className="bg-white p-4 rounded-2xl border shadow-sm relative overflow-hidden" style={{ borderColor: aluno.corrected ? '#d1fae5' : '#e5e7eb' }}>
            {aluno.corrected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />}
            <div className="flex items-center justify-between" style={{ marginLeft: aluno.corrected ? 8 : 0 }}>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">{aluno.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {aluno.corrected ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        <Check size={10} strokeWidth={3} /> Corrigido
                      </span>
                      <span className="text-xs font-bold text-gray-500">Nota: <span className="text-emerald-600">{aluno.nota}</span></span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                      <Clock size={10} strokeWidth={3} /> Pendente
                    </span>
                  )}
                </div>
              </div>
              {aluno.corrected ? (
                <button type="button" className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all">
                  <Edit2 size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go('escaneamento', aluno)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs shadow-sm active:scale-95 transition-all hover:text-white"
                  style={{ background: C.light, color: C.orange, borderColor: `${C.orange}33` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.orange; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.light; e.currentTarget.style.color = C.orange; }}
                >
                  <Camera size={16} /> Escanear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
