import { LayoutDashboard, Users, FileText, User, LogOut, Camera, CheckCircle2, BarChart3 } from 'lucide-react';
import { C } from '../data/constants.js';

const FONT = { fontFamily: "'Inter', sans-serif" };

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { key: 'turmas', label: 'Turmas', icon: Users },
  { key: 'simulados', label: 'Simulados', icon: FileText },
  { key: 'perfil', label: 'Perfil', icon: User },
];

// Mesmas chamadas do menu inferior. Usada pelas telas que não têm menu inferior próprio
// (no desktop a barra lateral aparece em todas as telas do professor).
function navPadrao(go) {
  return (tab) => {
    if (tab === 'dashboard') go('prof-dashboard');
    else if (tab === 'turmas') go('prof-turmas');
    else if (tab === 'simulados') go('simulados-lista');
    else if (tab === 'perfil') go('prof-perfil');
  };
}

function Logo({ size = 40 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center border-2 border-black shrink-0"
      style={{ background: C.yellow, width: size, height: size }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M12 8c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z" />
        <path d="M12 12c2 2 4 2 6 0" />
      </svg>
    </div>
  );
}

// Desktop (≥ 1024 px): barra lateral fixa com os itens do menu inferior + "Sair".
function Sidebar({ active, onNav, onSair }) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-gray-100 z-30">
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <Logo />
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight">Metamorfose</p>
          <p className="text-[11px] font-medium text-gray-500 leading-tight">Correção de Simulados</p>
        </div>
      </div>

      <nav aria-label="Menu principal" className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-colors ${isActive ? '' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              style={isActive ? { background: C.light, color: C.orange } : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onSair}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} /> Sair
        </button>
      </div>
    </aside>
  );
}

const DESTAQUES = [
  { icon: Camera, texto: 'Fotografe o cartão-resposta e o sistema lê as marcações' },
  { icon: CheckCircle2, texto: 'Nota e erros de cada aluno na hora, com gabarito oficial' },
  { icon: BarChart3, texto: 'Veja quais questões a turma mais errou' },
];

// Desktop (≥ 1024 px): metade da tela de login/ativação com a identidade do produto.
function PainelMarca() {
  return (
    <aside
      className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden flex-col justify-between gap-8 px-12 py-10 xl:px-16 xl:py-14 text-white"
      style={{ background: C.orange }}
    >
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: C.yellow }} aria-hidden="true" />
      <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full opacity-10 bg-white" aria-hidden="true" />

      <div className="relative">
        <Logo size={64} />
      </div>

      <div className="relative max-w-xl">
        <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">Correção de simulados sem planilha.</h2>
        <p className="text-lg xl:text-xl text-white/90 font-medium mb-10">
          Cadastre as turmas, monte o gabarito oficial e acompanhe o desempenho de cada aluno.
        </p>
        <ul className="space-y-5">
          {DESTAQUES.map(({ icon: Icon, texto }) => (
            <li key={texto} className="flex items-center gap-4 text-base xl:text-lg font-medium">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center">
                <Icon size={22} />
              </span>
              {texto}
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden="true" />
    </aside>
  );
}

// Celular e tablet (< 1024 px): menu inferior, como sempre foi.
function BottomNav({ active, onNav }) {
  return (
    <nav aria-label="Menu principal" className="lg:hidden shrink-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-between items-center px-2 py-1 h-16 md:max-w-[720px] md:mx-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-xl"
            >
              <Icon size={22} style={{ color: isActive ? C.orange : '#9ca3af' }} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold" style={{ color: isActive ? C.orange : '#6b7280' }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Moldura das telas. Substitui o antigo MobileShell.
 * - Celular (< 768 px): tela cheia, sem moldura e sem altura fixa.
 * - Tablet (768–1023 px): coluna mais larga, menu inferior.
 * - Desktop (≥ 1024 px): barra lateral (professor), conteúdo com largura útil.
 * Sempre `h-dvh`: cabeçalho e rodapé ficam fixos e o miolo de cada tela rola por dentro.
 *
 * variant:
 * - 'auth': cartão centralizado (login, ativação), sem menu; no desktop, tela dividida com painel de marca.
 * - 'admin': coluna inteira, sem menu; o cabeçalho da tela faz o papel de barra superior.
 * - 'professor': barra lateral no desktop; menu inferior no celular/tablet se `mobileNav`.
 *
 * `active` e `onNav` são os mesmos que o menu inferior recebia. Sem `onNav`, usa a navegação padrão via `go`.
 */
export function AppShell({ variant = 'professor', go, active = null, onNav, mobileNav = true, children }) {
  if (variant === 'auth') {
    return (
      <div className="h-dvh lg:flex overflow-hidden bg-gray-50 md:bg-gray-200 lg:bg-white" style={FONT}>
        <PainelMarca />
        <div className="h-full lg:flex-1 lg:min-w-0 overflow-y-auto">
          <div className="min-h-full flex flex-col md:items-center md:justify-center md:p-8 lg:px-12 lg:py-8">
            <div className="relative w-full flex-1 flex flex-col bg-gray-50 md:flex-none md:max-w-md md:bg-white md:rounded-2xl md:shadow-xl lg:max-w-[460px] xl:max-w-[520px] lg:bg-transparent lg:rounded-none lg:shadow-none">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div className="h-dvh flex flex-col relative overflow-hidden bg-gray-50" style={FONT}>
        {children}
      </div>
    );
  }

  const handleNav = onNav || navPadrao(go);

  return (
    <div className="h-dvh flex overflow-hidden bg-gray-50" style={FONT}>
      <Sidebar active={active} onNav={handleNav} onSair={() => go('login')} />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {children}
        </div>
        {mobileNav && <BottomNav active={active} onNav={handleNav} />}
      </div>
    </div>
  );
}
