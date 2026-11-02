# Repository Library design QA

## Visual truth and environment

- Selected reference: option 3, Repository Library, Library file `libfile_773a4b3c2a288191ab37a0cf9b7cd395`.
- Source visual truth path: `/workspace/scratch/58962b41eb64/output/design/repogpt-repository-library.png`.
- Source: 1487 × 1058 pixels. Desktop browser CSS viewport: 1487 × 1058, device scale factor 1. No density scaling or browser chrome in captures.
- Actual implementation: GitHub Actions Chromium running the production Next.js app against a disposable PostgreSQL/pgvector database. GitHub imports and model replies are synthetic fixtures, not live provider calls.
- Implementation screenshots: `docs/images/repositories.png`, `chat.png`, `settings.png`, their `-mobile` versions, `import-dialog.png`, `import-mobile.png`, `repositories-error.png`, and `repositories-empty.png`.
- Mobile CSS viewport: 390 × 844, scale factor 1. Full-page captures show natural vertical scroll, not a requirement to fit all content inside one screen. Dialog captures use the viewport only, matching the native modal backdrop.
- No separate mobile, chat, or settings reference was supplied: these are intentionally responsive/coordinated extensions of the selected repository visual system.

## Comparison evidence

The reference and actual repository capture were opened in the same comparison board, not judged from code alone:

- Full view: `/workspace/scratch/58962b41eb64/output/design/qa/comparison-v1.png` (reference left, implementation right).
- Native-density focused navigation/title/table crop: `/workspace/scratch/58962b41eb64/output/design/qa/focus-v1.png` (reference top, implementation bottom).
- All ten actual screenshot states were separately opened and inspected, including mobile, errors, empty state and import dialogs.
- Original verified capture run: [41499068078](https://github.com/mbarinov/repogpt/actions/runs/41499068078), head `8e6e1fa62d494ee263e31ce7e97503306de92b45`. ZIP SHA-256 `f34e111e4eb1b6983da6506acd5e7625b5cddb4928cba85619d975b9acf908ff`.
- Final checked capture provenance and file hashes are recorded in [docs/ui-verification.md](docs/ui-verification.md).

## Findings and fidelity surfaces

No actionable P0/P1/P2 visual differences were found in the first matched desktop comparison.

- **Fonts/typography:** native Arial/Helvetica sans-serif maintains the reference hierarchy: large title, bold repository names, readable secondary descriptions. Its title is slightly narrower than the generated reference font, whose exact family is unavailable. This is a non-blocking P3 difference, not clipped or reflowed content.
- **Spacing/layout:** horizontal navigation, generous heading gap, grouped table rows, pale-teal selection, vertical divider and right-hand detail panel match the concept. The details/row proportions remain coherent after removing unavailable branch data. Mobile stacks list then details with usable controls and no horizontal overflow.
- **Colors/tokens:** white/light-gray background, dark teal primary controls and links, neutral secondary text, semantic green/red/amber status colors. No decorative gradients, fabricated metrics or oversized generic cards were added to the library view.
- **Image/icon fidelity:** the target contains a text wordmark and standard UI icons, not photos or illustrations. Installed Radix GitHub and Lucide UI icons provide crisp vector assets without handcrafted icon substitutes or placeholder imagery.
- **Copy/content:** headings, CTA hierarchy and suggested questions follow the reference. Suggestions fill the editable chat composer without submitting. Error messages and recovery guidance come from real application states.

### Intentional data-driven differences

- The model does not persist indexed branch; the reference's `main` column and branch label are omitted, rather than fabricated or backed by an unrelated schema migration.
- The backend exposes status, not percentage progress. Indexing uses an indeterminate spinner, not the reference's speculative progress bar.
- The API does not classify every error as an access failure. The row says “Import failed”; selecting it displays the real error and settings/retry actions.
- The selected reference's decorative texture is not reproduced; flat tokens are appropriate for actual product UI.

## Interaction/accessibility review

Browser scenarios cover selection by keyboard, accurate ready/error/loading/not-indexed states, disabled chat, prompt seeding without submission, import cancellation/Escape/focus return, repeated submission prevention, failed import retry, delete cancellation/failure/success, retained old-index warning, blank-key preservation, streamed multi-turn chat, clear, mobile navigation and browser Back/Forward. Unexpected console errors and uncaught page errors fail the browser suite.

Visible focus indicators, labeled fields, native modal focus containment, semantic table headings, named navigation, disclosure controls, reduced-motion support and mobile no-overflow checks are present. This is not a claim of a full screen-reader or WCAG conformance audit.

## Comparison history

1. Initial actual screenshots from run 41499068078: matched desktop and mobile review found no P0/P1/P2 design regression.
2. P3 interaction polish: cancellation now restores focus to the actual Import/Retry/Refresh opener, rather than always the top Import button. A browser regression assertion covers Refresh focus return. Local deletion gained a visible text label.
3. Capture correction, not a UI defect: full-page screenshots of a native mobile dialog showed off-viewport content below its viewport-sized backdrop. Modal capture now uses the actual viewport; the pointer is moved away from rows before captures to avoid incidental hover differences.
4. Recapture run 41499916715 passed after the focus fix. Eight of ten images are byte-identical to the reviewed first capture. The corrected modal viewport and hover-free repository mobile images were reopened and visually verified. Capture hashes and the final-head CI verification procedure are listed in `docs/ui-verification.md`.

## Implementation checklist

- [x] Selected visual implemented in the real existing Next.js application.
- [x] Backend, dependencies and Node 24 modernization preserved.
- [x] Desktop/mobile UI and critical states inspected as browser-rendered images.
- [x] Working controls, recovery flows and meaningful tests.
- [x] No fake branch, percentage, metrics, or provider calls in tests.
- [x] README screenshots replaced with actual new UI captures.

## Follow-up polish

- Optional future refinement: a project-owned font could narrow the small typography difference from the generated reference. No dependency or external font loading was added for this cosmetic detail.
- Manual assistive-technology and browser matrix testing remain outside this Chromium-backed review.

## Source-citation update

The repository layout remains unchanged. Actual desktop/mobile chat captures from successful CI run [41518360622](https://github.com/mbarinov/repogpt/actions/runs/41518360622), head `156b16f2d615780e664b6be1e299a5ec0e5c2a9b`, were opened and inspected after adding server-issued source links. Citation links and their compact retrieved-source list remain readable and wrap without overflow; clear/switch isolation and unknown-link suppression are browser-tested. The eight non-chat screenshots are byte-identical to the earlier reviewed UI. Updated image hashes are in `docs/ui-verification.md`.

final result: passed
