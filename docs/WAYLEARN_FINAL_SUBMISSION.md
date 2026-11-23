# WayLearn Advanced — FindChain submission

## Project information

- Project: FindChain
- Route: **Proyecto propio**
- Repository: <https://github.com/vincesmandres/findchain-solana>
- Production app: <https://findchain-web.vercel.app>
- Program ID (Devnet): `69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3`
- Explorer: <https://explorer.solana.com/address/69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3?cluster=devnet>
- Deployment transaction: <https://explorer.solana.com/tx/2fxdQL5DuTkZPphoPEURzwzVSxXp6ojxEjuKUXchTC37HfJAKk8Xq1AEvhbQ691jc6Y8zrmALxc1bb9oipqAJxDP?cluster=devnet>
- Lifecycle transactions: see [Devnet evidence](evidence/devnet.md).

## Description

FindChain lets a finder create a public lost-and-found item record, another wallet claim it, and the finder confirm return. Each record is a PDA derived from `item`, the authority, and a little-endian `u64` item id. Rust validates authority and state transitions and permits rent-refunding account closure only after `RETURNED`. The contribution is the tested lost-item lifecycle and its authorization and closure rules, built on the Anchor scaffold.

## WayLearn requirements matrix

The official criteria for the own-project route are documented at [WayLearn: Proyecto final y certificado](https://waylearn.gitbook.io/solana-engineering-track-advanced/proyecto-final-y-certificado). Status refers to the evidence available on 2026-11-23.

| Criterion | Implementation | Test / evidence | Status |
|---|---|---|---|
| Functional Solana program | `programs/findchain/src/lib.rs` | `anchor build`; executable account confirmed by RPC | PASS |
| Related account and PDA | `Item`; `create_item` seeds `item + authority + item_id` | Create transaction and account key in [devnet.md](evidence/devnet.md) | PASS |
| IDL-aligned client | `app/public/findchain.json`; `app/app/page.tsx` | Generated and bundled IDLs parsed and compared equal; TS check/build pass | PASS |
| Frontend with wallet | `app/app/page.tsx` Phantom Wallet Adapter | Build pass; real Phantom connection/signing not captured | NOT VERIFIED |
| Create, read and update accounts | `create_item`, account scan, `update_item` | Finalized Devnet create/update signatures and instruction logs | PASS |
| Authority and permission rules | Signer, PDA seeds and `has_one` constraints | Rust source/build; current unauthorized local test could not run | NOT VERIFIED |
| Claim and state transitions | `claim_item`, `mark_returned` | Finalized Devnet claim/return signatures and instruction logs | PASS |
| Conditional close rule in Rust | `close_item` close constraint requires `RETURNED` | Finalized Devnet close signature; rejected close test not freshly executed | NOT VERIFIED |
| Signature, confirmation and errors | Anchor `.rpc()` client calls and UI notices | Production build; no interactive Phantom rejection flow captured | NOT VERIFIED |
| Devnet deployment | Program ID and ProgramData in [devnet.md](evidence/devnet.md) | RPC executable/loader/authority check; deployment signature finalized | PASS |
| Reproducible repository and README | Root README and lockfiles | GitHub repository is public; clean installs and frontend checks pass | PASS |
| Reproducible screenshots | `docs/evidence/` | Manual capture steps in [CAPTURES.md](evidence/CAPTURES.md); no screenshots captured | NOT VERIFIED |

## Evaluator instructions

1. Install Node.js, npm, Rust, Solana CLI and Anchor CLI. On Windows, use WSL2 for Rust/Solana tools.
2. Clone this repository and run `npm ci`, then `npm --prefix app ci`.
3. Run `anchor build` and `anchor test` in an environment where Anchor's provider variables reach the configured Node runtime. The current Windows/WSL arrangement needs a Linux Node runtime for the test subprocess; see [test-results.md](evidence/test-results.md).
4. Run `npm --prefix app run dev`, open `http://localhost:3000`, and connect Phantom set to Devnet.
5. Use two Devnet wallets with SOL to reproduce create → claim → return → close. Each action signs a real transaction; inspect the signature link and PDA in Explorer.

## Verified evidence and pending items

The deployment and five lifecycle signatures in [evidence/devnet.md](evidence/devnet.md) were queried from Devnet RPC on 2026-11-23. All were finalized with `err: null`; transaction logs identify create, update, claim, return and close. The tested PDA was closed. No new Devnet transaction was sent during this audit.

Pending: rerun Anchor tests with Node available inside WSL (or another compatible Linux runtime), interactively verify Phantom signing/rejection, and capture genuine UI screenshots. Certificate name and WayLearn registration email must be entered by the project owner. The official WayLearn submission form was not submitted.
