import logging
import smtplib
from email.message import EmailMessage

from ..core.config import get_settings

logger = logging.getLogger(__name__)


def enviar_codigo_ativacao(email: str, codigo: str) -> None:
    _enviar_codigo(email, codigo, "primeiro acesso")


def enviar_codigo_redefinicao(email: str, codigo: str) -> None:
    _enviar_codigo(email, codigo, "redefinição de senha")


def _enviar_codigo(email: str, codigo: str, finalidade: str) -> None:
    settings = get_settings()

    if not settings.smtp_host:
        if settings.app_env == "development":
            # Sem SMTP em desenvolvimento, o código só fica acessível pelo log.
            # Nunca acontece em homologação/produção.
            logger.warning("SMTP não configurado. Código de %s de %s: %s", finalidade, email, codigo)
        else:
            logger.error("SMTP não configurado. Código de %s de %s não foi enviado.", finalidade, email)
        return

    mensagem = EmailMessage()
    mensagem["Subject"] = f"Metamorfose - código de {finalidade}"
    mensagem["From"] = settings.smtp_from
    mensagem["To"] = email
    mensagem.set_content(
        f"Seu código de {finalidade} é {codigo}.\n"
        f"Ele expira em {settings.codigo_ativacao_expire_minutes} minutos."
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password or "")
            smtp.send_message(mensagem)
    except (smtplib.SMTPException, OSError):
        logger.exception("Falha ao enviar código de %s para %s.", finalidade, email)
