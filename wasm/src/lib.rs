//! XPKT BGW broadcast-encryption backend over BLS12-381 (arkworks).
//!
//! BGW broadcast encryption is realized on the asymmetric (Type-3) BLS12-381
//! pairing e: G1 × G2 -> GT, with secret-side material in G1 and header-side
//! material in G2.
//!
//! Public parameters for capacity n:
//! - P1[i] = g1^(alpha^i) for i = 1..2n, with index n+1 omitted (never published:
//!   a holder of P1[n+1] could derive every epoch key).
//! - P2[i] = g2^(alpha^i) for i = 1..n.
//! - v     = g2^gamma   (per-room key; gamma is the room secret, distinct from the
//!   global setup secret alpha).
//!
//! Member secret for slot i:
//! - d_i = P1[i]^gamma = g1^(gamma * alpha^i).
//!
//! Header for recipient set S (random t):
//! - C0 = g2^t
//! - C1 = (v * Π_{j in S} P2[n+1-j])^t
//! - K  = e(P1[n], P2[1])^t = e(g1, g2)^(alpha^(n+1) * t)
//!
//! Decapsulation for i ∈ S:
//! - numerator   = e(P1[i], C1)
//! - denom_base  = d_i * Π_{j in S, j != i} P1[n+1-j+i]
//! - denominator = e(denom_base, C0)
//! - K           = numerator / denominator
//!
//! The construction and its security model are documented in CRYPTOGRAPHY.md.

use ark_bls12_381::{Bls12_381, Fr, G1Affine, G1Projective, G2Affine, G2Projective};
use ark_ec::{
    pairing::{Pairing, PairingOutput},
    AffineRepr, CurveGroup, PrimeGroup,
};
use ark_ff::{PrimeField, Zero};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize, Compress, Validate};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

const SCHEME_ID: &str = "xpkt-bgw-admin-v1-bls12-381";

#[derive(Debug, thiserror::Error)]
pub enum BgwError {
    #[error("capacity must be positive")]
    BadCapacity,
    #[error("slot out of range")]
    BadSlot,
    #[error("duplicate active slot")]
    DuplicateSlot,
    #[error("slot not active")]
    SlotNotActive,
    #[error("scheme mismatch")]
    SchemeMismatch,
    #[error("capacity mismatch")]
    CapacityMismatch,
    #[error("invalid encoded group element")]
    BadGroupElement,
    #[error("invalid scalar encoding")]
    BadScalar,
    #[error("epoch key commitment mismatch")]
    BadCommitment,
    #[error("serialization error")]
    Serialization,
    #[error("serde wasm error: {0}")]
    Serde(String),
}

fn js_err(e: impl ToString) -> JsValue {
    JsValue::from_str(&e.to_string())
}

fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(value).map_err(|e| js_err(format!("serde encode: {e}")))
}

fn from_js<T: for<'de> Deserialize<'de>>(value: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value).map_err(|e| js_err(format!("serde decode: {e}")))
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmAdminSecret {
    pub scheme: String,
    pub capacity: String,
    pub alpha: Vec<u8>,
    pub gamma: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmPublicParams {
    pub scheme: String,
    pub capacity: String,
    /// P1[i] compressed G1 bytes. Index 0 and index n+1 are empty (n+1 is the
    /// omitted BGW power and must never be published).
    pub g1_powers: Vec<Vec<u8>>,
    /// P2[i] compressed G2 bytes. Index 0 is empty; only 1..n are used.
    pub g2_powers: Vec<Vec<u8>>,
    pub v_g2: Vec<u8>,
    pub params_root: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmUserSecret {
    pub scheme: String,
    pub capacity: String,
    pub slot: String,
    pub d_g1: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmEpochHeader {
    pub scheme: String,
    pub capacity: String,
    pub epoch: String,
    pub active_slots: Vec<String>,
    pub active_set_root: Vec<u8>,
    pub c0_g2: Vec<u8>,
    pub c1_g2: Vec<u8>,
    pub epoch_key_commitment: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasmEncapsulatedEpoch {
    pub header: WasmEpochHeader,
    pub epoch_key: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncapsulateArgs {
    pub params: WasmPublicParams,
    pub active_slots: Vec<String>,
    pub epoch: String,
    pub aad: Vec<u8>,
    /// Seed for the ephemeral scalar t; the caller supplies cryptographically
    /// random bytes (>= 32). Randomness is kept outside WASM.
    pub t_seed: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecapsulateArgs {
    pub params: WasmPublicParams,
    pub user_secret: WasmUserSecret,
    pub header: WasmEpochHeader,
    pub aad: Vec<u8>,
}

fn hash_many(label: &[u8], parts: &[&[u8]]) -> Vec<u8> {
    let mut h = Sha256::new();
    h.update(label);
    for p in parts {
        h.update((*p).len().to_be_bytes());
        h.update(*p);
    }
    h.finalize().to_vec()
}

fn u64be(v: u64) -> [u8; 8] {
    v.to_be_bytes()
}

fn fr_from_hash(label: &[u8], parts: &[&[u8]]) -> Fr {
    let digest = hash_many(label, parts);
    Fr::from_be_bytes_mod_order(&digest)
}

fn fr_to_bytes(x: &Fr) -> Result<Vec<u8>, BgwError> {
    let mut out = Vec::new();
    x.serialize_compressed(&mut out)
        .map_err(|_| BgwError::Serialization)?;
    Ok(out)
}

fn fr_from_bytes(bytes: &[u8]) -> Result<Fr, BgwError> {
    Fr::deserialize_compressed(bytes).map_err(|_| BgwError::BadScalar)
}

fn g1_to_bytes(p: &G1Projective) -> Result<Vec<u8>, BgwError> {
    let affine = p.into_affine();
    if affine.is_zero() {
        return Err(BgwError::BadGroupElement);
    }
    let mut out = Vec::new();
    affine
        .serialize_with_mode(&mut out, Compress::Yes)
        .map_err(|_| BgwError::Serialization)?;
    Ok(out)
}

fn g2_to_bytes(p: &G2Projective) -> Result<Vec<u8>, BgwError> {
    let affine = p.into_affine();
    if affine.is_zero() {
        return Err(BgwError::BadGroupElement);
    }
    let mut out = Vec::new();
    affine
        .serialize_with_mode(&mut out, Compress::Yes)
        .map_err(|_| BgwError::Serialization)?;
    Ok(out)
}

fn gt_to_bytes(p: &PairingOutput<Bls12_381>) -> Result<Vec<u8>, BgwError> {
    let mut out = Vec::new();
    p.serialize_with_mode(&mut out, Compress::Yes)
        .map_err(|_| BgwError::Serialization)?;
    Ok(out)
}

fn g1_from_bytes(bytes: &[u8]) -> Result<G1Projective, BgwError> {
    let affine = G1Affine::deserialize_with_mode(bytes, Compress::Yes, Validate::Yes)
        .map_err(|_| BgwError::BadGroupElement)?;
    if affine.is_zero() {
        return Err(BgwError::BadGroupElement);
    }
    Ok(affine.into_group())
}

fn g2_from_bytes(bytes: &[u8]) -> Result<G2Projective, BgwError> {
    let affine = G2Affine::deserialize_with_mode(bytes, Compress::Yes, Validate::Yes)
        .map_err(|_| BgwError::BadGroupElement)?;
    if affine.is_zero() {
        return Err(BgwError::BadGroupElement);
    }
    Ok(affine.into_group())
}

fn pairing(g1: &G1Projective, g2: &G2Projective) -> PairingOutput<Bls12_381> {
    Bls12_381::pairing(g1.into_affine(), g2.into_affine())
}

fn derive_epoch_key(k: &PairingOutput<Bls12_381>, aad: &[u8]) -> Result<Vec<u8>, BgwError> {
    let k_bytes = gt_to_bytes(k)?;
    Ok(hash_many(b"xpkt-bgw-epoch-key-v1", &[&k_bytes, aad]))
}

fn epoch_key_commitment(epoch_key: &[u8]) -> Vec<u8> {
    hash_many(b"xpkt-bgw-epoch-key-commitment-v1", &[epoch_key])
}

fn active_slots_root(slots: &[u64]) -> Result<Vec<u8>, BgwError> {
    let mut normalized = slots.to_vec();
    normalized.sort_unstable();
    normalized.dedup();
    if normalized.len() != slots.len() {
        return Err(BgwError::DuplicateSlot);
    }
    let encoded: Vec<Vec<u8>> = normalized.iter().map(|s| u64be(*s).to_vec()).collect();
    let refs: Vec<&[u8]> = encoded.iter().map(|v| v.as_slice()).collect();
    Ok(hash_many(b"xpkt-bgw-active-slots-v1", &refs))
}

fn normalize_slots(capacity: u64, slots: &[u64]) -> Result<Vec<u64>, BgwError> {
    if capacity == 0 {
        return Err(BgwError::BadCapacity);
    }
    let mut out = slots.to_vec();
    out.sort_unstable();
    for s in &out {
        if *s == 0 || *s > capacity {
            return Err(BgwError::BadSlot);
        }
    }
    for w in out.windows(2) {
        if w[0] == w[1] {
            return Err(BgwError::DuplicateSlot);
        }
    }
    Ok(out)
}

fn parse_u64(val: &str) -> Result<u64, BgwError> {
    val.parse::<u64>().map_err(|_| BgwError::Serialization)
}

fn parse_capacity(val: &str) -> Result<u64, BgwError> {
    let capacity = parse_u64(val)?;
    if capacity == 0 {
        return Err(BgwError::BadCapacity);
    }
    Ok(capacity)
}

fn parse_slot(val: &str) -> Result<u64, BgwError> {
    let slot = parse_u64(val)?;
    if slot == 0 {
        return Err(BgwError::BadSlot);
    }
    Ok(slot)
}

fn parse_slots(vals: &[String]) -> Result<Vec<u64>, BgwError> {
    vals.iter().map(|v| parse_slot(v)).collect()
}

fn u64_to_usize(v: u64) -> Result<usize, BgwError> {
    usize::try_from(v).map_err(|_| BgwError::Serialization)
}

fn capacity_to_usize(capacity: u64) -> Result<usize, BgwError> {
    u64_to_usize(capacity).map_err(|_| BgwError::BadCapacity)
}

fn bgw_lengths(n: usize) -> Result<(usize, usize, usize), BgwError> {
    let two_n = n.checked_mul(2).ok_or(BgwError::Serialization)?;
    let g1_len = two_n.checked_add(2).ok_or(BgwError::Serialization)?;
    let g2_len = n.checked_add(1).ok_or(BgwError::Serialization)?;
    Ok((two_n, g1_len, g2_len))
}

fn slots_to_strings(slots: &[u64]) -> Vec<String> {
    slots.iter().map(|s| s.to_string()).collect()
}

fn assert_scheme(s: &str) -> Result<(), BgwError> {
    if s != SCHEME_ID {
        return Err(BgwError::SchemeMismatch);
    }
    Ok(())
}

fn decode_params(
    params: &WasmPublicParams,
) -> Result<
    (
        Vec<Option<G1Projective>>,
        Vec<Option<G2Projective>>,
        G2Projective,
    ),
    BgwError,
> {
    assert_scheme(&params.scheme)?;
    let capacity = parse_capacity(&params.capacity)?;
    let n = capacity_to_usize(capacity)?;
    let (two_n, g1_len, g2_len) = bgw_lengths(n)?;
    if params.g1_powers.len() != g1_len {
        return Err(BgwError::Serialization);
    }
    if params.g2_powers.len() != g2_len {
        return Err(BgwError::Serialization);
    }

    let mut g1 = vec![None; g1_len];
    for i in 1..=two_n {
        if i == n + 1 {
            // P1[n+1] is the omitted power; it must be absent from public params.
            if !params.g1_powers[i].is_empty() {
                return Err(BgwError::Serialization);
            }
            continue;
        }
        g1[i] = Some(g1_from_bytes(&params.g1_powers[i])?);
    }

    let mut g2 = vec![None; g2_len];
    for i in 1..=n {
        g2[i] = Some(g2_from_bytes(&params.g2_powers[i])?);
    }

    let v = g2_from_bytes(&params.v_g2)?;
    Ok((g1, g2, v))
}

fn get_g1(powers: &[Option<G1Projective>], idx: usize) -> Result<G1Projective, BgwError> {
    powers
        .get(idx)
        .and_then(|x| *x)
        .ok_or(BgwError::Serialization)
}

fn get_g2(powers: &[Option<G2Projective>], idx: usize) -> Result<G2Projective, BgwError> {
    powers
        .get(idx)
        .and_then(|x| *x)
        .ok_or(BgwError::Serialization)
}

#[wasm_bindgen]
pub fn xpkt_bgw_curve_id() -> String {
    "bls12-381".to_string()
}

#[wasm_bindgen]
pub fn xpkt_bgw_scheme_id() -> String {
    SCHEME_ID.to_string()
}

#[wasm_bindgen]
pub fn xpkt_bgw_backend_status() -> String {
    "arkworks BLS12-381 BGW backend".to_string()
}

#[wasm_bindgen]
pub fn wasm_derive_admin_secret(seed: &[u8], capacity: String) -> Result<JsValue, JsValue> {
    let capacity_u64 = parse_capacity(&capacity).map_err(js_err)?;
    let cap = u64be(capacity_u64);
    let alpha = fr_from_hash(b"xpkt-bgw-alpha-v1", &[seed, &cap]);
    let gamma = fr_from_hash(b"xpkt-bgw-gamma-v1", &[seed, &cap]);
    let secret = WasmAdminSecret {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity_u64.to_string(),
        alpha: fr_to_bytes(&alpha).map_err(js_err)?,
        gamma: fr_to_bytes(&gamma).map_err(js_err)?,
    };
    to_js(&secret)
}

#[wasm_bindgen]
pub fn wasm_setup_public_params(admin_secret: JsValue) -> Result<JsValue, JsValue> {
    let secret: WasmAdminSecret = from_js(admin_secret)?;
    assert_scheme(&secret.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&secret.capacity).map_err(js_err)?;
    let n = capacity_to_usize(capacity).map_err(js_err)?;
    let (two_n, g1_len, g2_len) = bgw_lengths(n).map_err(js_err)?;
    let alpha_len = two_n
        .checked_add(2)
        .ok_or_else(|| js_err(BgwError::Serialization))?;
    let alpha_last = two_n
        .checked_add(1)
        .ok_or_else(|| js_err(BgwError::Serialization))?;
    let alpha = fr_from_bytes(&secret.alpha).map_err(js_err)?;
    let gamma = fr_from_bytes(&secret.gamma).map_err(js_err)?;

    let g1_gen = G1Projective::generator();
    let g2_gen = G2Projective::generator();

    let mut alpha_powers = vec![Fr::zero(); alpha_len];
    let mut cur = Fr::from(1u64);
    for i in 1..=alpha_last {
        cur *= alpha;
        alpha_powers[i] = cur;
    }

    let mut g1_powers = vec![Vec::<u8>::new(); g1_len];
    for i in 1..=two_n {
        if i == n + 1 {
            continue;
        }
        g1_powers[i] = g1_to_bytes(&(g1_gen * alpha_powers[i])).map_err(js_err)?;
    }

    let mut g2_powers = vec![Vec::<u8>::new(); g2_len];
    for i in 1..=n {
        g2_powers[i] = g2_to_bytes(&(g2_gen * alpha_powers[i])).map_err(js_err)?;
    }

    let v_g2 = g2_to_bytes(&(g2_gen * gamma)).map_err(js_err)?;

    let mut root_parts: Vec<&[u8]> = Vec::new();
    let cap_bytes = u64be(capacity);
    root_parts.push(&cap_bytes);
    root_parts.push(&v_g2);
    for p in g1_powers.iter().skip(1) {
        root_parts.push(p);
    }
    for p in g2_powers.iter().skip(1) {
        root_parts.push(p);
    }
    let params_root = hash_many(b"xpkt-bgw-bls12-381-params-root-v1", &root_parts);

    let params = WasmPublicParams {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity.to_string(),
        g1_powers,
        g2_powers,
        v_g2,
        params_root,
    };
    to_js(&params)
}

#[wasm_bindgen]
pub fn wasm_extract_user_secret(admin_secret: JsValue, slot: String) -> Result<JsValue, JsValue> {
    let secret: WasmAdminSecret = from_js(admin_secret)?;
    assert_scheme(&secret.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&secret.capacity).map_err(js_err)?;
    let slot_u64 = parse_slot(&slot).map_err(js_err)?;
    if slot_u64 > capacity {
        return Err(js_err(BgwError::BadSlot));
    }
    let alpha = fr_from_bytes(&secret.alpha).map_err(js_err)?;
    let gamma = fr_from_bytes(&secret.gamma).map_err(js_err)?;
    let mut alpha_i = Fr::from(1u64);
    for _ in 0..slot_u64 {
        alpha_i *= alpha;
    }
    let d = G1Projective::generator() * (gamma * alpha_i);
    let user_secret = WasmUserSecret {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity.to_string(),
        slot: slot_u64.to_string(),
        d_g1: g1_to_bytes(&d).map_err(js_err)?,
    };
    to_js(&user_secret)
}

#[wasm_bindgen]
pub fn wasm_encapsulate_epoch_key(args: JsValue) -> Result<JsValue, JsValue> {
    let args: EncapsulateArgs = from_js(args)?;
    assert_scheme(&args.params.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&args.params.capacity).map_err(js_err)?;
    let n = capacity_to_usize(capacity).map_err(js_err)?;
    let n_plus_one = n
        .checked_add(1)
        .ok_or_else(|| js_err(BgwError::Serialization))?;
    let active_slot_inputs = parse_slots(&args.active_slots).map_err(js_err)?;
    let active_slots = normalize_slots(capacity, &active_slot_inputs).map_err(js_err)?;
    let active_root = active_slots_root(&active_slots).map_err(js_err)?;
    let epoch_u64 = parse_u64(&args.epoch).map_err(js_err)?;
    if args.t_seed.len() < 32 {
        return Err(js_err("t_seed must be at least 32 bytes"));
    }

    let (g1_powers, g2_powers, v_g2) = decode_params(&args.params).map_err(js_err)?;
    let epoch_bytes = u64be(epoch_u64);
    let t = fr_from_hash(
        b"xpkt-bgw-bls12-381-t-v1",
        &[&args.t_seed, &epoch_bytes, &active_root, &args.aad],
    );

    let mut c1_base = v_g2;
    for j in &active_slots {
        let j = u64_to_usize(*j).map_err(js_err)?;
        let idx = n_plus_one - j;
        c1_base += get_g2(&g2_powers, idx).map_err(js_err)?;
    }

    let c0 = G2Projective::generator() * t;
    let c1 = c1_base * t;

    let p1_n = get_g1(&g1_powers, n).map_err(js_err)?;
    let p2_1 = get_g2(&g2_powers, 1).map_err(js_err)?;
    let k_base = pairing(&p1_n, &p2_1);
    let k = k_base * t;
    let epoch_key = derive_epoch_key(&k, &args.aad).map_err(js_err)?;

    let header = WasmEpochHeader {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity.to_string(),
        epoch: args.epoch,
        active_slots: slots_to_strings(&active_slots),
        active_set_root: active_root,
        c0_g2: g2_to_bytes(&c0).map_err(js_err)?,
        c1_g2: g2_to_bytes(&c1).map_err(js_err)?,
        epoch_key_commitment: epoch_key_commitment(&epoch_key),
    };
    to_js(&WasmEncapsulatedEpoch { header, epoch_key })
}

#[wasm_bindgen]
pub fn wasm_decapsulate_epoch_key(args: JsValue) -> Result<Vec<u8>, JsValue> {
    let args: DecapsulateArgs = from_js(args)?;
    assert_scheme(&args.params.scheme).map_err(js_err)?;
    assert_scheme(&args.user_secret.scheme).map_err(js_err)?;
    assert_scheme(&args.header.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&args.params.capacity).map_err(js_err)?;
    let user_capacity = parse_capacity(&args.user_secret.capacity).map_err(js_err)?;
    let header_capacity = parse_capacity(&args.header.capacity).map_err(js_err)?;
    if capacity != user_capacity || capacity != header_capacity {
        return Err(js_err(BgwError::CapacityMismatch));
    }
    let n = capacity_to_usize(capacity).map_err(js_err)?;
    let n_plus_one = n
        .checked_add(1)
        .ok_or_else(|| js_err(BgwError::Serialization))?;
    let header_active_slots = parse_slots(&args.header.active_slots).map_err(js_err)?;
    let active_slots = normalize_slots(capacity, &header_active_slots).map_err(js_err)?;
    let active_root = active_slots_root(&active_slots).map_err(js_err)?;
    if active_root != args.header.active_set_root {
        return Err(js_err("active set root mismatch"));
    }
    let i = parse_slot(&args.user_secret.slot).map_err(js_err)?;
    if i > capacity {
        return Err(js_err(BgwError::BadSlot));
    }
    if !active_slots.contains(&i) {
        return Err(js_err(BgwError::SlotNotActive));
    }
    let i_usize = u64_to_usize(i).map_err(js_err)?;

    let (g1_powers, _g2_powers, _v_g2) = decode_params(&args.params).map_err(js_err)?;
    let c0 = g2_from_bytes(&args.header.c0_g2).map_err(js_err)?;
    let c1 = g2_from_bytes(&args.header.c1_g2).map_err(js_err)?;
    let d_i = g1_from_bytes(&args.user_secret.d_g1).map_err(js_err)?;

    let p1_i = get_g1(&g1_powers, i_usize).map_err(js_err)?;
    let numerator = pairing(&p1_i, &c1);

    let mut denom_base = d_i;
    for j in &active_slots {
        if *j == i {
            continue;
        }
        let j = u64_to_usize(*j).map_err(js_err)?;
        let idx = n_plus_one
            .checked_sub(j)
            .and_then(|v| v.checked_add(i_usize))
            .ok_or_else(|| js_err(BgwError::Serialization))?;
        denom_base += get_g1(&g1_powers, idx).map_err(js_err)?;
    }
    let denominator = pairing(&denom_base, &c0);
    let k = numerator - denominator;
    let epoch_key = derive_epoch_key(&k, &args.aad).map_err(js_err)?;
    if epoch_key_commitment(&epoch_key) != args.header.epoch_key_commitment {
        return Err(js_err(BgwError::BadCommitment));
    }
    Ok(epoch_key)
}

// -----------------------------------------------------------------------------
// Sparse/flat recipient API
// -----------------------------------------------------------------------------
// The caller supplies only the BLS12-381 points required for the current
// recipient snapshot, flat-packed as compressed encodings (G1 = 48 bytes,
// G2 = 96 bytes), instead of the full params object.

const G1_COMPRESSED_BYTES: usize = 48;
const G2_COMPRESSED_BYTES: usize = 96;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SparseEncapsulateArgs {
    pub capacity: String,
    pub epoch: String,
    pub aad: Vec<u8>,
    pub t_seed: Vec<u8>,

    /// include | exclude. In include mode `recipient_slots` are included slots.
    /// In exclude mode `recipient_slots` are excluded slots and
    /// `assigned_until_slot` defines the inclusive 1..m universe.
    pub recipient_mode: String,
    pub assigned_until_slot: String,
    pub recipient_slots: Vec<String>,

    /// Room/admin-specific public key v = g2^gamma. This is NOT global params.
    pub room_v_g2: Vec<u8>,

    /// P1[n] and P2[1] from global params.
    pub p1_n_g1: Vec<u8>,
    pub p2_1_g2: Vec<u8>,

    /// Terms added/subtracted to build C1 base.
    /// C1 base = room_v_g2 + sum(add G2) - sum(sub G2).
    pub c1_g2_add_flat: Vec<u8>,
    pub c1_g2_sub_flat: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SparseDecapsulateArgs {
    pub capacity: String,
    pub user_secret: WasmUserSecret,
    pub header: WasmEpochHeader,
    pub aad: Vec<u8>,

    /// include | exclude. In include mode `recipient_slots` are included slots.
    /// In exclude mode `recipient_slots` are excluded slots and
    /// `assigned_until_slot` defines the inclusive 1..m universe.
    pub recipient_mode: String,
    pub assigned_until_slot: String,
    pub recipient_slots: Vec<String>,

    /// P1[i] for the reader slot.
    pub p1_i_g1: Vec<u8>,

    /// Terms added/subtracted to the denominator base.
    /// denom_base = d_i + sum(add G1) - sum(sub G1).
    pub denom_g1_add_flat: Vec<u8>,
    pub denom_g1_sub_flat: Vec<u8>,
}

fn recipient_slots_root(
    mode: &str,
    assigned_until_slot: u64,
    slots: &[u64],
) -> Result<Vec<u8>, BgwError> {
    let mut normalized = slots.to_vec();
    normalized.sort_unstable();
    normalized.dedup();
    if normalized.len() != slots.len() {
        return Err(BgwError::DuplicateSlot);
    }
    let assigned = u64be(assigned_until_slot);
    let encoded: Vec<Vec<u8>> = normalized.iter().map(|s| u64be(*s).to_vec()).collect();
    let mut refs: Vec<&[u8]> = Vec::new();
    refs.push(mode.as_bytes());
    refs.push(&assigned);
    for e in &encoded {
        refs.push(e.as_slice());
    }
    Ok(hash_many(b"xpkt-bgw-recipient-slots-v2", &refs))
}

fn assert_recipient_mode(mode: &str) -> Result<(), BgwError> {
    if mode != "include" && mode != "exclude" {
        return Err(BgwError::Serialization);
    }
    Ok(())
}

fn normalize_recipient_slots(
    capacity: u64,
    mode: &str,
    assigned_until_slot: u64,
    slots: &[u64],
) -> Result<Vec<u64>, BgwError> {
    assert_recipient_mode(mode)?;
    if capacity == 0 {
        return Err(BgwError::BadCapacity);
    }
    if mode == "exclude" && (assigned_until_slot == 0 || assigned_until_slot > capacity) {
        return Err(BgwError::BadSlot);
    }
    let mut out = slots.to_vec();
    out.sort_unstable();
    for s in &out {
        if *s == 0 || *s > capacity {
            return Err(BgwError::BadSlot);
        }
        if mode == "exclude" && *s > assigned_until_slot {
            return Err(BgwError::BadSlot);
        }
    }
    for w in out.windows(2) {
        if w[0] == w[1] {
            return Err(BgwError::DuplicateSlot);
        }
    }
    Ok(out)
}

fn slot_is_recipient(mode: &str, assigned_until_slot: u64, slots: &[u64], slot: u64) -> bool {
    match mode {
        "include" => slots.binary_search(&slot).is_ok(),
        "exclude" => slot > 0 && slot <= assigned_until_slot && slots.binary_search(&slot).is_err(),
        _ => false,
    }
}

fn aggregate_g1_flat(bytes: &[u8]) -> Result<G1Projective, BgwError> {
    if bytes.len() % G1_COMPRESSED_BYTES != 0 {
        return Err(BgwError::Serialization);
    }
    let mut acc = G1Projective::zero();
    for chunk in bytes.chunks_exact(G1_COMPRESSED_BYTES) {
        acc += g1_from_bytes(chunk)?;
    }
    Ok(acc)
}

fn aggregate_g2_flat(bytes: &[u8]) -> Result<G2Projective, BgwError> {
    if bytes.len() % G2_COMPRESSED_BYTES != 0 {
        return Err(BgwError::Serialization);
    }
    let mut acc = G2Projective::zero();
    for chunk in bytes.chunks_exact(G2_COMPRESSED_BYTES) {
        acc += g2_from_bytes(chunk)?;
    }
    Ok(acc)
}

#[wasm_bindgen]
pub fn wasm_aggregate_g1_flat(flat: &[u8]) -> Result<Vec<u8>, JsValue> {
    g1_to_bytes(&aggregate_g1_flat(flat).map_err(js_err)?).map_err(js_err)
}

#[wasm_bindgen]
pub fn wasm_aggregate_g2_flat(flat: &[u8]) -> Result<Vec<u8>, JsValue> {
    g2_to_bytes(&aggregate_g2_flat(flat).map_err(js_err)?).map_err(js_err)
}

#[wasm_bindgen]
pub fn wasm_aggregate_g1_signed(add_flat: &[u8], sub_flat: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut acc = aggregate_g1_flat(add_flat).map_err(js_err)?;
    acc -= aggregate_g1_flat(sub_flat).map_err(js_err)?;
    if acc.is_zero() {
        Ok(Vec::new())
    } else {
        g1_to_bytes(&acc).map_err(js_err)
    }
}

#[wasm_bindgen]
pub fn wasm_aggregate_g2_signed(add_flat: &[u8], sub_flat: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut acc = aggregate_g2_flat(add_flat).map_err(js_err)?;
    acc -= aggregate_g2_flat(sub_flat).map_err(js_err)?;
    if acc.is_zero() {
        Ok(Vec::new())
    } else {
        g2_to_bytes(&acc).map_err(js_err)
    }
}

fn prefix_g1_powers(powers: &[Vec<u8>]) -> Result<Vec<Vec<u8>>, BgwError> {
    let mut out: Vec<Vec<u8>> = Vec::with_capacity(powers.len() + 1);
    let mut acc = G1Projective::zero();
    // prefix[0] is the identity, encoded as empty bytes (no valid compressed form).
    out.push(Vec::new());
    for bytes in powers {
        if !bytes.is_empty() {
            acc += g1_from_bytes(bytes)?;
        }
        if acc.is_zero() {
            out.push(Vec::new());
        } else {
            out.push(g1_to_bytes(&acc)?);
        }
    }
    Ok(out)
}

fn prefix_g2_powers(powers: &[Vec<u8>]) -> Result<Vec<Vec<u8>>, BgwError> {
    let mut out: Vec<Vec<u8>> = Vec::with_capacity(powers.len() + 1);
    let mut acc = G2Projective::zero();
    out.push(Vec::new());
    for bytes in powers {
        if !bytes.is_empty() {
            acc += g2_from_bytes(bytes)?;
        }
        if acc.is_zero() {
            out.push(Vec::new());
        } else {
            out.push(g2_to_bytes(&acc)?);
        }
    }
    Ok(out)
}

#[wasm_bindgen]
pub fn wasm_prefix_g1_powers(powers: JsValue) -> Result<JsValue, JsValue> {
    let powers: Vec<Vec<u8>> = from_js(powers)?;
    to_js(&prefix_g1_powers(&powers).map_err(js_err)?)
}

#[wasm_bindgen]
pub fn wasm_prefix_g2_powers(powers: JsValue) -> Result<JsValue, JsValue> {
    let powers: Vec<Vec<u8>> = from_js(powers)?;
    to_js(&prefix_g2_powers(&powers).map_err(js_err)?)
}

#[wasm_bindgen]
pub fn wasm_derive_room_public_key(admin_secret: JsValue) -> Result<Vec<u8>, JsValue> {
    let secret: WasmAdminSecret = from_js(admin_secret)?;
    assert_scheme(&secret.scheme).map_err(js_err)?;
    let gamma = fr_from_bytes(&secret.gamma).map_err(js_err)?;
    g2_to_bytes(&(G2Projective::generator() * gamma)).map_err(js_err)
}

#[wasm_bindgen]
pub fn wasm_extract_user_secret_from_g1_power(
    admin_secret: JsValue,
    slot: String,
    p1_slot_g1: &[u8],
) -> Result<JsValue, JsValue> {
    let secret: WasmAdminSecret = from_js(admin_secret)?;
    assert_scheme(&secret.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&secret.capacity).map_err(js_err)?;
    let slot_u64 = parse_slot(&slot).map_err(js_err)?;
    if slot_u64 > capacity {
        return Err(js_err(BgwError::BadSlot));
    }
    let gamma = fr_from_bytes(&secret.gamma).map_err(js_err)?;
    let p1_slot = g1_from_bytes(p1_slot_g1).map_err(js_err)?;
    let d = p1_slot * gamma;
    let user_secret = WasmUserSecret {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity.to_string(),
        slot: slot_u64.to_string(),
        d_g1: g1_to_bytes(&d).map_err(js_err)?,
    };
    to_js(&user_secret)
}

#[wasm_bindgen]
pub fn wasm_encapsulate_epoch_key_flat(args: JsValue) -> Result<JsValue, JsValue> {
    let args: SparseEncapsulateArgs = from_js(args)?;
    let capacity = parse_capacity(&args.capacity).map_err(js_err)?;
    let assigned_until_slot = parse_u64(&args.assigned_until_slot).map_err(js_err)?;
    let recipient_slot_inputs = parse_slots(&args.recipient_slots).map_err(js_err)?;
    let slots = normalize_recipient_slots(
        capacity,
        &args.recipient_mode,
        assigned_until_slot,
        &recipient_slot_inputs,
    )
    .map_err(js_err)?;
    let recipient_root =
        recipient_slots_root(&args.recipient_mode, assigned_until_slot, &slots).map_err(js_err)?;
    let epoch_u64 = parse_u64(&args.epoch).map_err(js_err)?;
    if args.t_seed.len() < 32 {
        return Err(js_err("t_seed must be at least 32 bytes"));
    }

    let epoch_bytes = u64be(epoch_u64);
    let t = fr_from_hash(
        b"xpkt-bgw-bls12-381-t-v2",
        &[&args.t_seed, &epoch_bytes, &recipient_root, &args.aad],
    );

    let mut c1_base = g2_from_bytes(&args.room_v_g2).map_err(js_err)?;
    c1_base += aggregate_g2_flat(&args.c1_g2_add_flat).map_err(js_err)?;
    c1_base -= aggregate_g2_flat(&args.c1_g2_sub_flat).map_err(js_err)?;

    let c0 = G2Projective::generator() * t;
    let c1 = c1_base * t;

    let p1_n = g1_from_bytes(&args.p1_n_g1).map_err(js_err)?;
    let p2_1 = g2_from_bytes(&args.p2_1_g2).map_err(js_err)?;
    let k_base = pairing(&p1_n, &p2_1);
    let k = k_base * t;
    let epoch_key = derive_epoch_key(&k, &args.aad).map_err(js_err)?;

    let header = WasmEpochHeader {
        scheme: SCHEME_ID.to_string(),
        capacity: capacity.to_string(),
        epoch: args.epoch,
        active_slots: slots_to_strings(&slots),
        active_set_root: recipient_root,
        c0_g2: g2_to_bytes(&c0).map_err(js_err)?,
        c1_g2: g2_to_bytes(&c1).map_err(js_err)?,
        epoch_key_commitment: epoch_key_commitment(&epoch_key),
    };
    to_js(&WasmEncapsulatedEpoch { header, epoch_key })
}

#[wasm_bindgen]
pub fn wasm_decapsulate_epoch_key_flat(args: JsValue) -> Result<Vec<u8>, JsValue> {
    let args: SparseDecapsulateArgs = from_js(args)?;
    assert_scheme(&args.user_secret.scheme).map_err(js_err)?;
    assert_scheme(&args.header.scheme).map_err(js_err)?;
    let capacity = parse_capacity(&args.capacity).map_err(js_err)?;
    let user_capacity = parse_capacity(&args.user_secret.capacity).map_err(js_err)?;
    let header_capacity = parse_capacity(&args.header.capacity).map_err(js_err)?;
    if capacity != user_capacity || capacity != header_capacity {
        return Err(js_err(BgwError::CapacityMismatch));
    }
    let assigned_until_slot = parse_u64(&args.assigned_until_slot).map_err(js_err)?;
    let recipient_slot_inputs = parse_slots(&args.recipient_slots).map_err(js_err)?;
    let slots = normalize_recipient_slots(
        capacity,
        &args.recipient_mode,
        assigned_until_slot,
        &recipient_slot_inputs,
    )
    .map_err(js_err)?;
    let recipient_root =
        recipient_slots_root(&args.recipient_mode, assigned_until_slot, &slots).map_err(js_err)?;
    if recipient_root != args.header.active_set_root {
        return Err(js_err("recipient set root mismatch"));
    }
    let user_slot = parse_slot(&args.user_secret.slot).map_err(js_err)?;
    if user_slot > capacity {
        return Err(js_err(BgwError::BadSlot));
    }
    if !slot_is_recipient(&args.recipient_mode, assigned_until_slot, &slots, user_slot) {
        return Err(js_err(BgwError::SlotNotActive));
    }

    let c0 = g2_from_bytes(&args.header.c0_g2).map_err(js_err)?;
    let c1 = g2_from_bytes(&args.header.c1_g2).map_err(js_err)?;
    let d_i = g1_from_bytes(&args.user_secret.d_g1).map_err(js_err)?;
    let p1_i = g1_from_bytes(&args.p1_i_g1).map_err(js_err)?;

    let numerator = pairing(&p1_i, &c1);
    let mut denom_base = d_i;
    denom_base += aggregate_g1_flat(&args.denom_g1_add_flat).map_err(js_err)?;
    denom_base -= aggregate_g1_flat(&args.denom_g1_sub_flat).map_err(js_err)?;
    let denominator = pairing(&denom_base, &c0);
    let k = numerator - denominator;
    let epoch_key = derive_epoch_key(&k, &args.aad).map_err(js_err)?;
    if epoch_key_commitment(&epoch_key) != args.header.epoch_key_commitment {
        return Err(js_err(BgwError::BadCommitment));
    }
    Ok(epoch_key)
}

#[wasm_bindgen]
pub fn wasm_params_root(params: JsValue) -> Result<Vec<u8>, JsValue> {
    let params: WasmPublicParams = from_js(params)?;
    Ok(params.params_root)
}
