# PROMETEI FM — Operator setup (v3)

## What is ready in source
- DJ console: https://prometei-web-2.pages.dev/fm-studio (noindex; **write access requires a server-side token**).
- Public station: https://prometei-web-2.pages.dev/fm with mobile layout, SEO metadata, crawlable descriptions, FAQ, official YouTube embeds and free email-based song requests.
- DJ can add up to 24 YouTube playlists, pin one playlist or use rotation, switch on/off and select a PC source.
- Changes propagate through Cloudflare Pages Functions and KV. The public page polls at 20-second intervals; Cloudflare KV is eventually consistent so some listeners update later.
- YouTube visitors have **independent playback timelines** inside a visible official YouTube player. This is NOT one synchronized radio live stream. Users can still use official YouTube player controls.
- One shared live PC audio source is possible when the PC sends properly authorized content to an Internet-accessible audio streaming service (Icecast, etc.).
- No real payments.

## Deploy backend (required for saving from DJ Studio)
1. In Cloudflare Pages project linked to GitHub \`prometei-web-2\`, use the Git repository integration with build command \`npm run build\` and output directory \`dist\`.
2. In Cloudflare dashboard > Workers & Pages > your project > Settings > Bindings, create a **Workers KV** namespace and bind it to the Pages application with the exact variable name \`FM_STATE\` in Production (and Preview if desired). Follow Cloudflare's Pages KV binding guide. Redeploy if prompted.
3. In Pages > Settings > Variables and Secrets add a long, cryptographically random **secret** with the exact name \`FM_DJ_TOKEN\`. Use 32 random bytes (Base64URL 43 chars) or stronger, not a predictable password. Keep secret outside git, backups and screenshots. Production & Preview settings are independent.
4. Deploy/redeploy Pages. \`GET /api/fm/station\` returns 404 before first saved station config; \`POST\` returns 503 until both KV and secret are set.
5. Open /fm-studio, paste the secret into the password input and press REFRESH STATUS. Select YouTube, add playlists if needed, choose the featured playlist or automatic rotation, then press GO ON AIR / SAVE. This saves the central station configuration. The secret stays only in the tab input and is sent on save over HTTPS.
6. View FM on another device. Refresh if needed; allow up to the KV propagation window. YouTube autoplay needs a listener tap. Test desktop + Android + iOS + 360px widths.

Do not publish or guess a default token. The DJ control page can be discovered, but saving without the server-side key is prohibited. Cloudflare WAF / rate limit rules for \`POST /api/fm/station\` are recommended.

## Option A — curated YouTube collections
- From Studio: choose YouTube -> add up to 24 embeddable playlist URLs/IDs -> choose a featured list or automatic list selection -> GO ON AIR.
- The official visible iframe runs locally for every listener. No extraction, restreaming, invisible playback or ad bypass.
- Some videos cannot embed, and YouTube or browsers may block autoplay. Do not claim perfect sync across listeners.

## Option B — stream licensed audio from Windows PC
1. Provision a real Icecast-compatible server (not the Pages static site itself). Enable a **public HTTPS audio URL** (for example \`https://radio.example.com/live.mp3\`), with correct MIME type \`audio/mpeg\`, cross-origin playback allowed and a valid HTTPS certificate. Its source upload port, often 8000, can be private and different from the public HTTPS proxy.
2. Install FFmpeg on Windows; add it to PATH. Keep only tracks you have permission to broadcast in a local folder.
3. Download \`scripts/fm-pc-broadcast.ps1\` from the GitHub source and run PowerShell:
   \`\`\`powershell
   powershell -ExecutionPolicy Bypass -File .\fm-pc-broadcast.ps1 -MusicFolder "C:\Radio\Licensed" -IcecastHost "radio.example.com" -Port 8000 -Mount live.mp3
   \`\`\`
   Supply the server SOURCE password when prompted. FFmpeg reads local files, shuffles a playlist and pushes MP3 audio to the server. Ctrl+C stops. The dedicated Icecast source password appears in the FFmpeg process command line while running; do not use an important reusable password or leave your workstation untrusted.
4. Test the public HTTPS listening URL from another network in a browser. In DJ Studio select PC and enter that HTTPS listening URL, then GO ON AIR. Listeners will switch to the shared live radio stream on their next poll.
5. To return to official YouTube playlists, choose YouTube and save. To close the station, TAKE OFF AIR.

**IMPORTANT:** You cannot stream Windows local audio to the public by merely selecting a local file inside the browser; server + broadcast software is required. YouTube must not be used as the source for the Icecast broadcast; it remains inside the official YouTube embed.

## Search / SEO
- FM page includes a real HTML \`<title>\`, canonical URL, meta description, WebApplication JSON-LD, visible playlist names and indexable FAQ content.
- The site build generates \`sitemap.xml\` including /fm and robots.txt. The DJ Studio has noindex.
- Google Search Console should inspect the canonical FM URL and sitemap after Cloudflare deployment. Search ranking and indexing are decided by Google, not guaranteed.
- Public FM copy avoids fabricated track history, fake real-time radio stats and unsupported 24/7 claims.

## Rights and future payments
- Only rights-cleared local music should be transmitted on the shared audio stream. NCS and other YouTube playlists are **not automatically licensed** for independent radio rebroadcast.
- Requests currently open a prefilled email to \`prometeimes@gmail.com\`. The listener must hit Send. No payment or database submission takes place.
- Paid priority can be added only after music rights, merchant verification, refunds, secure payment confirmation and user notices are finished.

## Testing
Run \`npm run check\`, including Node syntax verification and unit checks for station API authorization and listener/SEO markup. Also test actual remote deployment and playback manually.

## PC broadcast using OBS and YouTube Live
- On a verified, live-enabled YouTube channel, start an OBS stream containing only music you own or are explicitly allowed to broadcast. Keep the YouTube streaming key private, outside the site and GitHub.
- In DJ Studio select YouTube Live and paste the 11-character video ID from the public YouTube watch URL; press GO ON AIR (requires Cloudflare KV + FM_DJ_TOKEN).
- Listeners then tune into the same official visible YouTube Live player. Delay may vary; some clients require a tap to start. Copyright owners/Content ID may block music, and ad playback depends on YouTube.
- Without active Cloudflare storage, the operator may set `mode: "youtube_live"`, `enabled: true`, `liveVideoId: "REAL_VIDEO_ID"` in `fm-config.json` and redeploy.
