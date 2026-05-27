import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Tools } from "./tools/index.js";
import type { PacketMcpConfig } from "./config/types.js";
import type { Tool } from "./tools/types.js";
import { RegisterPacketResources } from "./resources/index.js";
import { PACKET_MCP_DESCRIPTION, PACKET_MCP_INSTRUCTIONS } from "./instructions.js";

export const CreatePacketServer = async (config: PacketMcpConfig) => {
    const server = new McpServer({
        name: "Packet MCP Server",
        title: "Packet",
        version: process.env._PACKET_MCP_VERSION || "0.0.0",
        description: PACKET_MCP_DESCRIPTION,
        websiteUrl: "https://packet.chat",
    }, {
        instructions: PACKET_MCP_INSTRUCTIONS,
        capabilities: {
            tools: {},
            resources: {
                subscribe: true,
                listChanged: true,
            },
        },
    });

    for (const tool of Tools(config) as readonly Tool[]) {
        server.registerTool(tool.name, tool.config, tool.cb);
    }

    const watcher = RegisterPacketResources(server, config);
    const close = server.close.bind(server);
    server.close = async () => {
        await watcher.stop();
        await close();
    };

    return server;
};
