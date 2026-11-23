import * as anchor from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("findchain item lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Findchain as anchor.Program;
  const authority = (provider.wallet as anchor.Wallet & { payer: Keypair }).payer;
  const itemId = new anchor.BN(Date.now());
  const [item] = PublicKey.findProgramAddressSync([
    Buffer.from("item"), authority.publicKey.toBuffer(), itemId.toArrayLike(Buffer, "le", 8),
  ], program.programId);

  it("creates a PDA, reads its fields and updates as authority", async () => {
    const createSig = await program.methods.createItem(itemId, "Llaves", "Llaves encontradas cerca del parque", "Parque central").accounts({ authority: authority.publicKey, item, systemProgram: SystemProgram.programId }).rpc();
    console.log(`ITEM_CREATE_SIGNATURE=${createSig}`);
    const row = await program.account.item.fetch(item) as any;
    assert.equal(row.title, "Llaves"); assert.equal(row.status.found !== undefined, true); assert.equal(row.authority.toBase58(), authority.publicKey.toBase58());
    const updateSig = await program.methods.updateItem(itemId, "Llaves azules", "Llaves encontradas junto a la entrada", "Parque central").accounts({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_UPDATE_SIGNATURE=${updateSig}`);
    assert.equal((await program.account.item.fetch(item) as any).title, "Llaves azules");
  });

  it("rejects unauthorized update, claims, duplicate claim and premature close; completes lifecycle", async () => {
    const other = Keypair.generate();
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(SystemProgram.transfer({
      fromPubkey: authority.publicKey, toPubkey: other.publicKey, lamports: 100_000_000,
    })), [authority]);
    let unauthorized = false;
    try { await program.methods.updateItem(itemId, "Robo", "No autorizado", "Parque").accounts({ authority: other.publicKey, item }).signers([other]).rpc(); } catch { unauthorized = true; }
    expect(unauthorized).to.equal(true);
    let earlyClose = false;
    try { await program.methods.closeItem(itemId).accounts({ authority: authority.publicKey, item }).rpc(); } catch { earlyClose = true; }
    expect(earlyClose).to.equal(true);
    const claimSig = await program.methods.claimItem(itemId).accounts({ claimant: other.publicKey, item }).signers([other]).rpc();
    console.log(`ITEM_CLAIM_SIGNATURE=${claimSig}`);
    let duplicate = false;
    try { await program.methods.claimItem(itemId).accounts({ claimant: other.publicKey, item }).signers([other]).rpc(); } catch { duplicate = true; }
    expect(duplicate).to.equal(true);
    assert.equal((await program.account.item.fetch(item) as any).status.claimed !== undefined, true);
    const returnedSig = await program.methods.markReturned(itemId).accounts({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_RETURN_SIGNATURE=${returnedSig}`);
    assert.equal((await program.account.item.fetch(item) as any).status.returned !== undefined, true);
    const closeSig = await program.methods.closeItem(itemId).accounts({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_CLOSE_SIGNATURE=${closeSig}`);
    let gone = false; try { await program.account.item.fetch(item); } catch { gone = true; }
    expect(gone).to.equal(true);
  });
});
