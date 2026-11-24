import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GabaritoScreen } from './GabaritoScreen.jsx';
import { renderApp, renderNaRota, urlAtual } from '../../test/rotas';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

const simulado = {
  id: 12,
  titulo: '2º Simulado ENEM',
  data_aplicacao: '2026-06-15',
  total_questoes: 3,
  turmas: [{ id: 1, nome: 'Turma A' }],
};

describe('GabaritoScreen com OMR', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:gabarito-oficial');
    URL.revokeObjectURL = vi.fn();
    // jsdom não decodifica imagem: simula falha em carregarImagem e segue com o arquivo original.
    vi.stubGlobal('Image', class {
      set src(_valor) {
        queueMicrotask(() => this.onerror?.());
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('após cadastrar um simulado, permite escanear foto via OMR e salvar o gabarito oficial', async () => {
    const fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);
      const method = (options.method || 'GET').toUpperCase();

      if (url.endsWith('/usuarios')) return json([]);
      if (url.endsWith('/turmas')) return json([{ id: 1, nome: 'Turma A', ano: 2026, turno: 'Manhã' }]);
      if (url.endsWith('/simulados') && method === 'POST') return json(simulado, 201);
      if (url.endsWith('/simulados/12') && method === 'GET') return json(simulado);
      if (url.endsWith('/simulados/12/gabarito') && method === 'GET') return json([]);
      if (url.endsWith('/simulados/12/gabarito') && method === 'PUT') return json(JSON.parse(options.body));
      if (url.endsWith('/simulados/12/alunos')) return json({ total: 0, alunos: [] });
      if (url.includes('/processar?num_questoes=3') && method === 'POST') {
        return json({
          sucesso: true,
          total_questoes: 3,
          questoes: [
            { questao: 1, resposta: 'B', confianca: 0.92, status: 'ok' },
            { questao: 2, resposta: 'D', confianca: 0.89, status: 'ok' },
            { questao: 3, resposta: 'A', confianca: 0.95, status: 'ok' },
          ],
          sem_resposta: [],
          multipla_marcacao: [],
          avisos: [],
        });
      }
      return json({ detail: 'Não encontrado.' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    const router = renderApp('/simulados/novo');

    await user.type(await screen.findByPlaceholderText(/1º Simulado ENEM/i), '2º Simulado ENEM');
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-06-15' } });
    const questoesInput = document.querySelector('input[type="number"]');
    await user.clear(questoesInput);
    await user.type(questoesInput, '3');
    await user.click(screen.getByRole('button', { name: /salvar e continuar/i }));

    expect(await screen.findByRole('heading', { name: 'Revisar Gabarito' })).toBeInTheDocument();
    expect(urlAtual(router)).toBe('/simulados/12/gabarito');
    expect(screen.getByTestId('image-picker')).toBeInTheDocument();

    const foto = new File(['conteudo'], 'gabarito-oficial.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('input-galeria'), { target: { files: [foto] } });

    await waitFor(() => expect(screen.getByText('Revise as alternativas lidas pelo sistema.')).toBeInTheDocument());
    expect(screen.getByAltText('Gabarito enviado')).toHaveAttribute('src', 'blob:gabarito-oficial');
    expect(screen.getByText('3 / 3 marcadas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /salvar gabarito oficial/i }));

    await waitFor(() => expect(urlAtual(router)).toBe('/simulados/12'));
    expect(router.state.historyAction).toBe('REPLACE');

    const scanCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/processar?num_questoes=3'));
    expect(scanCall).toBeTruthy();
    expect(scanCall[1].body).toBeInstanceOf(FormData);

    const putCall = fetchMock.mock.calls.find(([url, o]) => String(url).endsWith('/simulados/12/gabarito') && o?.method === 'PUT');
    expect(putCall).toBeTruthy();
    expect(JSON.parse(putCall[1].body)).toEqual([
      { num_questao: 1, alt_correta: 'B' },
      { num_questao: 2, alt_correta: 'D' },
      { num_questao: 3, alt_correta: 'A' },
    ]);
  });

  it('exibe avisos de sem_resposta e multipla_marcacao do OMR e limpa o alerta ao revisar manualmente', async () => {
    const fetchMock = vi.fn(async (input, options = {}) => {
      const url = String(input);
      const method = (options.method || 'GET').toUpperCase();

      if (url.endsWith('/simulados/12/gabarito') && method === 'GET') return json([]);
      if (url.endsWith('/simulados/12/gabarito') && method === 'PUT') return json(JSON.parse(options.body));
      if (url.includes('/processar?num_questoes=3') && method === 'POST') {
        return json({
          sucesso: true,
          total_questoes: 5,
          questoes: [
            { questao: 1, resposta: 'A', confianca: 0.95, status: 'ok' },
            { questao: 2, resposta: null, confianca: 0, status: 'sem_resposta' },
            { questao: 3, resposta: 'E', confianca: 0.55, status: 'multipla_marcacao' },
            { questao: 4, resposta: 'C', confianca: 0.9, status: 'ok' },
          ],
          sem_resposta: [2],
          multipla_marcacao: [3],
          avisos: [],
        });
      }
      return json({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderNaRota(<GabaritoScreen simulado={simulado} />, { rota: '/simulados/12/gabarito' });

    const foto = new File(['conteudo'], 'cartao.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('input-galeria'), { target: { files: [foto] } });

    expect(await screen.findByText('Atenção: Em branco ou rasura')).toBeInTheDocument();
    expect(screen.getByText('Atenção: Múltipla marcação')).toBeInTheDocument();
    expect(screen.getByText('O scan leu 5 questões, mas o simulado tem 3. As não lidas ficam em branco.')).toBeInTheDocument();
    expect(screen.getByText('2 / 3 marcadas')).toBeInTheDocument();

    // Revisar manualmente a questão 2 (em branco) limpa o aviso dessa questão.
    const radiosC = screen.getAllByRole('radio', { name: 'C' });
    await user.click(radiosC[1]);

    expect(screen.queryByText('Atenção: Em branco ou rasura')).not.toBeInTheDocument();
    expect(screen.getByText('3 / 3 marcadas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /salvar gabarito oficial/i }));

    const putCall = fetchMock.mock.calls.find(([url, o]) => String(url).endsWith('/simulados/12/gabarito') && o?.method === 'PUT');
    expect(putCall).toBeTruthy();
    expect(JSON.parse(putCall[1].body)).toEqual([
      { num_questao: 1, alt_correta: 'A' },
      { num_questao: 2, alt_correta: 'C' },
      { num_questao: 3, alt_correta: 'E' },
    ]);
  });
});
