/* PROMETEI FM — owner-provided USDT donation addresses.
   Every QR matrix below was generated OFFLINE from the exact public address with
   Python qrcode (error correction Q, quiet zone 4) and checked against its payload.
   There are NO wallet integrations, private keys, payments, analytics or QR APIs.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = $('donate-status');
  if (!status) return;

  // Pinned public receiving addresses prevent a QR/card mismatch.
  const wallets = {
    'tron-trc20': {
      name: 'TRON (TRC20)',
      address: 'TMGRFJKH851fjYZB6RmJSXKhsnDBq5gkGr',
      qrRows: '00000000000:00000000000:00000000000:00000000000:01fc63ac7f0:0104abad410:017567245d0:017487d95d0:017567f95d0:01054360410:01fd55557f0:00008a8a000:0095b325b40:009b1666ea0:016d738e820:000897e9e30:01376351570:01f8b8acab0:0186ed645e0:006955fd100:016cf397c50:01e3e42a2c0:01dcf093660:00289556e00:00f4f6c57e0:01897cf1cd0:005e81165a0:0013e70c310:01f7c3b9f70:000197c7160:01fc3a4d5e0:0104126b130:01753df1f60:0174a527c60:0174c2e0dc0:0105963da00:01fcfd47290:00000000000:00000000000:00000000000:00000000000'
    },
    'bsc-bep20': {
      name: 'BSC (BEP20)',
      address: '0x5a289561bf0bbd6b6748d8dcda2e37ef8d6d120a',
      qrRows: '00000000000:00000000000:00000000000:00000000000:01fc85927f0:0104f3bd410:01757d1e5d0:0174a7d35d0:0175c4f35d0:01056d69410:01fd55557f0:0000de8f000:0095e4acb40:00fa9353020:0056b39a1a0:01186dfde80:01df5179f90:01b2ab26040:0097b6e6960:010383be900:00fd664ff30:01cb6b520e0:00a5678eb20:0132ce38e00:00d772f8520:012ac3f7ac0:0037665aa80:0079a9cd710:01af34e9f20:0001fe15140:01fc1285500:0104506d180:0175c279f90:01747ec7f60:0174d302f00:0105e04fa80:01fccfbf490:00000000000:00000000000:00000000000:00000000000'
    }
  };

  function addressValid(address, id) {
    if (id === 'tron-trc20') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    if (id === 'bsc-bep20') return /^0x[0-9a-fA-F]{40}$/.test(address);
    return false;
  }

  function qrSvg(matrix, address, network) {
    const size = 41;
    const rows = matrix.split(':');
    if (rows.length !== size || rows.some(x => !/^[0-9a-f]{11}$/.test(x))) {
      throw Error('Invalid QR matrix');
    }
    // The 41x41 matrix includes a standard four-module blank border.
    // Drawing horizontal runs keeps QR lines perfectly square and scannable.
    const paths = [];
    for (let y = 0; y < size; y++) {
      const bits = Number.parseInt(rows[y], 16).toString(2).padStart(44, '0').slice(-size);
      let x = 0;
      while (x < size) {
        if (bits[x] !== '1') { x++; continue; }
        const start = x;
        while (x < size && bits[x] === '1') x++;
        const width = x - start;
        paths.push('M' + start + ',' + y + 'h' + width + 'v1h-' + width + 'z');
      }
    }
    // Address and network are hardcoded above, not sourced from untrusted HTML.
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" ' +
      'width="328" height="328" shape-rendering="crispEdges" role="img" ' +
      'data-wallet-address="' + address + '" data-wallet-network="' + network + '">' +
      '<rect width="41" height="41" fill="#ffffff"/><path d="' + paths.join('') +
      '" fill="#0d1219"/></svg>';
  }

  function setMessage(text) {
    status.textContent = text;
  }

  async function copyAddress(address) {
    // Clipboard API requires HTTPS; older browsers can use the classic fallback.
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { await navigator.clipboard.writeText(address); return true; }
      catch (_) { /* Fallback below. */ }
    }
    const node = document.createElement('textarea');
    node.value = address;
    node.setAttribute('readonly', '');
    node.style.cssText = 'position:fixed;top:-300px;opacity:0;width:1px;height:1px';
    document.body.append(node);
    node.focus(); node.select();
    let ok = false;
    try { ok = document.execCommand('copy'); }
    catch (_) { ok = false; }
    node.remove();
    return ok;
  }

  async function init() {
    let config;
    try {
      const response = await fetch('/fm-donations.json', { cache: 'no-store' });
      if (!response.ok) throw Error('Donation configuration unavailable');
      config = await response.json();
    } catch (_) {
      setMessage('The donation cards are shown, but QR verification is temporarily unavailable. Compare the addresses carefully before sending.');
      return;
    }
    const cfg = new Map(Array.isArray(config.networks) ?
      config.networks.map(network => [network.id, network]) : []);
    const enabled = config.enabled === true && config.asset === 'USDT' &&
      config.ownerProvided === true && config.version === 2;
    if (!enabled) {
      setMessage('USDT donations are temporarily paused. Please do not transfer funds.');
      document.querySelectorAll('[data-copy-donation]').forEach(button => { button.disabled = true; });
      return;
    }

    let ready = 0;
    for (const [network, wallet] of Object.entries(wallets)) {
      const row = cfg.get(network);
      const card = document.querySelector('[data-donation-network="' + network + '"]');
      const image = $('donate-qr-' + (network === 'tron-trc20' ? 'tron' : 'bsc'));
      const addressNode = $('donate-address-' + (network === 'tron-trc20' ? 'tron' : 'bsc'));
      const button = document.querySelector('[data-copy-donation="' + network + '"]');
      if (!row || !card || !image || !addressNode || !button ||
          row.address !== wallet.address || row.qrPayload !== wallet.address ||
          addressNode.textContent.trim() !== wallet.address ||
          !addressValid(wallet.address, network)) {
        if (card) card.hidden = true;
        continue;
      }
      try {
        const svg = qrSvg(wallet.qrRows, wallet.address, network);
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        image.hidden = false;
        const loading = card.querySelector('.donate-qr-loading');
        if (loading) loading.hidden = true;
      } catch (_) {
        card.hidden = true;
        continue;
      }
      button.addEventListener('click', async () => {
        const copied = await copyAddress(wallet.address);
        if (copied) {
          const label = button.querySelector('.donate-copy-label');
          if (label) {
            label.textContent = 'COPIED ✓';
            window.setTimeout(() => { label.textContent = 'COPY ADDRESS'; }, 2200);
          }
          setMessage(wallet.name + ': address copied. Select the matching network in your wallet before sending USDT.');
        } else {
          setMessage('Copy is unavailable in this browser. Select and copy the visible address for ' + wallet.name + '.');
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(addressNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      });
      ready++;
    }
    if (ready === 2) {
      setMessage('Both receiving addresses are ready. Only send USDT on the corresponding TRC20 or BEP20 network.');
    } else {
      setMessage('One or more address/QR pairs failed verification. Do not send USDT to an unavailable card.');
    }
  }

  init();
})();
