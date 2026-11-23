# Dependency security review

Checked on 2026-11-23 with `npm audit --omit=dev --audit-level=high` in `app/`.

- High-severity advisories are cleared with narrow npm overrides: PostCSS `8.5.33` and TOML `5.0.1`. Build/runtime checks are required after overrides and recorded in `test-results.md`.
- npm still reports 15 moderate advisories with no fix according to the registry report. They come through the legacy `@solana/web3.js` 1.x dependency chain (`jayson`, `stream-json`, `uuid`) used by the wallet adapter and Anchor JS client. No major dependency migration was forced because it could break Solana transaction behavior; reassess when upstream releases compatible fixes.
- The app stores no user profiles or private data. On-chain records are public, and the UI warns against personal details in item text.
