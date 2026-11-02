# UI capture verification

These are actual Chromium screenshots of the production Next.js app, not generated mockups.

- Capture commit: `ca63f40c0ca03252901cda9d8f4f94eb633c5670`.
- CI run: [41499916715](https://github.com/mbarinov/repogpt/actions/runs/41499916715), all stages passed.
- Artifact: `verification-reports`, ID `13167558368`.
- Downloaded ZIP SHA-256: `8148cea35e33569d18a8648e74bbed9b0a7dc28376ff01251d2d620a070292ec`, checked against GitHub's artifact digest before safe extraction.
- Browser: Playwright Chromium; desktop CSS viewport 1487 × 1058, mobile 390 × 844; deviceScaleFactor 1. Full-page screenshots preserve scrolling content; modal screenshots capture the viewport.
- Fixtures: synthetic `example/*` repositories, synthetic configured credentials, mocked streamed model replies. No real GitHub/OpenAI requests or paid API keys.
- Runtime errors and unexpected browser console errors fail the browser suite.

## Checks

CI at the capture commit passed dependency installation, Prisma generation and migrations, ESLint, TypeScript, 79 unit/integration tests (including disposable PostgreSQL/pgvector), production build and eight Playwright browser scenarios. The documentation/assets commit reruns the same suite and adds a tablet-width no-overflow assertion; consult the PR's current-head CI for that result.

The interaction checks cover settings secret non-disclosure and blank-key preservation; import completion, repeated submission, retry and cancel; deletion cancellation/error/success; streaming conversation history and clear; repository states, selection and disabled chat; prompt seeding without submission; mobile navigation and history; failed-refresh warnings with previous-index access; and focus restoration to the actual opener.

## Committed image hashes

| File                      | Pixels      | SHA-256                                                            |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| `chat-mobile.png`         | 390 × 1397  | `ac464646050a6d59d301ad4f6964978992b171ff11e5ffc94d7aac4c197f7f50` |
| `chat.png`                | 1487 × 1221 | `bd507794350b3a9efb06a28b8e3b7524d5f27a05932d071652f06279f6fa186b` |
| `import-dialog.png`       | 1487 × 1058 | `429d2d96af0df36a54be2a53cfcd1e7510c39b071659b023eb4b9c1aab3777d7` |
| `import-mobile.png`       | 390 × 844   | `198d7aa7cf9cea6252938aaea55f71e5054c8bf39e3458cfdd2b31f85008b02d` |
| `repositories-empty.png`  | 1487 × 1058 | `c7908b1e7410bb1931899dc2af778784c337480d55708dad7365992fed1f099f` |
| `repositories-error.png`  | 1487 × 1070 | `007d5726fbcf05b1b7656b015e9c7d22381b3f17c8e24f8e806bd4b06a51029e` |
| `repositories-mobile.png` | 390 × 1196  | `78fb8c58a681259ad81be450fcad8cd2949722d2d332e105dd47be844f4fe7b7` |
| `repositories.png`        | 1487 × 1058 | `8a030eb8a8c2bfaf0e261d81d5192a00bccb7e7366577b9f7ed3ad7211a872d4` |
| `settings-mobile.png`     | 390 × 1329  | `415488855fc6f72cabfd9553ee69bd81ee2744504770653b67f42d50e8934956` |
| `settings.png`            | 1487 × 1058 | `64ebe39ec82639591dd96a2825a16dccd7bb73a406c0e19238eefe1c13135133` |

Visual comparison and accepted data-driven differences: [design-qa.md](../design-qa.md).

To refresh captures, run `UPDATE_SCREENSHOTS=1 pnpm test:e2e` against a disposable migrated database. GitHub Actions uploads `docs/images/` with the verification reports. Never substitute generated concepts for actual app screenshots.
