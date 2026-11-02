# Screenshot provenance

These are actual Chromium captures of the production app, not generated mockups.
They use synthetic repository records and deterministic mocked AI responses; no real provider credentials or paid calls are involved.

Initial captures: GitHub Actions [run 41492329313](https://github.com/mbarinov/repogpt/actions/runs/41492329313), source commit `024fcff5f19714f895a8ba15a81c292d118251dc`, artifact `verification-reports` (ID `13165765068`). Both screenshot scenarios passed; that run separately exposed a same-origin validation bug in settings/deletion, subsequently fixed.

To regenerate against a disposable migrated test database:

```sh
UPDATE_SCREENSHOTS=1 pnpm test:e2e
```

See [CONTRIBUTING](../../CONTRIBUTING.md) for database and browser setup. Review the PNGs before committing them. CI also uploads captures with its verification artifacts.
