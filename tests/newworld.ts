import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Newworld } from "../target/types/newworld";

describe("newworld", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Newworld as Program<Newworld>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
    console.log("success");
  });
});
