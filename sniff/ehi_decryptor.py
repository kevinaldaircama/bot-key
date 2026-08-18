import struct
import base64
import json
import hashlib
import io
import contextlib
from typing import Optional, Dict, Any

from Crypto.Cipher import AES, ChaCha20_Poly1305
from Crypto.Util.Padding import unpad

try:
    from argon2.low_level import hash_secret_raw, Type
    ARGON2_AVAILABLE = True
except ImportError:
    ARGON2_AVAILABLE = False


class EHIConstants:
    L1_KEY = bytes.fromhex(
        "7e1210f7aab956f7a668bda6e57feddb7f84ad840aef8d27b1b969959be3ab6c"
    )

    L2_KEY_STATIC = bytes.fromhex(
        "b2bc617c32d8b9eb1943a5ffa8051eea"
    )

    EOO_MASTER_KEY = b"null=V5kU5+FFrY\x00"

    BYPASS_IVS = (
        bytes.fromhex("221d572349555f1d112133236b1f4a3f"),
        bytes.fromhex("5543494c53443e3f4a6a4539384e776a"),
        bytes.fromhex("374c2541575e4d531a3c327b75431e5f"),
    )

    STANDARD_IVS = (
        bytes.fromhex("2c5d1147bbad422b3b334d4d235f1a53"),
        bytes.fromhex("522b01433a5e8b2fc7549e1ad368e541"),
        bytes.fromhex("337a1035aaedf3458ca167e92d74b839"),
    )

    STD_ALPHABET = (
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/"
    )

    CUSTOM_ALPHABET = (
        "RkLC2QaVMPYgGJW/A4f7qzDb9e+t6Hr0Zp8OlNyjuxKcTw1o5EIimhBn3UvdSFXs"
    )

    TRANSLATION_TABLE = str.maketrans(
        CUSTOM_ALPHABET,
        STD_ALPHABET
    )


class EHIDecryptor:

    @staticmethod
    def _custom_b64_decode(encoded_str: str) -> bytes:
        clean_str = encoded_str.replace("?", "")

        if len(clean_str) % 4:
            clean_str += "=" * (4 - len(clean_str) % 4)

        return base64.b64decode(
            clean_str.translate(EHIConstants.TRANSLATION_TABLE)
        )

    @staticmethod
    def _decrypt_xor_layer(
        ciphertext_str: str,
        key: str
    ) -> Optional[str]:

        if not ciphertext_str or not isinstance(ciphertext_str, str):
            return ciphertext_str

        if not key or not isinstance(key, str):
            return ciphertext_str

        try:
            raw = EHIDecryptor._custom_b64_decode(
                ciphertext_str[::-1]
            )

            hex_string = raw.decode("ascii")

            if len(hex_string) % 2:
                hex_string = "0" + hex_string

            raw_bytes = bytes.fromhex(hex_string)

            key_len = len(key)

            decrypted = bytearray(
                b ^ ord(key[i % key_len])
                for i, b in enumerate(raw_bytes)
                if (b ^ ord(key[i % key_len])) != 0
            )

            plaintext = decrypted.decode("utf-8")

            if plaintext:
                bad = sum(
                    1
                    for c in plaintext
                    if ord(c) < 32 and ord(c) not in (9, 10, 13)
                )

                if bad / len(plaintext) > 0.5:
                    return None

            return plaintext

        except Exception:
            return None

    @staticmethod
    def _decode_config_message(ciphertext_str: str) -> str:

        if not ciphertext_str or not ciphertext_str.strip():
            return ciphertext_str

        try:
            padded = ciphertext_str + "=" * (
                (4 - len(ciphertext_str) % 4) % 4
            )

            raw_bytes = base64.b64decode(padded)

            utf16_bytes = (
                raw_bytes
                .decode("utf-8", errors="replace")
                .encode("utf-16-be", errors="surrogatepass")
            )

            num_chars = len(utf16_bytes) // 2

            java_chars = struct.unpack(
                f">{num_chars}H",
                utf16_bytes
            )

            key_chars = [ord(c) for c in "EHIMSG"]

            xored_chars = [
                char ^ key_chars[i % len(key_chars)]
                for i, char in enumerate(java_chars)
            ]

            xored_bytes = struct.pack(
                f">{num_chars}H",
                *xored_chars
            )

            return (
                xored_bytes
                .decode("utf-16-be", errors="surrogatepass")
                .encode("utf-16", "surrogatepass")
                .decode("utf-16")
            )

        except Exception:
            return ciphertext_str

    @staticmethod
    def _decode_inner_fields(
        parsed_json: Dict[str, Any],
        salt_key: str
    ) -> Dict[str, Any]:

        if not isinstance(parsed_json, dict):
            return (
                {"raw_data": parsed_json}
                if parsed_json is not None
                else {}
            )

        cleaned = {}

        vital_keys = {"overwriteServerData"}

        for key, value in parsed_json.items():

            if isinstance(value, str) and value.strip():

                if key == "configMessage":
                    decrypted = EHIDecryptor._decode_config_message(value)
                else:
                    decrypted = EHIDecryptor._decrypt_xor_layer(
                        value,
                        salt_key
                    )

                if decrypted is not None:
                    cleaned[key] = decrypted

                elif key in vital_keys:
                    cleaned[key] = value

            else:
                cleaned[key] = value

        return cleaned

    @staticmethod
    def _xxtea_decrypt(data: bytes, key: bytes) -> bytes:

        if not data:
            return b""

        if len(data) % 4:
            data += b"\x00" * (4 - len(data) % 4)

        k = struct.unpack(
            "<4I",
            key.ljust(16, b"\x00")[:16]
        )

        n = len(data) // 4

        if n < 2:
            return data

        v = list(
            struct.unpack(
                f"<{n}I",
                data
            )
        )

        delta = 0x9E3779B9

        sum_val = (
            (6 + 52 // n) * delta
        ) & 0xFFFFFFFF

        y = v[0]

        while sum_val != 0:

            e = (sum_val >> 2) & 3

            for p in range(n - 1, 0, -1):

                z = v[p - 1]

                mx = (
                    (((z >> 5) ^ (y << 2))
                     + ((y >> 3) ^ (z << 4)))
                    ^ (
                        (sum_val ^ y)
                        + (k[(p & 3) ^ e] ^ z)
                    )
                )

                y = v[p] = (
                    v[p] - mx
                ) & 0xFFFFFFFF

            z = v[n - 1]

            mx = (
                (((z >> 5) ^ (y << 2))
                 + ((y >> 3) ^ (z << 4)))
                ^ (
                    (sum_val ^ y)
                    + (k[e] ^ z)
                )
            )

            y = v[0] = (
                v[0] - mx
            ) & 0xFFFFFFFF

            sum_val = (
                sum_val - delta
            ) & 0xFFFFFFFF

        decrypted = struct.pack(
            f"<{n}I",
            *v
        )

        length = v[-1]

        if 0 < length <= n * 4:
            return decrypted[:length]

        return decrypted.rstrip(b"\x00")

    @staticmethod
    def _parse_ehi_bytes(
        file_bytes: bytes
    ) -> Optional[bytes]:

        try:
            f = io.BytesIO(file_bytes)

            def read_utf():
                size = f.read(2)

                if len(size) < 2:
                    return ""

                length = struct.unpack(">H", size)[0]

                return f.read(length).decode(
                    "utf-8",
                    errors="ignore"
                )

            read_utf()
            f.read(8)

            read_utf()
            f.read(8)

            p_len_bytes = f.read(4)

            if len(p_len_bytes) < 4:
                return None

            p_len = struct.unpack(
                ">I",
                p_len_bytes
            )[0]

            f.read(8)

            result = f.read(p_len)

            return result if result else None

        except Exception:
            return None

    @staticmethod
    def _generate_master_key(
        config: Dict[str, Any]
    ) -> bytes:

        values = (
            config.get("configAesKey", ""),
            config.get("configIdentifier", ""),
            config.get("configSalt", ""),
            str(config.get("configTimestamp", 0)),
            str(config.get("configExpiryTimestamp", 0)),
            config.get("lockModes", ""),
            config.get("lockModesHash", ""),
            config.get("configHwid", ""),
            config.get("configLockMobileOperatorId", "")
        )

        payload = "".join(
            str(value)
            for value in values
            if value
        )

        return hashlib.sha256(
            payload.encode("utf-8")
        ).digest()

    @classmethod
    def execute(
        cls,
        file_bytes: bytes
    ) -> Optional[str]:

        try:

            if not ARGON2_AVAILABLE:
                return (
                    "ERROR: Falta argon2-cffi.\n"
                    "Instala con:\n"
                    "pip install argon2-cffi"
                )

            parsed = cls._parse_ehi_bytes(file_bytes)

            candidates = []

            if parsed:
                candidates.append(parsed)

            if file_bytes not in candidates:
                candidates.append(file_bytes)

            config = None
            matched_iv = None

            for candidate in candidates:

                if not candidate:
                    continue

                for iv in (
                    EHIConstants.BYPASS_IVS
                    + EHIConstants.STANDARD_IVS
                ):

                    try:

                        cipher1 = AES.new(
                            EHIConstants.L1_KEY,
                            AES.MODE_CBC,
                            iv
                        )

                        l1_text = unpad(
                            cipher1.decrypt(candidate),
                            16
                        ).decode(
                            "utf-8",
                            errors="replace"
                        )

                        parts = l1_text.split(":")

                        if len(parts) < 3:
                            continue

                        cipher2 = AES.new(
                            EHIConstants.L2_KEY_STATIC,
                            AES.MODE_CBC,
                            base64.b64decode(parts[0])
                        )

                        garbage = unpad(
                            cipher2.decrypt(
                                base64.b64decode(parts[2])
                            ),
                            16
                        )

                        final_raw = cls._xxtea_decrypt(
                            garbage,
                            EHIConstants.EOO_MASTER_KEY
                        )

                        start = final_raw.find(b"{")

                        if start == -1:
                            continue

                        config = json.loads(
                            final_raw[start:].decode(
                                "utf-8",
                                errors="ignore"
                            )
                        )

                        matched_iv = iv
                        break

                    except Exception:
                        continue

                if config:
                    break

            if not config:
                return (
                    "ERROR: No se pudo descifrar el archivo .ehi."
                )

            target_salt = (
                config.get("configSalt")
                or "EVZJNI"
            )

            if matched_iv in EHIConstants.BYPASS_IVS:

                parsed_final = config

            else:

                target_data = config.get("configData")

                aaa_result = None

                if target_data:
                    aaa_result = cls._decrypt_xor_layer(
                        target_data,
                        target_salt
                    )

                if not aaa_result:

                    parsed_final = config

                else:

                    try:

                        raw_payload = base64.b64decode(
                            aaa_result
                        )

                        if len(raw_payload) <= 50:
                            parsed_final = config

                        else:

                            argon_key = hash_secret_raw(
                                secret=cls._generate_master_key(config),
                                salt=raw_payload[0x0A:0x1A],
                                time_cost=int.from_bytes(
                                    raw_payload[1:5],
                                    "little"
                                ),
                                memory_cost=int.from_bytes(
                                    raw_payload[5:9],
                                    "little"
                                ),
                                parallelism=raw_payload[9],
                                hash_len=32,
                                type=Type.ID
                            )

                            cipher3 = ChaCha20_Poly1305.new(
                                key=argon_key,
                                nonce=raw_payload[0x1A:0x32]
                            )

                            cipher3.update(
                                raw_payload[:0x1A]
                            )

                            decrypted = cipher3.decrypt_and_verify(
                                raw_payload[0x32:-16],
                                raw_payload[-16:]
                            )

                            parsed_final = json.loads(
                                decrypted.decode(
                                    "utf-8",
                                    errors="ignore"
                                )
                            )

                    except Exception:
                        parsed_final = config

            cleaned = cls._decode_inner_fields(
                parsed_final,
                target_salt
            )

            for field in (
                "v2rRawJson",
                "overwriteServerData"
            ):

                if field not in cleaned:
                    continue

                raw = cleaned[field]

                if not isinstance(raw, str):
                    continue

                try:

                    start = raw.find("{")
                    end = raw.rfind("}")

                    if start != -1 and end != -1:

                        obj = json.loads(
                            raw[start:end + 1],
                            strict=False
                        )

                        if isinstance(obj, str):
                            obj = json.loads(
                                obj,
                                strict=False
                            )

                        cleaned[field] = obj

                except Exception as exc:

                    cleaned[f"{field}_PARSING_ERROR"] = str(exc)

            return json.dumps(
                cleaned,
                indent=4,
                ensure_ascii=False
            )

        except Exception as exc:

            return (
                f"ERROR: Excepción procesando .ehi "
                f"({type(exc).__name__}: {exc})"
            )


def run(file_bytes: bytes) -> Optional[str]:
    return EHIDecryptor.execute(file_bytes)