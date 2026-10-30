import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { C } from '../data/constants.js';
import { MobileShell } from '../components/ui.jsx';
import { useTitulo } from '../routes/titulo.js';
import { rotas } from '../routes/rotas.js';

// URL que não existe, ou registro (turma, simulado, aluno...) que não foi encontrado.
export function NaoEncontradoScreen({
  titulo = 'Página não encontrada',
  mensagem = 'O endereço aberto não existe no Metamorfose.',
  voltarPara = rotas.inicio,
  voltarTexto = 'Ir para o início',
}) {
  useTitulo(titulo);

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <SearchX size={28} />
        </div>
        <h1 className="text-base font-bold text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-500">{mensagem}</p>
        <Link to={voltarPara} className="mt-2 text-sm font-bold hover:underline" style={{ color: C.orange }}>
          {voltarTexto}
        </Link>
      </div>
    </MobileShell>
  );
}
