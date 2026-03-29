import { clusterApiUrl, Connection } from "@solana/web3.js";

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

export const connection = new Connection(endpoint, "confirmed");
