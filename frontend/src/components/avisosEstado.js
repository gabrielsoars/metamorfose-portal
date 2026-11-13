// Estado dos avisos de erro (o componente que os exibe é o <Avisos />).
// `mostrarErro` pode ser chamado de qualquer lugar, como o window.alert que ele substitui.
// O estado mora no módulo (e não num Context) para as telas testadas sem provider continuarem funcionando.

const DURACAO_MS = 5000;
const MAXIMO = 3;

let avisos = [];
let proximoId = 1;
const ouvintes = new Set();
const timers = new Map();

function atualizar(novos) {
  avisos = novos;
  ouvintes.forEach((ouvir) => ouvir());
}

export function inscreverAvisos(ouvir) {
  ouvintes.add(ouvir);
  return () => ouvintes.delete(ouvir);
}

export const lerAvisos = () => avisos;

export function fecharAviso(id) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (avisos.some((a) => a.id === id)) atualizar(avisos.filter((a) => a.id !== id));
}

export function mostrarErro(mensagem) {
  const id = proximoId++;
  // Acima do máximo, o mais antigo sai.
  const novos = [...avisos, { id, mensagem }];
  novos.slice(0, -MAXIMO).forEach((a) => fecharAviso(a.id));
  atualizar(novos.slice(-MAXIMO));
  timers.set(id, setTimeout(() => fecharAviso(id), DURACAO_MS));
}

// Só para os testes: zera os avisos e os timers sem notificar a tela, que já foi desmontada.
export function limparAvisos() {
  timers.forEach(clearTimeout);
  timers.clear();
  avisos = [];
}
