# Phase 5 Asset-Pending Work

**Status:** Technical mobile flow and final animated character integration are complete. Only the six client-approved 2D setting stickers remain as visual finishing work.

## Completed Without Final Assets

- Three guided topics and six setting records are loaded from the backend.
- Legacy scenarios remain available in a separate section.
- Topic and legacy requests fail independently and retain the usable experience.
- Guided settings open the shared briefing and AR runtime.
- Guided AR opening no longer calls the legacy scenario endpoint.
- Prototype avatar registry maps every current `avatar_key` to an existing GLB.
- Guided session metadata is sent to chat and stored in practice history.
- Fallback topic content matches the approved backend seed.

## Completed Character Assets

- Dr Emma Collins, Sarah Bennett, Olivia Reed, and Michael Harris use dedicated GLB assets.
- Every GLB embeds a 2K texture and exposes the exact animation names `Idle` and `Talking`.
- Character scale and origin are normalized for the shared AR runtime.
- `AvatarRegistry` maps all six guided settings without changing backend setting records.
- Flutter analysis, guided-flow tests, GLB re-import validation, and Android debug build pass.
- Final appearance and performance acceptance remains part of physical-device client QA.

## Waiting for Final 2D Sticker Assets

- Deliver transparent portrait artwork for Lecturer's Office, After-Class Discussion, London Restaurant, Melbourne Cafe, Interview Room, and Career Fair.
- Keep the center clear for the 3D avatar, the top clear for subtitles, and the bottom clear for controls.
- Add the files to `assets/stickers/` and register them in `pubspec.yaml`.
- Create a sticker registry for all six backend `sticker_asset_key` values.
- Show the selected sticker on setting cards, the briefing screen, and the agreed AR overlay position.
- Verify contrast and layout on the target Android phone.

## Final Asset Acceptance

- Confirm visual style consistency across all characters and the future stickers.
- Test all six settings on the target phone.
- Obtain client approval for character appearance, sticker composition, avatar scale, and AR placement.
- Produce the final signed client acceptance build after the assets pass QA.
