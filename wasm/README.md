# xpkt-bgw-bls12-wasm

BLS12-381 BGW broadcast-encryption engine for the Packet SDK, compiled to
WebAssembly. The crate implements the BGW broadcast-key-establishment scheme over
the asymmetric (Type-3) BLS12-381 pairing using [arkworks](https://arkworks.rs/),
and exposes it to JavaScript/TypeScript through `wasm-bindgen`.

It is the cryptographic core that lets a Packet room distribute a single
per-epoch symmetric key to a dynamic recipient set without per-recipient message
copies and without receiver-side ratchet state, so that a member can recover room
access from a wallet key plus RPC access alone.

## What it does

Given global public parameters and a per-room key, the engine:

- derives per-member secret keys for slots,
- encapsulates an epoch key for a chosen recipient set into a compact header
  (`C0`, `C1`, and a key commitment),
- decapsulates that epoch key for any member in the recipient set,
- provides aggregation helpers over prefix sums of the public parameters so the
  recipient set can be expressed as ranges rather than per-slot points.

The engine performs the pairing-based KEM only. Message and member-secret
encryption (AEAD), the epoch-key hash chain, and the recipient root chain live in
the Packet TypeScript SDK.

## Scheme

The construction is BGW broadcast encryption over BLS12-381 with secret-side
material in G1 and header-side material in G2 (`e: G1 × G2 -> GT`).

Two secrets are separated:

- **`alpha` — global setup secret.** Public parameters are powers of `alpha`:
  `P1[i] = g1^(alpha^i)` (for `i = 1..2n`, with the power `n+1` deliberately
  omitted and never published) and `P2[i] = g2^(alpha^i)` (for `i = 1..n`). These
  are a single large, reusable artifact shared by every room. `alpha` is used
  only during parameter generation and must be destroyed afterward.
- **`gamma` — per-room secret.** Each room has an independent `gamma`. The room
  public key is `v = g2^gamma`; a member at slot `i` gets `d_i = P1[i]^gamma`.
  `gamma` is admin-derivable from a wallet signature, so the global parameter
  artifact never changes per room.

Per epoch, with a random scalar `t` and recipient set `S`:

```
C0 = g2^t
C1 = (v * Π_{j in S} P2[n+1-j])^t
K  = e(P1[n], P2[1])^t = e(g1, g2)^(alpha^(n+1) * t)
```

A member `i ∈ S` recovers `K` as `e(P1[i], C1) / e(d_i * Π_{j∈S, j≠i} P1[n+1-j+i], C0)`.
The epoch key is then `H(K, aad)`.

### Flat / sparse APIs

The full parameter set for a large capacity is big, so the engine also exposes
"flat" entrypoints (`wasm_encapsulate_epoch_key_flat`,
`wasm_decapsulate_epoch_key_flat`) that take only the already-resolved points for
the current recipient snapshot, flat-packed as compressed encodings (G1 = 48
bytes, G2 = 96 bytes). Recipient sets are expressed as `include` or `exclude`
modes, and contiguous ranges are aggregated using prefix sums over the public
parameters (`wasm_prefix_g1_powers`, `wasm_prefix_g2_powers`,
`wasm_aggregate_g1_*`, `wasm_aggregate_g2_*`) so that a range costs a constant
number of group operations rather than one per slot. The decapsulation range can
cross the omitted power `n+1`, in which case it is split into two pieces.

## Exports

Core KEM:

- `wasm_derive_admin_secret(seed, capacity)` — derive `{alpha, gamma}` from a seed.
- `wasm_setup_public_params(adminSecret)` — generate `P1`/`P2` powers, `v`, root.
- `wasm_derive_room_public_key(adminSecret)` — `v = g2^gamma`.
- `wasm_extract_user_secret(adminSecret, slot)` — `d_i` from the full secret.
- `wasm_extract_user_secret_from_g1_power(adminSecret, slot, p1Slot)` — `d_i`
  from a single resolved `P1[slot]`.
- `wasm_encapsulate_epoch_key(args)` / `wasm_decapsulate_epoch_key(args)` — full-params path.
- `wasm_encapsulate_epoch_key_flat(args)` / `wasm_decapsulate_epoch_key_flat(args)` — sparse path.

Aggregation / parameters:

- `wasm_prefix_g1_powers(powers)` / `wasm_prefix_g2_powers(powers)`
- `wasm_aggregate_g1_flat` / `wasm_aggregate_g2_flat`
- `wasm_aggregate_g1_signed` / `wasm_aggregate_g2_signed`
- `wasm_params_root(params)`

Identity:

- `xpkt_bgw_curve_id()` → `"bls12-381"`
- `xpkt_bgw_scheme_id()` → `"xpkt-bgw-admin-v1-bls12-381"`
- `xpkt_bgw_backend_status()` → `"arkworks BLS12-381 BGW backend"`

## Conventions

- u64/u32 values that cross the JS boundary are passed as decimal strings.
- Group elements are arkworks-compressed: G1 = 48 bytes, G2 = 96 bytes; GT is
  compressed. Deserialization validates subgroup membership and rejects the
  identity element.
- Power indices are 1-based; index 0 and the omitted index `n+1` are encoded as
  empty byte slices.
- KEM AADs and key-schedule domains use big-endian integer encoding.
- Randomness for the ephemeral scalar `t` is supplied by the caller (`t_seed`,
  at least 32 bytes); the WASM module does not call a system RNG.

## Build

The engine is built with [`wasm-pack`](https://rustwasm.github.io/wasm-pack/) for
the Node target consumed by the SDK:

```bash
wasm-pack build --target nodejs --out-dir <packet>/sdk/src/entities/wasm/xpkt-bgw-bls12/pkg
```

In the Packet repo this is wired as the `build:bgw-wasm` script in `ts/package.json`.
The contents of `pkg/` are generated output.


## License

Apache-2.0
