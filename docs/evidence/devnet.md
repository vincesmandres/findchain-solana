# Devnet verification record

Observed on Solana Devnet on 2026-11-23. Each signature below was checked with `solana confirm <signature> --url devnet` and returned `Finalized`.

- Cluster: `https://api.devnet.solana.com`
- Program ID: `69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3`
- Program account: [Solana Explorer](https://explorer.solana.com/address/69WsUdhb9Xnqc8Wacit3TDEpoFekvh9qDLpgidv7Rmo3?cluster=devnet)
- ProgramData account: `GCSzaDk7xbS7uSi7QiZQWG79d99FCri6sTTjuajtWagx`
- Upgrade authority: `8T5KWCUyXT79dnuwXpuzDazh8DZgMom2xR8R4hauauXT` (confirmed by Solana CLI and decoded ProgramData RPC account; private key remains outside this repo)
- Program deployment transaction: [2fxdQL5DuTkZPphoPEURzwzVSxXp6ojxEjuKUXchTC37HfJAKk8Xq1AEvhbQ691jc6Y8zrmALxc1bb9oipqAJxDP](https://explorer.solana.com/tx/2fxdQL5DuTkZPphoPEURzwzVSxXp6ojxEjuKUXchTC37HfJAKk8Xq1AEvhbQ691jc6Y8zrmALxc1bb9oipqAJxDP?cluster=devnet)

`anchor deploy` returned a nonzero exit after uploading the program because its optional `program-metadata` follow-up could not locate the configured wallet file. The uploaded program was independently confirmed on Devnet with `solana program show`, and its deployment transaction was fetched from RPC and confirmed finalized. The generated IDL is included in the repository; on-chain IDL metadata publication was not verified.

The integration test ran against the deployed program with `anchor test --skip-local-validator --skip-build --skip-deploy --provider.cluster devnet`. It created a uniquely seeded item, read it, updated it, rejected an unauthorized update, rejected premature close, claimed it with a second signer, rejected a duplicate claim, marked it returned, closed it, and verified the account was absent. The test printed and checked these finalized signatures:

| Operation | Signature |
|---|---|
| Create item | [4Nxy5j5FTfSAHERNemeaXrGfezLEQmc7Q3VU67DCTEsrKYN8CvBPYFCWqWESuEpoXv3KbeYHcTauj9h6gWwBz1mD](https://explorer.solana.com/tx/4Nxy5j5FTfSAHERNemeaXrGfezLEQmc7Q3VU67DCTEsrKYN8CvBPYFCWqWESuEpoXv3KbeYHcTauj9h6gWwBz1mD?cluster=devnet) |
| Update item | [5W1Yotb2eoKHAWhf5yE7dizJyNtFLBkS7aGiGUL59gDm3oBBgJ5AmFgXpFuEQxPUHb6fL9bm1sgToyPdWWSXevo](https://explorer.solana.com/tx/5W1Yotb2eoKHAWhf5yE7dizJyNtFLBkS7aGiGUL59gDm3oBBgJ5AmFgXpFuEQxPUHb6fL9bm1sgToyPdWWSXevo?cluster=devnet) |
| Claim | [2hDfT1fUj9M9iVxt4Kx45Jo3bqfw4xBdizaxzBdjT8iCBS5TY56VcdevLikMVYPAGezEbM6gWwaXkYURJrj4uikt](https://explorer.solana.com/tx/2hDfT1fUj9M9iVxt4Kx45Jo3bqfw4xBdizaxzBdjT8iCBS5TY56VcdevLikMVYPAGezEbM6gWwaXkYURJrj4uikt?cluster=devnet) |
| Mark returned | [3DNJNACGxSmBYV4NND3z21vJFVfd5M1Jrky2jT6KnDo86sZaTS5DiGs2JMscByg2dZ8BkTGRe8SbRcFxosNjTE4o](https://explorer.solana.com/tx/3DNJNACGxSmBYV4NND3z21vJFVfd5M1Jrky2jT6KnDo86sZaTS5DiGs2JMscByg2dZ8BkTGRe8SbRcFxosNjTE4o?cluster=devnet) |
| Close item | [ZRiVgXafdL6ioTZ2saJ8DDdTxGY4YahBfLuNScSdS8EwoSeZP4jSRVXp39HTu6yQ2qvrzai6tYwgBNqBocjVwgs](https://explorer.solana.com/tx/ZRiVgXafdL6ioTZ2saJ8DDdTxGY4YahBfLuNScSdS8EwoSeZP4jSRVXp39HTu6yQ2qvrzai6tYwgBNqBocjVwgs?cluster=devnet) |

The lifecycle test PDA `HCMU7ZY6gFGXg95qPVq3Lo6a2GkLEQpmXsyk4yhBg4r8` was intentionally closed; a direct RPC query returned no account and zero lamports. It was a test record, not a real found object. On 2026-11-23, a second RPC check confirmed all six listed signatures were finalized with `err: null`; transaction logs identify `CreateItem`, `UpdateItem`, `ClaimItem`, `MarkReturned`, and `CloseItem`. No new Devnet transaction was sent during the final audit. Screenshots of the interactive browser flow remain pending; see [CAPTURES.md](CAPTURES.md).
