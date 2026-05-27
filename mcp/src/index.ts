import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GetUserConfig } from "./config/get";
import { CreatePacketServer } from "./server";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

(async () => {
    const config = await GetUserConfig()
    const server = await CreatePacketServer(config);
    const transport = new StdioServerTransport();

    console.error(`[packet-mcp] starting — wallet=${config.wallet.publicKey.toString().slice(0, 8)}…  rpc=${config.config.rpc} cluster=${config.config.cluster || "mainnet"}`);

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
