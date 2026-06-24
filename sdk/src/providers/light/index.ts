import type * as anchor from "@anchor-lang/core";
import { createRpc, type Rpc } from "@lightprotocol/stateless.js";
import type { PacketClientConfig } from "../../types/client.js";

export * from "./proof/index.js";

type LightConnection = anchor.web3.Connection | string;

function getRpcEndpoint(connection: LightConnection): string {
  return typeof connection === "string" ? connection : connection.rpcEndpoint;
}

function getCommitment(connection: LightConnection): anchor.web3.Commitment {
  return typeof connection === "string"
    ? "confirmed"
    : connection.commitment ?? "confirmed";
}

export function makeLightRpc(
  connection: LightConnection,
  config?: PacketClientConfig["photonRpc"],
): Rpc {
  const rpcConnection = config?.connection ?? connection;

  const rpcEndpoint = getRpcEndpoint(rpcConnection);
  const commitment = getCommitment(rpcConnection);

  const compressionApiEndpoint =
    config?.compressionApiEndpoint ?? rpcEndpoint;

  const proverEndpoint =
    config?.proverEndpoint ?? rpcEndpoint;

  return createRpc(
    rpcConnection,
    compressionApiEndpoint,
    proverEndpoint,
    {
      commitment,
    },
  );
}