import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { PacketMcpConfig } from "../config/types.js";
import { readPacketResource } from "./read.js";
import { PacketResourceWatcher } from "./watcher.js";

export const RegisterPacketResources = (server: McpServer, config: PacketMcpConfig) => {
    const watcher = new PacketResourceWatcher(server, config);

    watcher.on("error", (err) => {
        console.error("[packet-mcp:resources]", err instanceof Error ? err.message : String(err));
    });

    server.registerResource(
        "packet-activity",
        "packet://activity",
        {
            title: "Packet Activity",
            description: "Current/historical activity threads for the configured wallet",
            mimeType: "application/json",
        },
        (uri) => readPacketResource(config, uri),
    );

    server.registerResource(
        "packet-thread",
        new ResourceTemplate("packet://thread/{thread}", { list: undefined }),
        {
            title: "Packet Thread",
            description: "Current/historical messages for a Packet thread",
            mimeType: "application/json",
        },
        (uri) => readPacketResource(config, uri),
    );

    server.registerResource(
        "packet-inbox",
        new ResourceTemplate("packet://inbox/{inbox}", { list: undefined }),
        {
            title: "Packet Inbox",
            description: "Current/historical threads in a Packet inbox owned by the configured wallet",
            mimeType: "application/json",
        },
        (uri) => readPacketResource(config, uri),
    );

    server.registerResource(
        "packet-owned-inbox",
        new ResourceTemplate("packet://inbox/{owner}/{inbox}", { list: undefined }),
        {
            title: "Packet Inbox By Owner",
            description: "Current/historical threads in a Packet inbox for a specific owner",
            mimeType: "application/json",
        },
        (uri) => readPacketResource(config, uri),
    );

    server.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
        await watcher.subscribe(request.params.uri);
        return {};
    });

    server.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
        await watcher.unsubscribe(request.params.uri);
        return {};
    });

    return watcher;
};
