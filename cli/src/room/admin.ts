import type { Command } from "commander";
import {
  RoomAdminClient,
  RoomClient,
  getActiveMemberAccountsForRoom,
} from "xpkt-sdk";
import { parsePublicKey } from "../input/index.js";
import { printJson, shortKey } from "../message/format.js";
import {
  setupRoom,
  parseRoomRef,
  roomRefToAddress,
  roomRefId,
  hexToBytes,
  bytesToHex,
  keypairSignMessage,
} from "./common.js";

export const registerRoomAdminCommands = (parent: Command) => {
  // -- room create --------------------------------------------------------
  parent
    .command("create")
    .description(
      "Create a room. Derives the admin seed by signing with the loaded keypair, uses the configured default BGW params."
    )
    .option("--room-id <hex>", "Explicit 32-byte room id (64 hex chars); random when omitted")
    .option("--json", "Print JSON output", false)
    .action(async (options) => {
      const { keypair, client } = setupRoom();

      const roomId = options.roomId
        ? hexToBytes((options.roomId as string).replace(/^0x/, ""))
        : undefined;
      if (roomId && roomId.length !== 32) {
        throw new Error("--room-id must be 32 bytes (64 hex chars)");
      }

      const res = await RoomAdminClient.Create({
        client,
        params: {
          roomId,
          signMessage: keypairSignMessage(keypair),
        },
      });

      const admin = res.client;
      const paramsId = bytesToHex(await admin.bgwParams.getParamsId());
      const paramsRoot = bytesToHex(await admin.bgwParams.getParamsRoot());

      if (options.json) {
        return printJson({
          roomAddress: admin.address.toBase58(),
          roomId: bytesToHex(admin.roomId),
          paramsId,
          paramsRoot,
          signatures: res.receipt,
        });
      }

      console.log("[OK] room created");
      console.log("room:", admin.address.toBase58());
      console.log("roomId:", bytesToHex(admin.roomId));
      console.log("paramsId:", paramsId);
      console.log("paramsRoot:", paramsRoot);
      console.log("tx:", res.receipt.join(", "));
    });

  // -- room add -----------------------------------------------------------
  parent
    .command("add")
    .description("Add (or re-activate) a member and publish the covering header")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .argument("<memberPubkey>", "Member Solana public key")
    .option(
      "--skip-key-check",
      "Skip the registered-key lookup and always encrypt to the member's wallet-derived key (raw-keypair identities only)",
      false
    )
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, memberArg, options) => {
      const { keypair, client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const admin = await RoomAdminClient.Load({
        client,
        roomId: ref.roomId,
        address: ref.address,
        signMessage: keypairSignMessage(keypair),
      });

      const member = parsePublicKey(memberArg, "<memberPubkey>");
      const res = await admin.addMember({
        member,
        skipKeyCheck: Boolean(options.skipKeyCheck),
      });

      if (options.json) {
        return printJson({
          member: member.toBase58(),
          slot: res.slot,
          memberKey: res.memberKey,
          epoch: res.header.epoch.toString(),
          headerKind: res.header.kind,
          chainBreak: res.header.chainBreak,
          signatures: res.signatures,
        });
      }

      console.log("[OK] member added");
      console.log("member:", member.toBase58());
      console.log("slot:", res.slot);
      console.log("memberKey:", res.memberKey);
      console.log("epoch:", res.header.epoch.toString());
      console.log("header:", res.header.kind, res.header.chainBreak ? "(chain break)" : "");
      console.log("tx:", res.signatures.join(", "));
      if (res.memberKey === "wallet-derived") {
        console.log(
          "note: encrypted to the member's wallet-derived key — browser-wallet members cannot decrypt it; they must register a packet key."
        );
      }
    });

  // -- room remove --------------------------------------------------------
  parent
    .command("remove")
    .description("Remove a member and publish the covering header")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .argument("<memberPubkey>", "Member Solana public key")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, memberArg, options) => {
      const { keypair, client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const admin = await RoomAdminClient.Load({
        client,
        roomId: ref.roomId,
        address: ref.address,
        signMessage: keypairSignMessage(keypair),
      });

      const member = parsePublicKey(memberArg, "<memberPubkey>");
      const res = await admin.removeMember({ member });

      if (options.json) {
        return printJson({
          member: member.toBase58(),
          slot: res.slot,
          epoch: res.header.epoch.toString(),
          headerKind: res.header.kind,
          signatures: res.signatures,
        });
      }

      console.log("[OK] member removed");
      console.log("member:", member.toBase58());
      console.log("slot:", res.slot);
      console.log("epoch:", res.header.epoch.toString());
      console.log("header:", res.header.kind);
      console.log("tx:", res.signatures.join(", "));
    });

  // -- room members -------------------------------------------------------
  parent
    .command("members")
    .description("List active members + slots for a room")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, options) => {
      const { client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const address = roomRefToAddress(ref, client);

      const accounts = await getActiveMemberAccountsForRoom({ client, room: address });
      const rows = accounts
        .map((m: any) => ({
          owner: m.owner.toBase58(),
          slot: m.slot,
          status: m.status === 0 ? "active" : "removed",
          joinedMemberVersion: m.joinedMemberVersion.toString(),
        }))
        .sort((a, b) => a.slot - b.slot);

      if (options.json) return printJson({ room: address.toBase58(), members: rows });

      console.log(`room ${address.toBase58()} active members=${rows.length}`);
      for (const row of rows) {
        console.log(`  slot ${row.slot} ${row.status} ${shortKey(row.owner)} (joinedMemberVersion=${row.joinedMemberVersion})`);
      }
    });

  // -- room info ----------------------------------------------------------
  parent
    .command("info")
    .description("Show room state (epoch, members, params, recipient mode/depth)")
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, options) => {
      const { client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const roomClient = await RoomClient.Load({ client, id: roomRefId(ref) });
      const room = roomClient.Room;

      const info = {
        room: room.address.toBase58(),
        roomId: bytesToHex(room.roomId),
        admin: room.admin.toBase58(),
        currentEpoch: room.currentEpoch.toString(),
        memberVersion: room.memberVersion.toString(),
        latestHeaderMemberVersion: room.latestHeaderMemberVersion.toString(),
        nextSlot: room.nextSlot,
        messages: room.globalLen.toString(),
        currentBucket: room.currentBucket,
        chainStartEpoch: room.chainStartEpoch.toString(),
        recipientMode: room.recipientMode,
        recipientEncoding: room.recipientEncoding,
        recipientDeltaDepth: room.recipientDeltaDepth,
        recipientExplicitCount: room.recipientExplicitCount,
        recipientAssignedUntilSlot: room.recipientAssignedUntilSlot,
        recipientCheckpointEpoch: room.recipientCheckpointEpoch.toString(),
        publicationOpen: Boolean(room.publicationOpen),
        paramsId: bytesToHex(room.paramsId),
        paramsRoot: bytesToHex(room.paramsRoot),
      };

      if (options.json) return printJson(info);

      console.log(`room ${info.room}`);
      console.log(`roomId=${info.roomId}`);
      console.log(`admin=${info.admin}`);
      console.log(
        `epoch=${info.currentEpoch} memberVersion=${info.memberVersion} (header=${info.latestHeaderMemberVersion}) nextSlot=${info.nextSlot}`
      );
      console.log(`messages=${info.messages} currentBucket=${info.currentBucket} chainStartEpoch=${info.chainStartEpoch}`);
      console.log(
        `recipient: mode=${info.recipientMode} encoding=${info.recipientEncoding} deltaDepth=${info.recipientDeltaDepth} explicitCount=${info.recipientExplicitCount} assignedUntilSlot=${info.recipientAssignedUntilSlot}`
      );
      console.log(`publicationOpen=${info.publicationOpen}`);
      console.log(`paramsId=${info.paramsId}`);
      console.log(`paramsRoot=${info.paramsRoot}`);
    });

  // -- room admin-recover -------------------------------------------------
  parent
    .command("admin-recover")
    .description(
      "Verify zero-state admin recovery: re-derive the admin secret from the loaded keypair and reconstruct + verify the recipient state."
    )
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, options) => {
      const { keypair, client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const admin = await RoomAdminClient.Load({
        client,
        roomId: ref.roomId,
        address: ref.address,
        signMessage: keypairSignMessage(keypair),
      });
      // Load() asserts the reconstructed recipient-state root matches the
      // on-chain mirror, so reaching here means recovery verified.
      await admin.refresh();
      const room = admin.Room;
      const state = admin.recipientState;

      const out = {
        room: admin.address.toBase58(),
        roomId: bytesToHex(admin.roomId),
        currentEpoch: room.currentEpoch.toString(),
        reconstructedStateRoot: bytesToHex(state.stateRoot),
        onChainStateRoot: bytesToHex(room.recipientStateRoot),
        memberVersion: state.memberVersion.toString(),
        verified: true,
      };

      if (options.json) return printJson(out);

      console.log("[OK] admin zero-state recovery verified");
      console.log("room:", out.room);
      console.log("currentEpoch:", out.currentEpoch);
      console.log("reconstructedStateRoot:", out.reconstructedStateRoot);
      console.log("memberVersion:", out.memberVersion);
    });

  // -- room recover -------------------------------------------------------
  parent
    .command("recover")
    .description(
      "Finish an unfinished header publication (e.g. a member-add whose header tx failed). No-op when the room is up to date."
    )
    .argument("<roomId>", "32-byte room id (hex), printed by `room create`")
    .option("--json", "Print JSON output", false)
    .action(async (roomArg, options) => {
      const { keypair, client } = setupRoom();

      const ref = parseRoomRef(roomArg);
      const admin = await RoomAdminClient.Load({
        client,
        roomId: ref.roomId,
        address: ref.address,
        signMessage: keypairSignMessage(keypair),
      });

      const result = await admin.resumePendingHeader();
      // Status AFTER the resume: shows what was finished (or that nothing was).
      const status = await admin.pendingPublication();

      if (result === null) {
        if (options.json) {
          return printJson({
            room: admin.address.toBase58(),
            pending: false,
            status: {
              needsHeader: status.needsHeader,
              publicationOpen: status.publicationOpen,
              uncoveredMutation: status.uncoveredMutation,
              pagesDone: status.pagesDone,
              pagesTotal: status.pagesTotal,
            },
          });
        }
        console.log("[OK] no pending header publication; room is up to date");
        console.log("room:", admin.address.toBase58());
        return;
      }

      if (options.json) {
        return printJson({
          room: admin.address.toBase58(),
          pending: true,
          epoch: result.epoch.toString(),
          headerKind: result.kind,
          chainBreak: result.chainBreak,
          memberVersion: result.memberVersion.toString(),
          signatures: result.signatures,
          status: {
            needsHeader: status.needsHeader,
            publicationOpen: status.publicationOpen,
            uncoveredMutation: status.uncoveredMutation,
            pagesDone: status.pagesDone,
            pagesTotal: status.pagesTotal,
          },
        });
      }

      console.log("[OK] pending header publication finished");
      console.log("room:", admin.address.toBase58());
      console.log("epoch:", result.epoch.toString());
      console.log("header:", result.kind, result.chainBreak ? "(chain break)" : "");
      console.log("memberVersion:", result.memberVersion.toString());
      console.log("tx:", result.signatures.join(", "));
      console.log(
        `status: needsHeader=${status.needsHeader} publicationOpen=${status.publicationOpen} ` +
          `uncoveredMutation=${status.uncoveredMutation} pages=${status.pagesDone}/${status.pagesTotal}`
      );
    });
};
