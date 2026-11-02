import { Outlet } from 'react-router-dom';

// Ponto de extensão para a autenticação (B1 / PR #14). Hoje o login é só visual e toda rota abre.
// Quando houver sessão, é aqui que uma rota privada sem login vai para o login e depois volta:
//   const location = useLocation();
//   if (!sessao) return <Navigate to={rotas.login} replace state={{ de: location }} />;
// e, no login, navigate(location.state?.de ?? rotas.painel(), { replace: true }).
export function RotaPrivada() {
  return <Outlet />;
}
