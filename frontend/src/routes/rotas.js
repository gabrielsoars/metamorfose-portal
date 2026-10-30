// URLs das telas (P-14). Monte os links com estas funções em vez de escrever o caminho na mão.

// Filtro do dashboard e de "questões com maior erro" vai na query string (?turma=&simulado=).
function comFiltro(caminho, filtro) {
  const params = new URLSearchParams();
  if (filtro?.turmaId) params.set('turma', filtro.turmaId);
  if (filtro?.simuladoId) params.set('simulado', filtro.simuladoId);
  const query = params.toString();
  return query ? `${caminho}?${query}` : caminho;
}

export const rotas = {
  inicio: '/',
  login: '/login',
  ativacao: '/ativacao',
  recuperarSenha: '/recuperar-senha',
  redefinirSenha: '/redefinir-senha',

  admin: '/admin',
  professorNovo: '/admin/professores/novo',
  professor: (id) => `/admin/professores/${id}`,

  painel: (filtro) => comFiltro('/painel', filtro),
  questoesErro: (filtro) => comFiltro('/painel/questoes-erro', filtro),

  turmas: '/turmas',
  turmaNova: '/turmas/nova',
  turma: (id) => `/turmas/${id}`,
  turmaEditar: (id) => `/turmas/${id}/editar`,

  simulados: '/simulados',
  simuladoNovo: '/simulados/novo',
  simulado: (id) => `/simulados/${id}`,
  simuladoEditar: (id) => `/simulados/${id}/editar`,
  simuladoGabarito: (id) => `/simulados/${id}/gabarito`,
  correcao: (simuladoId, alunoId) => `/simulados/${simuladoId}/alunos/${alunoId}/correcao`,
  boletim: (simuladoId, alunoId) => `/simulados/${simuladoId}/alunos/${alunoId}/boletim`,

  perfil: '/perfil',
};

// Lê o filtro da query string no formato usado pelas telas ({ turmaId, simuladoId }).
export function filtroDaUrl(searchParams) {
  return { turmaId: searchParams.get('turma') ?? '', simuladoId: searchParams.get('simulado') ?? '' };
}
