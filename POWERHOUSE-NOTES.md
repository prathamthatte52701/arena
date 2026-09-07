# Powerhouse edition — reference and implementation notes

## Video review

The supplied clips were opened through YouTube and sampled visually; they were not downloaded. This is not a claim to have watched all four clips end to end.

- https://www.youtube.com/shorts/mAChMSzDl7k — WWE Vault, "Chyna's WrestleMania debut was INTENSE". Sampled a ringside close-range head/shoulder-control sequence. The game power toss is a simplified arcade interpretation, not a frame-accurate reconstruction.
- https://www.youtube.com/shorts/kYIRMTvhEn0 — "2-on-1 Handicap Match: Chyna vs The Corporation Pat Patterson & Gerald Brisco". Sampled entrance and match action. No two-opponent attack is claimed; the game remains one-on-one.
- https://www.youtube.com/watch?v=jtWE_L4E0aU — "Chyna Attacks Stephanie (Triple H Arrested) 8-31-00". Sampled opening confrontation and ring action. Backstage brawls are a requested game mode, not a claim about this video's setting.
- https://www.youtube.com/watch?v=oK_xD-gYSdU — "Trish Stratus vs. Chyna | RAW IS WAR (2001)". At about 3:05 the opponent is lifted, at 3:09–3:10 held horizontally overhead, and at 3:12 lies face-down after the release. This directly informs the new Chyna-only Gorilla Press: lift, overhead hold, forward drop. The game compresses the sequence to 2.7 seconds.

## Gameplay

- Chyna base power 112 and health 115, with a unique G press slam. Pedigree uses a distinct folding/drop pose rather than the generic suplex pose.
- Main Event, Extreme Rules and Backstage Assault modes; backstage wins by KO or submission.
- Eight-second entrances, split between the two fighters, with skip and setup toggle.
- F picks up/drops nearby chair, kendo stick or sledgehammer. H swings. Weapons have limited durability.
- T power toss can cause wall impact in backstage and break the table once in weapon-enabled modes.
- Power, toughness and speed upgrades cost training points; 6 starter points, wins +3 and losses/draws +1. Each stat has five levels. Saves are device-local with validation and session fallback if storage fails.
- Stamina gates heavy attacks. Q taunt creates an exposed cooldown in exchange for momentum.

## Art status

The new reference-conditioned draft is saved at `outputs/reference-atlas-draft.png`. Imagegen repeatedly baked checkerboard backgrounds into its new output. Explicit user authorization for another editing method remains pending. This release uses the previously verified transparent AI sprite atlas, with improved portrait cropping, and does not ship a broken background. No new reference art is falsely claimed as integrated.

This is a 2D browser arcade game with sprite pose changes and procedural animation, not a WWE 2K-equivalent 3D engine or motion-captured animation.

## Validation

20 deterministic combat/progression tests, TypeScript and production build. No broad game-browser QA requested. The optional pause_match WebMCP tool remains unverified because no supported validation context was available.
