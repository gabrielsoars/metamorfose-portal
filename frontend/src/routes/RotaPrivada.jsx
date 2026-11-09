import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ehAdmin } from '../services/sessao.js';
import { rotas } from './rotas.js';
import { rotaInicial, useSessao } from './sessao.jsx';

// Sem sessão, vai para o login e guarda a URL pedida para voltar depois de entrar.
// `somenteAdmin`: quem não é admin vai para a própria tela inicial.
export function RotaPrivada({ somenteAdmin = false }) {
  const { sessao } = useSessao();
  const location = useLocation();

  if (!sessao) return <Navigate to={rotas.login} replace state={{ de: location }} />;
  if (somenteAdmin && !ehAdmin(sessao.usuario)) return <Navigate to={rotaInicial(sessao.usuario)} replace />;
  return <Outlet />;
}
