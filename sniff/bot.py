import os
import tempfile

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from ehi_decryptor import run


BOT_TOKEN = os.getenv("BOT_TOKEN")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 EHI Decryptor Bot\n\n"
        "Envíame un archivo .ehi y lo procesaré."
    )


async def recibir_ehi(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
):
    document = update.message.document

    if not document:
        return

    filename = document.file_name or ""

    if not filename.lower().endswith(".ehi"):
        await update.message.reply_text(
            "❌ Solo acepto archivos .ehi"
        )
        return

    await update.message.reply_text(
        "⏳ Procesando tu archivo..."
    )

    temp_path = None

    try:
        telegram_file = await document.get_file()

        with tempfile.NamedTemporaryFile(
            suffix=".ehi",
            delete=False
        ) as temp:
            temp_path = temp.name

        await telegram_file.download_to_drive(temp_path)

        with open(temp_path, "rb") as f:
            file_bytes = f.read()

        result = run(file_bytes)

        if not result:
            result = "❌ No se obtuvo ningún resultado."

        if len(result) > 4000:
            result = result[:4000] + (
                "\n\n⚠️ Resultado recortado por Telegram."
            )

        await update.message.reply_text(
            "✅ Procesamiento terminado\n\n"
            + result
        )

    except Exception as e:
        await update.message.reply_text(
            f"❌ Error procesando el archivo:\n{e}"
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def main():
    if not BOT_TOKEN:
        raise RuntimeError(
            "Falta la variable de entorno BOT_TOKEN"
        )

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(
        CommandHandler("start", start)
    )

    app.add_handler(
        MessageHandler(
            filters.Document.ALL,
            recibir_ehi
        )
    )

    print("🤖 Bot iniciado...", flush=True)

    app.run_polling()


if __name__ == "__main__":
    main()