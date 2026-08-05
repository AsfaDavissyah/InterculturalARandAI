# Phase 5 Asset-Pending Work

**Status:** Technical mobile flow uses prototype avatars. Final visual completion is waiting for client-approved assets.

## Completed Without Final Assets

- Three guided topics and six setting records are loaded from the backend.
- Legacy scenarios remain available in a separate section.
- Topic and legacy requests fail independently and retain the usable experience.
- Guided settings open the shared briefing and AR runtime.
- Guided AR opening no longer calls the legacy scenario endpoint.
- Prototype avatar registry maps every current `avatar_key` to an existing GLB.
- Guided session metadata is sent to chat and stored in practice history.
- Fallback topic content matches the approved backend seed.

## Waiting for Final Character Assets

- Obtain client approval and a distribution-compatible license for the final characters.
- Deliver final GLB files for Dr Emma Collins, Sarah Bennett, Olivia Reed, and Michael Harris.
- Keep embedded textures and the exact animation names `Idle` and `Talking`.
- Optimize each GLB for Android performance and package size.
- Replace prototype paths in `AvatarRegistry` without changing setting data.
- Verify scale, origin, framing, animation transitions, and device performance for every character.

## Waiting for Final 2D Sticker Assets

- Deliver transparent portrait artwork for Lecturer's Office, After-Class Discussion, London Restaurant, Melbourne Cafe, Interview Room, and Career Fair.
- Keep the center clear for the 3D avatar, the top clear for subtitles, and the bottom clear for controls.
- Add the files to `assets/stickers/` and register them in `pubspec.yaml`.
- Create a sticker registry for all six backend `sticker_asset_key` values.
- Show the selected sticker on setting cards, the briefing screen, and the agreed AR overlay position.
- Verify contrast and layout on the target Android phone.

## Final Asset Acceptance

- Confirm visual style consistency across all characters and stickers.
- Test all six settings on the target phone.
- Obtain client approval for character appearance, sticker composition, avatar scale, and AR placement.
- Produce the final signed client acceptance build after the assets pass QA.
