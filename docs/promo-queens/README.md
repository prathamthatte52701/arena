# Promo Queens

**Product:** Promo Queens

**Primary experience:** cinematic typed wrestling promos.

**Current character:** Rhea.

**Current priority:** face, expressions, gaze, lip movement, speech performance, gestures and cinematic framing.

**Active routes:** `/` home and `/promo-rhea` Rhea backstage promo.

**Legacy wrestling engine:** deprecated and retained only in git history; it is removed from the active product tree.

This V1 slice is local-only. It uses supplied Rhea reference imagery, deterministic performance timing, browser SpeechSynthesis and no backend, database or external AI provider.

Run `npm ci`, then `npm run dev` and open `http://127.0.0.1:3000`.
For local production preview, run `npm run build` followed by `npm start`.
Both servers bind to loopback. No hosting account or deployment configuration is required.

Checks: `npm run typecheck`, `npm run lint`, and `npm test`.
See [the final cleanup report](final-cleanup-report.md) for the dependency and file audit.
