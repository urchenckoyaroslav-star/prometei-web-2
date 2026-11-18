/* PROMETEI FM voluntary support; render payment data only if VERIFIED and network-matched.
 * No tracking, no payment initiation, no third-party QR service.
 * The QR is a locally hosted SVG generated from the exact verified receiving address.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const wallet = $('donate-wallet');
  const pending = $('donate-pending');
  const status = $('donate-status');
  const qr = $('donate-qr');
  const placeholder = $('donate-qr-placeholder');
  const labels = {
    'tron-trc20': 'TRON · TRC20',
    'bsc-bep20': 'BNB Smart Chain · BEP20',
    'ethereum-erc20': 'Ethereum · ERC20',
    'polygon-pos': 'Polygon PoS',
    'arbitrum-one': 'Arbitrum One'
  };
  const text = value => String(value ?? '').trim();
  function addressValid(address, network) {
    if (network === 'tron-trc20') return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    if (['bsc-bep20','ethereum-erc20','polygon-pos','arbitrum-one'].includes(network))
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    return false;
  }
  async function load() {
    try {
      const response = await fetch('/fm-donations.json', {cache:'no-store'});
      if (!response.ok) return;
      const config = await response.json();
      const network = text(config.network);
      const address = text(config.address);
      const ok = config.enabled === true && config.verifiedByOwner === true &&
        config.asset === 'USDT' && addressValid(address, network) &&
        config.qrSvgPath === '/assets/fm-usdt-qr.svg';
      if(!ok) return;
      // If the static QR file is absent or not an SVG, keep the payment section
      // unavailable instead of showing a wrong or unscannable payment QR.
      const qrResponse = await fetch(config.qrSvgPath, {cache:'no-store'});
      if(!qrResponse.ok || !(qrResponse.headers.get('content-type')||'').includes('image/svg+xml'))return;
      // Only accept QR SVGs produced by our verified generator; metadata
      // must bind the QR to the same intended network and receiving address.
      const svg = await qrResponse.text();
      if (!svg.includes('data-wallet-address="'+address+'"') ||
          !svg.includes('data-wallet-network="'+network+'"') ||
          !svg.includes('<svg') || svg.length < 500) return;
      qr.src = config.qrSvgPath;
      qr.alt = 'Scan to copy the verified USDT receiving address on '+labels[network];
      $('donate-address').value = address;
      $('donate-network').textContent = labels[network];
      qr.hidden = false; placeholder.hidden = true;
      $('donate-qr-caption').textContent = 'SCAN TO VIEW THE RECEIVE ADDRESS';
      pending.hidden = true; wallet.hidden = false;
      status.textContent = 'Please verify both the address and the network in your wallet before sending.';
      $('donate-copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(address);
          status.textContent = 'Address copied. Network: '+labels[network]+'.';
        } catch(_) {
          $('donate-address').select();
          status.textContent = 'Select and copy the address above. Check the network before sending.';
        }
      });
    } catch (_) {
      // No cryptographic address or QR is disclosed if config is missing/malformed.
    }
  }
  if(wallet && pending && status && qr && placeholder)load();
})();
