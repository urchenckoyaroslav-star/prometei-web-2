# Cloudflare Pages — production deployment for PROMETEI WEB 2.1

## Connect the existing site (free, no paid server)

1. Open https://dash.cloudflare.com/ and **sign in or create a free Cloudflare account**. OAuth/2FA/captcha and acceptance of Cloudflare terms require the owner's action. The previously checked dashboard displayed a sign-in page; a production Pages project has **not** been confirmed yet.
2. Go to **Workers & Pages → Create application → Pages → Connect to Git**, then choose **GitHub**.
3. Authorize **only** `urchenckoyaroslav-star/prometei-web-2` for the Cloudflare Pages GitHub integration (do not authorize private Android/bridge repositories).
4. Select `main` as production branch and a project name such as `prometei-web-2` **if available**. Do not assume the hostname is free until Cloudflare assigns it.
5. Framework preset: **None**; **Build command:** `npm run build`; **Build output directory:** `dist`. Root directory: repository root. No npm dependencies.
6. Complete the first deployment, then copy the exact live production URL shown in the dashboard. The hostname normally ends with `.pages.dev` and includes HTTPS.
7. In Pages project settings, add environment variable `SITE_URL` to the **production** environment with the exact stable URL including trailing `/`, e.g. `https://<your-confirmed-project>.pages.dev/` (example only; verify it first). Trigger **Retry deployment**. The build uses this value for canonical, Open Graph, hreflang and sitemap addresses. `CF_PAGES_URL` is a fallback and may point at a deployment preview address.
8. Verify HTTP 200 and correct canonical URLs for `/`, `/ru/`, `/uk/`, `/de/`, `/es/`, `/zh/`, `/ja/`, `/how-it-works.html`, `/privacy.html`, `/account-deletion.html`, `/child-safety.html`, `/support.html`, `/app-ads.txt`, `/sitemap.xml`, `/robots.txt`.
9. Only after the production hostname has been verified, add the new website as a **URL-prefix property** in https://search.google.com/search-console/ ; complete Google owner verification and submit `https://<confirmed-host>/sitemap.xml` in **Sitemaps**. Google cannot guarantee a date/rank for indexing.
10. Do **not** update Google Play Console legal URLs until the privacy/delete/child safety policy drafts are checked against actual app behavior and a verified account-deletion request channel is provided. The `app-ads.txt` publisher ID and Play-listed developer website domain must also match for AdMob verification.

## SEO architecture

`npm run build` outputs SSR-like static language pages with server-visible H1/text, self-referencing canonicals and reciprocal hreflang. The English home page is `/`, while translations are `/uk/`, `/ru/`, `/de/`, `/es/`, `/zh/` and `/ja/`. Inner legal pages remain in English and are not falsely advertised as complete translated policies. Structured MobileApplication markup contains no fabricated reviews or ratings. The sitemap and robots use `SITE_URL`.

## GitHub Pages mirror

Existing GitHub Pages remains at https://urchenckoyaroslav-star.github.io/prometei-web-2/ and is not deleted. Once Cloudflare is live, choose one canonical domain to avoid splitting SEO signals across mirrors. Change the GitHub Pages canonical metadata / sitemap carefully or add redirects when possible. Old blocked WordPress.com URLs cannot be redirected without control of that host.
