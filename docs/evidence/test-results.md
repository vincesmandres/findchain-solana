# Test and build results

Observed on 2026-11-23 in WSL Ubuntu.

- `cargo check -p findchain`: passed.
- `anchor build`: passed; generated `target/deploy/findchain.so`, `target/idl/findchain.json`, and TypeScript types. The generated program keypair public address matched the `declare_id!` value; private keypair is ignored by Git.
- `anchor test`: 2 passing on the local validator. Coverage includes create/PDA/read/update, rejection of unauthorized update, claim, duplicate claim rejection, premature close rejection, return, and close/account disappearance.
- Devnet integration command: `anchor test --skip-local-validator --skip-build --skip-deploy --provider.cluster devnet` — 2 passing. Five lifecycle transaction signatures and the finalized deployment transaction are listed in [devnet.md](devnet.md).
- `npm run lint` in `app/`: passed with no warnings after excluding generated `.next` output from lint traversal.
- `npm run build` in `app/`: passed after the generated IDL and lint configuration updates; Next.js production build completed, prerendered `/`, and reported route bundle sizes.

The frontend has been production-built, but a real interactive Phantom browser session has not yet been captured. See [CAPTURES.md](CAPTURES.md).
