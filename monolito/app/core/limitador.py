import threading
import time
from collections import deque


class LimiteTentativas:
    """Conta tentativas por chave (ex.: e-mail) dentro de uma janela de tempo.

    Fica em memória: zera quando o monolito reinicia e não é compartilhado entre
    processos. Suficiente enquanto o uvicorn roda com um único worker.
    """

    _MAX_CHAVES = 10_000

    def __init__(self, maximo: int, janela_segundos: float):
        self.maximo = maximo
        self.janela_segundos = janela_segundos
        self._tentativas: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _expirar(self, chave: str, agora: float) -> deque[float] | None:
        tentativas = self._tentativas.get(chave)
        if tentativas is None:
            return None
        while tentativas and agora - tentativas[0] >= self.janela_segundos:
            tentativas.popleft()
        if not tentativas:
            del self._tentativas[chave]
            return None
        return tentativas

    def bloqueado(self, chave: str) -> bool:
        with self._lock:
            tentativas = self._expirar(chave, time.monotonic())
            return tentativas is not None and len(tentativas) >= self.maximo

    def registrar(self, chave: str) -> None:
        with self._lock:
            agora = time.monotonic()
            # Evita que chaves inventadas (e-mails inexistentes) acumulem para sempre
            if len(self._tentativas) >= self._MAX_CHAVES:
                for outra in list(self._tentativas):
                    self._expirar(outra, agora)
            self._expirar(chave, agora)
            self._tentativas.setdefault(chave, deque()).append(agora)

    def limpar(self, chave: str) -> None:
        with self._lock:
            self._tentativas.pop(chave, None)

    def resetar(self) -> None:
        with self._lock:
            self._tentativas.clear()
