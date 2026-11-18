# Publish PROMETEI WEB 2.0 from GitHub on Cloudflare Pages (free)

1. Sign in at https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Choose **Create application → Pages → Import an existing Git repository**.
3. Authorize the **Cloudflare Workers and Pages** GitHub App for **only** the `prometei-web-2` repository, not private Android/source repositories.
4. Pick `urchenckoyaroslav-star/prometei-web-2`, branch `main`.
5. Build preset: **None**. Build command: leave blank (or `echo static`). Output directory: `.` (repository root). No secrets or environment variables needed.
6. Deploy and wait for Cloudflare to display the assigned **live `*.pages.dev` address**. Do not invent the address — check it in Cloudflare.
7. Test routes `/`, `/privacy.html`, `/account-deletion.html`, `/child-safety.html`, `/support.html`, `/privacy-phantom.html`, `/privacy-pokonap.html`, `/portfolio.html`, `/app-ads.txt` on that exact host.
8. Confirm official SDK/data disclosures, account deletion contact procedure, Play policies and app-ads before updating Google Play Console / AdMob. Keep a checked production deployment URL in the store listing.

Official Cloudflare docs: https://developers.cloudflare.com/pages/get-started/git-integration/
