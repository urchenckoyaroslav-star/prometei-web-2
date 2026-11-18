# PROMETEI FM & Website — Live Verification (2026-11-18)

## Confirmed results
- Public site `https://prometei-web-2.pages.dev/` and radio `/fm` were independently crawled by the connected OpenSEO site auditor.
- **Second audit** `add11396-f31f-4812-bef8-bb39e3e40cc3`: 19 URLs processed, 18 normal 200 pages plus `/index.html` redirect 308, and no critical/warning issues. The sole informational finding is the intended noindex on `/fm-studio`.
- Original audit `7d195177-d6dc-4744-90ab-cf2239350b31` found orphan locale pages and title/description length issues; subsequent fixes eliminated them in the second audit.
- The DJ Studio page successfully rendered in an Opera browser tab with all 3 curated NCS playlists, radio-source selector, and password field. It explicitly displayed `Reading static fallback. DJ writes require Cloudflare KV + secret.` This is evidence that API-backed writes have **not** been confirmed or enabled.
- Created separate OpenSEO project `62a3ca5e-d535-4cff-bedd-bec1e44df08f` for the Cloudflare site, preserving the original WordPress SEO project. The connected Search Console property `https://prometei-web-2.pages.dev/` has owner permission.
- Google URL inspection returned `URL is unknown to Google` on 2026-11-18 for homepage, FM, portfolio, 6 locales and how-it-works. Google crawling/indexing is pending and cannot be guaranteed by code changes.
- Public IndexNow verification key `1d22f8ed373440c5ac5bdb3911851900.txt` is in the repo. OpenSEO returned `submitted` for 10 recently updated URLs; search engines will verify the hosted file, and this is not Google indexing.

## Implemented in source
1. Static fallback with operator-curated public YouTube playlists, displayed through visible official YouTube player.
2. Protected Cloudflare Pages station function `/api/fm/station` with secure bearer authentication, KV persistence, schema validation, and no source password inside public JS.
3. DJ Studio controls: playlist management, featured playlist, stop/start, source selection: YouTube playlists, YouTube Live (OBS broadcast from PC) or authorized Icecast-compatible HTTPS PC audio stream.
4. Visitor FM polls server-side settings periodically; if Cloudflare KV is not configured, it reads the static `fm-config.json`.
5. Mobile/touch breakpoints, root-relative assets, YouTube external fallback link, PC audio reconnect, responsive typography and reduced-motion accessibility.
6. Original PROMETEI cosmic visual design and Play Store links retained. Free song requests open pre-filled email messages; payments are disabled.
7. Node API/SEO unit tests and GitHub CI recipe committed; independent `npm run check` and real playback runtime were **not** verified by this Chat session.

## Required to reach real DJ-operated global playback
1. In Cloudflare Workers & Pages project `prometei-web-2` > Settings > Bindings: create/bind **Workers KV** namespace with variable name exactly `FM_STATE` for Production. Redeploy.
2. Under Variables and Secrets add encrypted 32-byte random secret `FM_DJ_TOKEN` (43+ base64url chars recommended); never post value to GitHub or ChatGPT. Redeploy.
3. Open `/fm-studio`, enter the token, choose YouTube, add/choose playlists, and save. Verify `GET /api/fm/station` returns managed=true and the studio no longer reports static fallback. Test from a fresh second device. KV replication may delay source changes.
4. For **one live broadcast** on all listeners: either use OBS to stream authorized content to an enabled YouTube Live channel, paste the 11-character live video ID in Studio, choose YouTube Live; or use an authorized audio streaming server and Windows script `scripts/fm-pc-broadcast.ps1`, then enter the public HTTPS audio URL and choose PC.
5. For the current curated YouTube mode, visitors independently hear playlists; it is not a single synchronized live station. Do not describe it as such.
6. Confirm audio on Windows, Opera, Android and iOS with listener click/autoplay restrictions. Verify actual GitHub CI status and Cloudflare Function bindings through account access.
7. Keep payment collection OFF until future explicit setup, rights and refund policy.

## Reference links
- [Site audit report](https://app.openseo.so/p/13a2b608-0332-4d9b-87a8-31dd4859309c/audit?auditId=add11396-f31f-4812-bef8-bb39e3e40cc3)
- [Cloudflare SEO project](https://app.openseo.so/p/62a3ca5e-d535-4cff-bedd-bec1e44df08f)
- [Cloudflare Pages bindings docs](https://developers.cloudflare.com/pages/functions/bindings/)
- [FM operator guide](PROMETEI_FM_GUIDE.md)


## Continuation checkpoint — 2026-11-18 19:49 Europe/Kyiv

- Live browser tab `https://prometei-web-2.pages.dev/fm` confirmed site content and PROMETEI Messenger installation link. This does not verify synchronized broadcasting.
- The Cloudflare account's API Tokens page displayed confirmation that a token named `PROMETEI_FM_SETUP` had been created. **Never copy the token itself into GitHub issues, logs or chat.** Creation of an account API token is not proof of any Pages environment changes.
- Latest GitHub Actions run `44353670874` on commit `52ec802a27499569ebaa1f8cee070d3e2934e60d` was independently checked via the authenticated GitHub connector and has conclusion **success** (Node checks, Python syntax, DJ unit tests, build, Pages output). GitHub Pages run `44353668165` also has conclusion **success**. Earlier email notifications about failed jobs are stale.
- Not yet verified in this continuation: `FM_STATE` Workers KV namespace and Pages Production binding, encrypted `FM_DJ_TOKEN`, redeployment with those bindings, authenticated DJ Studio save, server-wide history, or a real live PC stream. No claim of active broadcasting should be made.
- The user's existing Windows FM setup program is currently prompting for a Cloudflare API token. The safe next step is to copy it **inside the user's local Cloudflare browser** directly to the **hidden local Windows installer prompt**. Do not put it in a website, repository, message or screenshot. The local installer should be checked for trusted provenance before entering a credential. After configuration, verify `GET /api/fm/station` and `GET /api/fm/history` and a DJ Studio save from two independent devices.
- Source files responsible for the backend are `functions/api/fm/station.js` and `functions/api/fm/history.js`. GitHub repository changes alone cannot create production Cloudflare KV resources or secrets.
- No tokens, credentials or private music files were committed by this status update.
