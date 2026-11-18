#!/usr/bin/env python3
"""Offline integrity check for the two public PROMETEI FM USDT QR matrices.

Install (optional): python -m pip install "qrcode>=8,<9"
Run: python scripts/generate-fm-donation-qr.py
No external network calls, wallet credentials, or payment execution.
The website renders the actual QRs from checked-in bit matrices.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "fm-donations.json"
QR_JS = ROOT / "fm-donate.js"
EXPECTED = {
    "tron-trc20": "TMGRFJKH851fjYZB6RmJSXKhsnDBq5gkGr",
    "bsc-bep20": "0x5a289561bf0bbd6b6748d8dcda2e37ef8d6d120a",
}
ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def verify_tron(address: str) -> None:
    if len(address) != 34 or not address.startswith("T"):
        raise ValueError("Incorrect TRON address prefix/length")
    number = 0
    for character in address:
        number = number * 58 + ALPHABET.index(character)
    decoded = number.to_bytes(25, "big")
    checksum = hashlib.sha256(hashlib.sha256(decoded[:-4]).digest()).digest()[:4]
    if decoded[0] != 0x41 or checksum != decoded[-4:]:
        raise ValueError("TRON Base58Check failed")


def main() -> None:
    try:
        import qrcode
    except ImportError as exc:
        raise SystemExit('Install Python package: python -m pip install "qrcode>=8,<9"') from exc

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    if not (config.get("version") == 2 and config.get("enabled") is True and
            config.get("ownerProvided") is True and config.get("asset") == "USDT"):
        raise ValueError("Unexpected configuration/asset")

    networks = config.get("networks")
    if not isinstance(networks, list) or [n.get("id") for n in networks] != list(EXPECTED):
        raise ValueError("Unexpected network order")

    matrix_strings = re.findall(r"qrRows: '([0-9a-f:]+)'",
                                QR_JS.read_text(encoding="utf-8"))
    if len(matrix_strings) != 2:
        raise ValueError("Two offline QR matrices are required")

    for network, packed in zip(networks, matrix_strings):
        network_id = network["id"]
        address = network["address"]
        if address != EXPECTED[network_id] or address != network.get("qrPayload"):
            raise ValueError(f"Mismatch for {network_id}")

        if network_id == "tron-trc20":
            verify_tron(address)
        elif not re.fullmatch(r"0x[0-9a-fA-F]{40}", address):
            raise ValueError("Bad BSC address format")

        qr = qrcode.QRCode(
            error_correction=qrcode.constants.ERROR_CORRECT_Q,
            box_size=1, border=4,
        )
        qr.add_data(address)
        qr.make(fit=True)
        matrix = qr.get_matrix()
        if len(matrix) != 41:
            raise ValueError(f"{network_id} unexpected QR size")
        regenerated = ":".join(
            format(int("".join("1" if pixel else "0" for pixel in row), 2), "011x")
            for row in matrix
        )
        if packed != regenerated:
            raise ValueError(f"{network_id}: QR matrix does not encode the address")

        print(f"PASS {network_id}: matching address, network and authentic QR matrix")
    print("Both codes verified. Deposit network and minimum must still be checked in the receiving account.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        print("Validation failed:", error, file=sys.stderr)
        raise SystemExit(1)
