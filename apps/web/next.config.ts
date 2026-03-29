import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@kamino-finance/klend-sdk",
    "@kamino-finance/kliquidity-sdk",
    "@kamino-finance/farms-sdk",
    "@kamino-finance/scope-sdk",
    "@orca-so/whirlpools-core",
    "@solana/kit",
  ],
  turbopack: {},
};

export default nextConfig;
