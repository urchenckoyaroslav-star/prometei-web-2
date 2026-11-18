#!/usr/bin/env python3
"""Create a local, verifiable USDT donation QR for PROMETEI FM.

Install: python -m pip install "qrcode>=8,<9"
Usage: python scripts/generate-fm-donation-qr.py
Reads only fm-donations.json and writes assets/fm-usdt-qr.svg.
The QR encodes JUST the public receiving address. Network is conveyed separately.
No wallet private keys, seed phrases, accounts, or third-party QR APIs.
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "fm-donations.json"
OUT = ROOT / "assets" / "fm-usdt-qr.svg"
NETWORKS = {
    "tron-trc20": "TRON TRC20",
    "bsc-bep20": "BNB Smart Chain BEP20",
    "ethereum-erc20": "Ethereum ERC20",
    "polygon-pos": "Polygon PoS",
    "arbitrum-one": "Arbitrum One",
}
EVM_NETWORKS = {"bsc-bep20", "ethereum-erc20", "polygon-pos", "arbitrum-one"}


def validate(config: dict) -> tuple[str, str]:
    if config.get("enabled") is not True or config.get("verifiedByOwner") is not True:
        raise ValueError("Do not generate a payment QR for an unverified or disabled donation wallet.")
    if config.get("asset") != "USDT":
        raise ValueError("Only the exact USDT asset is supported.")
    if config.get("qrSvgPath") != "/assets/fm-usdt-qr.svg":
        raise ValueError("qrSvgPath must be /assets/fm-usdt-qr.svg.")
    network = str(config.get("network", "")).strip()
    address = str(config.get("address", "")).strip()
    if network not in NETWORKS:
        raise ValueError("Unknown network — check the network selected in the actual wallet.")
    if network in EVM_NETWORKS:
        ok = bool(re.fullmatch(r"0x[0-9a-fA-F]{40}", address))
    else:
        ok = bool(re.fullmatch(r"T[1-9A-HJ-NP-Za-km-z]{33}", address))
    if not ok:
        raise ValueError("Wallet address format does not match the selected network.")
    return address, network


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    address, network = validate(config)

    try:
        import qrcode
        from qrcode.image.svg import SvgPathImage
    except ImportError as exc:
        raise SystemExit('Missing dependency: python -m pip install "qrcode>=8,<9"') from exc

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=8, border=4)
    qr.add_data(address)
    qr.make(fit=True)
    generated = qr.make_image(image_factory=SvgPathImage)
    svg = ET.fromstring(generated.to_string())
    svg.set("data-wallet-address", address)
    svg.set("data-wallet-network", network)
    svg.set("role", "img")
    svg.set("aria-label", f"USDT donation address QR: {NETWORKS[network]}")
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(ET.tostring(svg, encoding="utf-8", xml_declaration=True))
    print(f"Generated QR for public USDT address on {NETWORKS[network]}.")
    print("CRITICAL: scan it with an independent wallet scanner, compare the decoded address")
    print("character by character, and verify network before enabling public donations.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as e:
        print("Refusing to generate donation QR:", e, file=sys.stderr)
        raise SystemExit(1)
