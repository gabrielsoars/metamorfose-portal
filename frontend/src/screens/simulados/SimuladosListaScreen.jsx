import { useEffect, useState } from 'react';
import { Plus, Search, ChevronRight, FileText, SlidersHorizontal, Calendar } from 'lucide-react';
import { C } from '../../data/constants.js';
import { listarSimulados } from '../../services/simuladosService.js';
import { MobileShell, BottomNav } from '../../components/ui.jsx';
import { useNavigate } from 'react-router-dom';
import { rotas } from '../../routes/rotas.js';

// A API devolve "YYYY-MM-DD". new Date() interpretaria como UTC e mostraria um dia antes no Brasil.
const formatarData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export function SimuladosListaScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [simulados, setSimulados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    listarSimulados()
      .then((lista) => {
        if (isMounted) setSimulados(Array.isArray(lista) ? lista : []);
      })
      .catch((error) => {
        if (isMounted) window.alert(error.message || 'Não foi possível carregar os simulados.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = simulados.filter((s) => (s.titulo || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <MobileShell>
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-20 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: C.orange }}>Gestão de Provas</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Meus Simulados</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-black font-bold text-sm" style={{ background: C.yellow }}>P</div>
      </header>

      <div className="bg-white px-6 pb-4 border-b border-gray-100 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar simulado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-transparent outline-none text-sm font-medium"
          />
        </div>
        <button type="button" className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:text-orange-500 transition-colors">
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {filtered.length === 0 && (
          <p className="text-center text-sm font-medium text-gray-400 py-16">
            {loading ? 'Carregando...' : 'Nenhum simulado cadastrado'}
          </p>
        )}
        {filtered.map((sim) => (
          <button
            key={sim.id}
            type="button"
            onClick={() => navigate(rotas.simulado(sim.id))}
            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 text-left group transition-all hover:shadow-md"
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.orange)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3f4f6')}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mt-1 shrink-0 border"
              style={{
                background: sim.highlight ? `${C.yellow}33` : '#f9fafb',
                borderColor: sim.highlight ? `${C.yellow}66` : '#f3f4f6',
                color: sim.highlight ? C.orange : '#9ca3af',
              }}
            >
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">{sim.titulo}</h3>
              <div className="flex items-center gap-1.5 text-gray-500 mb-2.5">
                <Calendar size={12} strokeWidth={2.5} />
                <span className="text-[11px] font-semibold uppercase tracking-wide">{formatarData(sim.data_aplicacao)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(sim.turmas || []).map((t) => (
                  <span key={t.id} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">{t.nome}</span>
                ))}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 self-center group-hover:text-orange-400 transition-colors" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate(rotas.simuladoNovo)}
        className="absolute bottom-24 right-6 w-14 h-14 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        style={{ background: C.orange }}
      >
        <Plus size={28} />
      </button>

      <BottomNav active="simulados" onNav={(tab) => {
        if (tab === 'dashboard') navigate(rotas.painel());
        else if (tab === 'turmas') navigate(rotas.turmas);
        else if (tab === 'perfil') navigate(rotas.perfil);
      }} />
    </MobileShell>
  );
}
