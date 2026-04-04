import { NextResponse } from "next/server";

import { getAgentPublicKey } from "@/lib/solana/borro-program";

const DEFAULT_PROGRAM_ID = "7XZ4WDsPMAiJwVGpt52QVk69mQ5HqjcMcobwEyh4s9gv";
const DEFAULT_BUFFER_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export async function GET() {
  try {
    const programId =
      process.env.NEXT_PUBLIC_BORRO_PROGRAM_ID ??
      process.env.BORRO_PROGRAM_ID ??
      DEFAULT_PROGRAM_ID;
    const bufferMint =
      process.env.NEXT_PUBLIC_BUFFER_MINT ??
      process.env.BORRO_BUFFER_MINT ??
      DEFAULT_BUFFER_MINT;
    const agentAuthority = getAgentPublicKey();

    return NextResponse.json({
      programId,
      bufferMint,
      agentAuthority,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Borro config";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
