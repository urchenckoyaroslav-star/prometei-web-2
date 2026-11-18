# PROMETEI FM — Hybrid Personal Radio (v1)

Live page: https://prometei-web-2.pages.dev/fm
Source files: fm.html, fm.css, fm.js, fm-config.json

## Functions
- Add multiple public, embeddable YouTube playlist URLs or IDs in the browser. The official visible YouTube IFrame player plays them. No audio extraction or hidden playback.
- Select multiple local audio files: browser plays temporary object URLs; **no user audio is uploaded**.
- Modes: YouTube, My PC, Hybrid. The mixer chooses between sources (weighted in hybrid mode), selects random playlists and random local files with recent-repeat avoidance. YouTube shuffle is used within playlists. Loaded YouTube playlist video IDs are cached in memory to randomly choose start positions on later visits.
- Play/Pause/Next and ended auto-advance, with user gesture required initially. Browser autoplay restrictions and video blocking may intervene.
- Now Playing uses actual YouTube Player video metadata (title and channel) or parses local filenames of the form Artist - Title.mp3.
- History contains actual playback events, stored up to 60 entries in browser localStorage. No fake global feed.

## What this is not
This v1 is a **personal browser station**, not a synchronized public radio stream. Each visitor has their own rotation and private listening log. Files selected from your PC are available to that browser session only, never to other visitors. A real 24/7 shared broadcast would require licensed/authorized music, backend storage, playback service and persistent infrastructure.

## Sitewide featured playlists
Edit fm-config.json and populate the playlists array with real, verified YouTube playlist IDs, e.g.:

    {"version":1,"playlists":[{"name":"Owner-approved playlist","id":"ACTUAL_VALID_PLAYLIST_ID"}]}

Personal playlists added through the website itself are stored only on the visitor's device, not published sitewide. Never add invalid IDs or invent on-air artist history.

## Rights and security
YouTube references:
https://developers.google.com/youtube/iframe_api_reference
https://developers.google.com/youtube/player_parameters

Use official YouTube embed with visible player and controls, respect embedding restrictions, no audio extraction, downloading or proxying. Some videos may prohibit playback or autoplay. No API keys are shipped to client.

The FM page is SEO indexable, but private history is not indexable public artist content. Artist pages and public track history would require real shared program data, original descriptions and applicable permissions.

## Possible next iteration
Cloudflare D1/KV shared track history, real 24/7 licensed Icecast/HLS channel, authorized public feed and translated labels for all seven PROMETEI site languages.
