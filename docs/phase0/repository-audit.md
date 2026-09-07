# Existing repository and behavior

## Scope and method

Reviewed all application modules, test code, configuration, dependency manifest/lockfile inventory, public assets and documentation. Enumerated the reusable component library and its imports/exports; these components are not currently imported into the gameplay route. This is an application architecture audit, not an audit of every third-party dependency's internals. `inventory.json` records files, sizes and hashes. No AGENTS.md was found in the workspace scan. Semantic code search returned HTTP 402; direct file reads and ripgrep were used instead.

The additional `images/` files and `images.zip` are untracked user materials. They are not imported by runtime code and are not rigged character assets. The active game asset is `public/fighters/realistic-atlas.png`. No GLB/GLTF character, skeleton, animation clip, 3D physics library or 3D scene exists in the current application.

## Ownership map

| Location | Current responsibility | Migration decision |
|---|---|---|
| `app/page.tsx` | Setup, roster, RAF loop, input listeners, HUD snapshots, rewards, storage, sound lifecycle and overlays | Keep visible UI where useful; gradually move simulation/session ownership out of the route |
| `app/engine.ts` | Match/profile types, roster stats, attack dispatch, paired holds, AI, movement, win rules, upgrades | Preserve behavior fixtures; extract rules and replace pixel-space integration |
| `app/renderer.ts` | Canvas arena/backstage/entrance drawing and sprite transforms | Legacy-only renderer; not a foundation for 3D animation |
| `app/mouse-controls.ts` | CSS-to-canvas coordinates, target selection, auto-approach | Retain input intent semantics; replace hit rectangles with raycast/world queries |
| `app/control-deck.tsx` | Movement pad and combat buttons | Reuse command affordances, prioritize laptop layout |
| `app/arena-audio.ts` | WebAudio synthesized music/crowd/hits and speech narration | Reuse sound service concepts; replace state polling with explicit events |
| `app/fighter-art.ts`, `fighter-portrait.tsx` | Atlas cropping and portrait canvases | Temporary legacy presentation only |
| `app/layout.tsx`, `globals.css` | Fonts, metadata and responsive visual shell | Preserve shell; later give gameplay the laptop viewport |
| `components/ui/*`, `lib/utils.ts`, `hooks/use-mobile.ts` | Starter component library and styling helpers | Keep; no mass rewrite/pruning |
| `tests/combat.mjs` | 25 in-memory deterministic checks through TS transpilation | Preserve unchanged; supplement with new system tests |
| `vite.config.ts`, `next.config.ts`, `.openai/hosting.json` | Vinext/Cloudflare build and existing Site identity | Preserve deployment path; client-only 3D initialization |
| `package.json`, lockfile, TS/lint/format configs | React 19.2.6, Vinext beta, Vite 8, TS 5.9.3; npm lockfile | No dependency changes in Phase 0 |
| `ASSETS.md`, `POWERHOUSE-NOTES.md` | Historical asset/video provenance and prior validation | Retain historical claims; this audit supersedes old QA status |

No application API endpoints, database binding, server simulation, model API keys or generative-AI gameplay calls were found. Hosting has null D1/R2 bindings. `pause_match` is an optional page-defined WebMCP integration, not a gameplay dependency.

## Behavioral baseline

Exactly four selectable identities, one player versus one CPU. Stats are Rhea power 94/speed 78; Chyna 112/70; Charlotte 86/87; Bianca 91/95. Chyna has 115 health; others 100. Only player stats receive career upgrades.

Match phases: `select → entrance → fight ↔ paused → over`. Entrances last eight seconds (four per participant), can be disabled or skipped, and are bypassed backstage. Presentation uses a shared ramp animation with name/color variation. `over` freezes simulation, awards points once, and offers rematch/setup; there are no interactive victory scenes.

The simulation runs from requestAnimationFrame with clamped variable delta, not a fixed-step accumulator. Match duration is 180 simulation seconds. Fighters use screen x/y, constrained to x 170–870 and y 325–445. Range uses y scaled by 1.5. Body separation is a rectangle-style push; ropes, stage, walls and furniture are drawn geometry rather than physical collision surfaces.

Keyboard: WASD/arrows movement, J punch, K kick, L suplex, G Chyna press, T toss, U submission, N pin, I finisher, Space block, F pickup/drop, H weapon, Q taunt, B ambush, E escape and Escape pause. Mouse floor click sets a destination; rival click approaches then attacks (pin if grounded in ring, submission backstage); right-button hold and a toggle button block. Keyboard movement cancels click navigation. Blur clears input and pauses active combat.

| Action | Existing behavior |
|---|---|
| Punch/kick | Immediate damage on invocation; range 132/148; costs 6/12 stamina; base damage 6/10 scaled by power/90 |
| Block | Reduces strike/weapon damage to 20%; no directional guard or reversal timing |
| Suplex/press/toss | Shared paired Hold structure; costs 25 stamina; duration 1.65/2.7/1.2 seconds; damage at 74% of duration |
| Finisher | Requires 100 momentum, consumes it; 2.2 seconds; base damage 38; named per wrestler but mostly shared execution |
| Pin | Grounded target, range 118, unavailable backstage; 3.2-second cover; health-dependent automatic CPU escape |
| Submission | Four-second hold; continuous health drain scaled by power; tap-out at zero HP; escape progress, but no body damage/rope break/technique model |
| Taunt | 1.5-second cooldown; +8 momentum or +12 against downed target |
| Ambush | Backstage-only; range 300; 35 stamina; 18-second recovery; paired 2-second move, base damage 28 |
| Weapons | Chair/kendo/hammer, nearby pickup, durability 3/5/4; base damage 19/14/25; knockdown on unblocked hit |

Stamina regenerates at 11/sec, or 7/sec while blocking. Damage grants attacker +12 and receiver +5 momentum, capped at 100. Grapples globally lock the two actors; timer/stamina continue while most cooldown/animation clocks pause. Ring zero HP requires pin/submission; backstage zero HP is a KO. Time limit compares absolute remaining HP, not percentages. Normal ring excludes weapons; Extreme allows weapons/table break; backstage adds wall impacts and KO. There is no steel cell mode.

CPU approaches continuously when outside range. At range it decides on a roughly 0.65–1.3 second cadence, may block (18% branch), uses finishers when charged, seeks pin/submission on grounded targets, and picks up nearby weapons. Randomness is injectable into `step`; the default is Math.random. There is no difficulty selector, reaction-memory model or reversal system. Existing AI reads world state, not raw player input; it can pressure recovery aggressively.

Career is `points/wins/losses/upgrades[4]` in localStorage key `queens-ring-career-v1`. Six starter points; win +3, loss/draw +1. Upgrade cost is next level, cap five: power +9% base, toughness +10 HP, speed +6% base. Parsing bounds invalid values. Storage errors fall back to session state. There is no schema field, IndexedDB abstraction, backup, season, manager, ranking, championship or rivalry.

Audio begins on a user gesture. Synthesized entrance riff/crowd/hits and generic device speech are present. Same narrator selection is used for every character. No lip movement, typed interview, subtitle sequencing or offline speech guarantee exists.

## Findings and risk register

| Priority | Finding/evidence | Required disposition |
|---|---|---|
| Critical to migration | Pixel-space simulation, sprite renderer and shared rotation-based grapples | Real world-space simulation, skeletal actor adapter and paired animation timeline; never relabel existing renderer 3D |
| High | One compressed attack/step module couples moves, AI and rules | Extract incrementally behind regression fixtures; move definitions and explicit legal state transitions |
| High | `page.tsx` owns simulation, HUD and persistence; input still accepts textarea/contenteditable keys | Introduce session/input scopes before typed promos; text input must suppress combat commands |
| High | No difficulty profiles; observed idle-player loss via pin at 2:34 remaining in one sample | Implement Casual default and seeded balance scenarios later; this sample is not a difficulty benchmark |
| High | Save has no explicit schema; rewards implemented in RAF | Versioned repository and idempotent match-result transaction before expanded career |
| Medium | Time-limit comparison uses absolute HP, favoring higher max-health characters | Product-rule decision and test before replacing it; do not silently change legacy baseline |
| Medium | Weapon drop creates a fresh pickup, pickup resets durability | Potential durability-reset exploit; add a fix/regression in combat migration, not preserve as a target feature |
| Medium | Ambush renderer moves attacker visually but does not commit that position to simulation | New paired actions must share authoritative root transforms |
| Medium | Audio observes message strings and sticky `tableBroken`; pause→fight repeats opening call | Emit one-shot typed events with IDs; reset match audio lifecycle |
| Medium | Submissions cost no stamina and ignore ropes/body condition; finishers lack distinct paired clips except Chyna sprite branch | Explicit future move and submission contracts |
| Medium | Atlas onload gates all match starts; portrait loading is duplicated | Decouple gameplay readiness from legacy artwork; shared asset cache and fallback |
| Medium | Controls below fold, clipped card headings at narrow preview; backstage PIN button visible though rejected by rules | Laptop viewport pass and contextual command availability later |
| Medium | Lint fails across application and starter components | Keep failure baseline visible; fix intentionally without disabling rules globally |
| Low | Historical test runner prints 20 and 24 summaries before its 25th assertion; unused impact local | New baseline runner reports per-suite status; old tests preserved |

Not implemented: running moves, counter windows, real body collision, full state machine, individualized submissions/entrances/victories, cameras, facial rig, hub/rooms, managers, typed interviews, season/rivalry, post-match options, title flow, robust versioned saves and performance panel. None is claimed complete by this audit.
