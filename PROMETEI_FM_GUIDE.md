# PROMETEI FM — Station operator model (v2)

Public page: https://prometei-web-2.pages.dev/fm

## Station policy
- Only site operators program the playlists via GitHub and fm-config.json. Public users cannot add playlists or local audio or alter the official station configuration.
- The current YouTube source uses YouTube's **visible official embedded player**. Users can listen, pause, and may access standard YouTube controls. Each user receives a local playlist session, **not synchronized live radio**. Public music history is not fabricated: history shown on the site is the visitor's own listening history.
- A future authenticated operator console should control a centralized server-side queue (Cloudflare Access/Workers + D1, with audit log and roles). Never ship a DJ token in public JavaScript or rely on hiding buttons for authorization.
- For live PC broadcasting, host an **authorized, rights-cleared audio stream** via a broadcast server (e.g. Icecast) and set `mode` to `pc` and `pcStreamUrl` to the HTTPS MP3/AAC stream URL in fm-config.json. PC must upload the actual audio to this licensed stream. Local browser file selection cannot broadcast to other visitors.
- **Do not** use YouTube videos as an audio source for an Icecast stream or download/extract/rebroadcast embedded YouTube audio. YouTube is a separate, visible player option. Do not bypass embedded player ads or autoplay limitations.
- Site design is retained in the original PROMETEI FM style.

## Song requests and future payments
- The song request form creates a prefilled email draft sent by the visitor's email program to prometetimes@gmail.com? **No**: official inbox is `prometeimes@gmail.com` (the webpage uses the correct address). Nothing is uploaded or charged by our site.
- Telegram fallback: https://t.me/AlnairCanopus
- Payments are **not active**. Before accepting paid requests: confirm music and public broadcast rights; select a real payment provider and merchant account; create server-verified payment checkout and webhook; add published price, refund/cancellation rules, privacy/terms; process only fully paid and approved requests and ensure a refund if not fulfilled. Do not sell YouTube video access or promise pay-to-play of YouTube embeds.
- Proposed statuses: submitted -> awaiting review -> payment invited -> payment confirmed -> queued -> aired (or refunded). Rate-limit messages and prevent spam. No unverified payment state in the browser.

## Current configuration
- `fm-config.json`: `mode: "youtube"` and curated YouTube playlist array; optional `pcStreamUrl` is empty until a legitimate stream server exists.
- GitHub source updates deploy to Cloudflare Pages. Keep playlist IDs verified and embeddable.
- `npm run check` validates script syntax; `npm run build` builds the FM page as part of the site.
