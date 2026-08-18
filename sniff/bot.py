import sys
import json
from pathlib import Path

from ehi_decryptor import run


def main():
    if len(sys.argv) != 2:
        print(
            json.dumps({
                "ok": False,
                "error": "Uso: python bot.py archivo.ehi"
            }, ensure_ascii=False)
        )
        sys.exit(1)

    file_path = Path(sys.argv[1])

    if not file_path.exists():
        print(
            json.dumps({
                "ok": False,
                "error": "El archivo no existe."
            }, ensure_ascii=False)
        )
        sys.exit(1)

    if file_path.suffix.lower() != ".ehi":
        print(
            json.dumps({
                "ok": False,
                "error": "Solo se aceptan archivos .ehi"
            }, ensure_ascii=False)
        )
        sys.exit(1)

    try:
        file_bytes = file_path.read_bytes()

        result = run(file_bytes)

        if not result:
            result = "No se obtuvo ningún resultado."

        print(
            json.dumps({
                "ok": True,
                "result": result
            }, ensure_ascii=False)
        )

    except Exception as exc:
        print(
            json.dumps({
                "ok": False,
                "error": f"{type(exc).__name__}: {exc}"
            }, ensure_ascii=False)
        )
        sys.exit(1)


if __name__ == "__main__":
    main()