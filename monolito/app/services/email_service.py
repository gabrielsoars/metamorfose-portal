import logging
import smtplib
from email.message import EmailMessage

from ..core.config import get_settings

logger = logging.getLogger(__name__)


def enviar_codigo_ativacao(email: str, codigo: str) -> None:
    settings = get_settings()

    if not settings.smtp_host:
        if settings.app_env == "development":
            # Sem SMTP em desenvolvimento, o código só fica acessível pelo log.
            # Nunca acontece em homologação/produção.
            logger.warning("SMTP não configurado. Código de ativação de %s: %s", email, codigo)
        else:
            logger.error("SMTP não configurado. Código de ativação de %s não foi enviado.", email)
        return

    mensagem = EmailMessage()
    mensagem["Subject"] = "Metamorfose - código de primeiro acesso"
    mensagem["From"] = settings.smtp_from
    mensagem["To"] = email
    mensagem.set_content(
        f"Seu código de primeiro acesso é {codigo}.\n"
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
        logger.exception("Falha ao enviar código de ativação para %s.", email)
