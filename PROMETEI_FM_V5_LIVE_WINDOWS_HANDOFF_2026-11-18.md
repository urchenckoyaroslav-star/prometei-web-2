# PROMETEI FM V5 — live PC broadcaster integration and handoff

## Date / outcome
2026-11-18. The user asked for the radio DJ to see ALL tracks, current
position/duration, seek within the song, previous/next/pause/resume,
pick a track, and search the catalog while **all listeners hear the same stream**.

**GitHub and Pages:** source commit `3d8f3246` adds new `/fm-studio`
private DJ deck, `/api/fm/control` API and Python remote control protocol.
GitHub Actions `44392372451` and deployment `44392370473` both completed successfully.
Public `/fm-console.js` returned HTTP 200 when checked from the user's PC.

**Windows PC via authenticated NEXUS2OPERA bridge**: live NEXUS session was
verified on private engineering Issue #46 (request 6990857341 and correlated
READY response 6990858364). Registered active project `fm_v43_live` pointing
to the existing `PROMETEI_FM_V4_3_PC_FIRST_YOUTUBE_20MIN` folder in the user's
Downloads. Original `fm_v4` registered project was stale/nonexistent.

The V4.3 PC engine `prometei_fm_pc_radio.py` has been updated **on disk**,
with NEXUS SHA-guarded backups. It integrates the new `fm_remote_control.py`,
a pre-scanned catalog (760 files at inspection), elapsed position tracking,
seek/skip/song selection and pause/resume through the existing shared MP3 encoder.
`fm_pc_heartbeat.py` adds a compatible user agent while keeping the 36h
history protocol, PC audio health requirement and 20-minute failover behavior.
Python compilation PASS, existing heartbeat unit tests 2 PASS, and isolated
RemoteDJ track mapping/position/ack/queue smoke test PASS.

New `START_PROMETEI_FM_V5.cmd` and upgraded original
`PROMETEI_FM_START_V4_3.cmd` both open the updated radio menu.
Option 2 calls `PROMETEI_FM_OWNER_V5.ps1`, which securely loads a
Windows DPAPI-protected DJ secret (or prompts for it locally, with hidden
input), then starts the ORIGINAL `PROMETEI_FM_OWNER_V3.ps1` orchestration.
This keeps PC-first broadcasting, tunnel, local port 8765 and automatic
YouTube playlist fallback after 20 minutes with no authenticated PC audio.
Source music files were not modified and the currently running broadcast
was **not interrupted**.

## Important blocker — not yet end-to-end active
During verification the user's existing PC radio was **on air**,
`audioFresh=true`, **760 files**. Production Cloudflare endpoint:
- `GET /fm-studio` HTTP 200
- `GET /fm-console.js` HTTP 200
- `GET /api/fm/station` HTTP 200, mode=pc
- `GET /api/fm/control` HTTP **503**
  with `{"error":"Private DJ control is not configured"}`
- `/api/fm/history` HTTP 200, `configured:true` but no current live track.

This means the dedicated Cloudflare production `FM_DJ_TOKEN` secret
is absent or not available to the new API (the shared `FM_STATE` KV is
present for station/history). On the Windows PC the expected DPAPI file
was **not found**, so the new engine cannot yet authenticate after restart.

Do NOT claim the remote buttons work for listeners until both Cloudflare
and the PC share the DJ token, the V5 engine is actually restarted and
a new live command is acknowledged from PC. Cloudflare secret or API
tokens must NEVER be pasted in GitHub Issues, source or ChatGPT.

The owner's existing local `SETUP_CLOUDFLARE.ps1` was safely patched
on Windows with original-SHA guard, backup, and PowerShell parser PASS.
**Crucially** its formerly automatic switch to YouTube at the end of
setup was removed; it now verifies the private DJ control endpoint
without changing live PC station settings.

## Remaining owner-local activation (one-time secret setup)
1. Open `START_PROMETEI_FM_V5.cmd` (or upgraded original launcher)
   after the current live radio has been stopped normally. (The existing
   broadcast was intentionally kept alive during this patch.)
2. Choose menu **1**, paste the **Cloudflare account-scoped API token**
   into the *hidden local PowerShell prompt*, never into the chat.
   Needs Pages Edit and Workers KV Storage Edit permissions. This creates
   and stores the FM_DJ_TOKEN secret with Windows-user DPAPI.
3. Choose menu **2**, then in the original owner broadcast menu choose
   the public radio startup (**3**) after independently confirming the
   necessary audio broadcast rights. The PC and tunnel start as before.
4. Choose menu **3** from the initial FM menu to copy the protected DJ
   token locally. Open `https://prometei-web-2.pages.dev/fm-studio`,
   paste the token in the DJ field, press LOAD and check that ~760
   files and live track status appear.
5. Test next, pause, resume, seek and choose one track while listening
   from a second browser/phone; check PC acknowledgments and history.
   Cloudflare KV may propagate commands with some latency.

No radio restart, Cloudflare credential provision, or live on-air command
was performed during this session. User permission and a private token
are still necessary for the final activation. Preserve the user's
specific official YouTube backup playlist and all other station settings.
