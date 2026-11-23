# Test and build results

Audit run: 2026-11-23. Keep previous successful runs below separate from this Windows/WSL audit; a historical result is not a claim that the current invocation passed.

## Current audit

- Environment: Windows Node.js 24.15.0 / npm 12.2.1; WSL Ubuntu Rust 1.89.0 / Cargo 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2. `anchor build`: PASS; SBF release and host test profiles compiled.
- `npm ci --no-audit --no-fund` in the root and `app/`: PASS after repairing both lockfiles. The original lockfiles failed clean installation because optional `bufferutil`, `utf-8-validate`, and `node-gyp-build` entries were missing.
- `npm run lint` in `app/`: PASS.
- `npx tsc --noEmit` in `app/`: PASS.
- `npm run build` in `app/`: PASS; Next.js 15.5.29 prerendered `/`.
- `anchor test`: NOT VERIFIED in this checkout. Anchor started its Rust build but its test subprocess uses the Windows Node installation through WSL interop; `ANCHOR_PROVIDER_URL` was absent in that Windows process and Mocha exited before any test ran. A direct `npm test` has the same expected environment error. No current localnet test pass is claimed.
- `npm audit --omit=dev --audit-level=high`: exit 0; 15 moderate upstream advisories remain in the Solana web3.js 1.x / `jayson` / `stream-json` / `uuid` dependency chain. The audit reported no available fix. No high severity issue was reported.
- IDL: generated `target/idl/findchain.json` and frontend `app/public/findchain.json` compare byte-for-byte as parsed JSON; address and five instruction names match.
- Devnet: executable program, ProgramData and upgrade authority, and lifecycle transaction instruction logs/statuses verified independently with RPC; see [devnet.md](devnet.md).
- Interactive Phantom E2E and screenshots: NOT VERIFIED; browser-control host was unavailable and no personal wallet keys were used. See [CAPTURES.md](CAPTURES.md).

## Previously recorded run

The earlier 2026-11-23 WSL run recorded `cargo check -p findchain`, `anchor build`, two passing local Anchor tests, two passing Devnet integration tests, frontend lint/build, and the lifecycle signatures in [devnet.md](devnet.md). The current audit could not reproduce the Anchor test suite because of the environment boundary above; treat the earlier results as historical evidence, not a fresh rerun.
