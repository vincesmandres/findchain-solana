# FindChain frontend evidence

## Captured

- [x] **Frontend home/dashboard:** [frontend-home.png](frontend-home.png). Real browser screenshot captured on 2026-11-23. The application shell loaded and Phantom displayed the connected wallet `GUAF...K368`; the public report counter showed zero records at capture time.
- [x] **Diagnostic state preserved:** the screenshot visibly records a rejected transaction with the message `This account may not be used to pay transaction fees`. This is evidence of the current UI state and a debugging lead, not evidence of a successful transaction.

## Still to capture

1. Report form before signing and Phantom approval prompt (hide unrelated wallet details).
2. Public item listing after a successful, confirmed creation, with its Explorer account link.
3. Claim transaction and resulting `CLAIMED` state.
4. Finder's return confirmation and `RETURNED` state.
5. Closed PDA no longer returned by the app/RPC, plus the close transaction in Explorer.
6. Terminal output for the actual local test command and Devnet signatures.

Capture these directly from a real local or deployed app session connected to Devnet. Do not edit screenshots to imply success, and do not include wallet recovery phrases, private keys, or personal data. A connected-wallet indicator alone does not prove that an on-chain instruction succeeded.
