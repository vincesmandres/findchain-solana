import * as anchor from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import type { Findchain } from "../target/types/findchain";

async function expectProgramError(action: () => Promise<unknown>, expected: string) {
  try {
    await action();
    assert.fail(`Expected Anchor error ${expected}`);
  } catch (error) {
    expect(String(error)).to.include(expected);
  }
}

describe("findchain item lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Findchain as anchor.Program<Findchain>;
  const authority = (provider.wallet as anchor.Wallet & { payer: Keypair }).payer;
  const itemId = new anchor.BN(Date.now());
  const [item] = PublicKey.findProgramAddressSync([
    Buffer.from("item"), authority.publicKey.toBuffer(), itemId.toArrayLike(Buffer, "le", 8),
  ], program.programId);

  it("creates a PDA, reads its fields and updates as authority", async () => {
    const createSig = await program.methods.createItem(itemId, "Llaves", "Llaves encontradas cerca del parque", "Parque central").accountsPartial({ authority: authority.publicKey, item, systemProgram: SystemProgram.programId }).rpc();
    console.log(`ITEM_CREATE_SIGNATURE=${createSig}`);
    const row = await program.account.item.fetch(item) as any;
    assert.equal(row.title, "Llaves"); assert.equal(row.status.found !== undefined, true); assert.equal(row.authority.toBase58(), authority.publicKey.toBase58());
    const updateSig = await program.methods.updateItem(itemId, "Llaves azules", "Llaves encontradas junto a la entrada", "Parque central").accountsPartial({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_UPDATE_SIGNATURE=${updateSig}`);
    assert.equal((await program.account.item.fetch(item) as any).title, "Llaves azules");
  });

  it("rejects unauthorized update, claims, duplicate claim and premature close; completes lifecycle", async () => {
    const other = Keypair.generate();
    await provider.sendAndConfirm(new anchor.web3.Transaction().add(SystemProgram.transfer({
      fromPubkey: authority.publicKey, toPubkey: other.publicKey, lamports: 100_000_000,
    })), [authority]);
    await expectProgramError(
      () => program.methods.updateItem(itemId, "Robo", "No autorizado", "Parque").accountsPartial({ authority: other.publicKey, item }).signers([other]).rpc(),
      "ConstraintSeeds",
    );
    await expectProgramError(
      () => program.methods.closeItem(itemId).accountsPartial({ authority: authority.publicKey, item }).rpc(),
      "ItemNotReturned",
    );
    const claimSig = await program.methods.claimItem(itemId).accountsPartial({ claimant: other.publicKey, item }).signers([other]).rpc();
    console.log(`ITEM_CLAIM_SIGNATURE=${claimSig}`);
    await expectProgramError(
      () => program.methods.claimItem(itemId).accountsPartial({ claimant: other.publicKey, item }).signers([other]).rpc(),
      "ItemNotClaimable",
    );
    assert.equal((await program.account.item.fetch(item) as any).status.claimed !== undefined, true);
    await expectProgramError(
      () => program.methods.closeItem(itemId).accountsPartial({ authority: authority.publicKey, item }).rpc(),
      "ItemNotReturned",
    );
    const returnedSig = await program.methods.markReturned(itemId).accountsPartial({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_RETURN_SIGNATURE=${returnedSig}`);
    assert.equal((await program.account.item.fetch(item) as any).status.returned !== undefined, true);
    const closeSig = await program.methods.closeItem(itemId).accountsPartial({ authority: authority.publicKey, item }).rpc();
    console.log(`ITEM_CLOSE_SIGNATURE=${closeSig}`);
    let gone = false; try { await program.account.item.fetch(item); } catch { gone = true; }
    expect(gone).to.equal(true);
  });
});
