# Evidence capture status

Audit date: 2026-11-23.

## Captured

- [x] [Frontend dashboard](frontend-home.png): genuine browser capture from 2026-11-23. It shows the wallet adapter displaying a connected, abbreviated public address and one report in the dashboard. The image does not show a transaction result; it is not proof that an instruction succeeded.
- [x] Devnet deployment and lifecycle transaction status: independently checked by RPC; see [devnet.md](devnet.md).

## Still to capture manually

1. Report form and Phantom transaction approval prompt. Keep unrelated wallet details out of view.
2. Public listing following a newly confirmed create transaction.
3. Claim from a second wallet and the resulting `CLAIMED` UI state.
4. Finder's return confirmation and the `RETURNED` UI state.
5. Closed PDA absent from RPC and the close signature in Explorer.
6. Terminal output from a successful fresh localnet Anchor test run.

Run `npm --prefix app run dev`, open `http://localhost:3000`, and connect Phantom configured for Devnet. Use only test item text and general locations. Do not share a recovery phrase, secret key, personal contact information, or unrelated wallet details. Save screenshots unaltered in this folder. A connected wallet display is not evidence that an on-chain instruction succeeded.

The browser-control host was unavailable during this audit, and the current Anchor test command exits before tests run because WSL launches Windows Node without `ANCHOR_PROVIDER_URL`; details are in [test-results.md](test-results.md). No Phantom transaction was initiated during this audit.
