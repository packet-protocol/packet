import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configureDefaultBgwParams } from "xpkt-sdk";
import { GetUserConfig } from "./config/get";
import { CreatePacketServer } from "./server";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

(async () => {
    const config = await GetUserConfig()

    // Room tools resolve BGW params from a process-wide default when no explicit
    // BgwParamsClient is passed. Wire the configured params artifact directory once
    // at startup; resolution stays lazy until the first room operation.
    if (config.config.bgwParamsDir) {
        configureDefaultBgwParams({ dir: config.config.bgwParamsDir });
    }

    const server = await CreatePacketServer(config);
    const transport = new StdioServerTransport();

    console.error(`[packet-mcp] starting — wallet=${config.wallet.publicKey.toString().slice(0, 8)}…  rpc=${config.config.rpc} cluster=${config.config.cluster || "mainnet"}${config.config.bgwParamsDir ? `  bgwParams=${config.config.bgwParamsDir}` : ""}`);

    await server.connect(transport);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.error(`[packet-mcp] received ${signal}, shutting down`);
        await server.close();
        process.exit(0);
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
})().catch((err) => {
    console.error("[packet-mcp] fatal:", err);
    process.exit(1);
});
