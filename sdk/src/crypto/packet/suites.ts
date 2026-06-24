import {
    AsymmetricEncryptionAlgorithm,
    type WrappedKey,
} from "../types/asymmetric.js";
import type { BaseCryptoSuite } from "../asymmetric/base.js";

import { X25519KeyWrapSuite, SolanaEd25519X25519KeyWrapSuite } from "../asymmetric/suites/index.js";

/**
 * Packet-level suite registry.
 *
 */
const KEY_WRAP_SUITES: Partial<
    Record<AsymmetricEncryptionAlgorithm, BaseCryptoSuite<AsymmetricEncryptionAlgorithm>>
> = {
    [AsymmetricEncryptionAlgorithm.X25519]:
        new X25519KeyWrapSuite() as BaseCryptoSuite<AsymmetricEncryptionAlgorithm>,

    [AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519]:
        new SolanaEd25519X25519KeyWrapSuite() as BaseCryptoSuite<AsymmetricEncryptionAlgorithm>,
};

export function getKeyWrapSuite(
    alg: AsymmetricEncryptionAlgorithm,
): BaseCryptoSuite<AsymmetricEncryptionAlgorithm> {
    const suite = KEY_WRAP_SUITES[alg];

    if (!suite) {
        throw new Error(`Unsupported key algorithm: ${alg}`);
    }

    return suite;
}

export function getKeyWrapSuiteForWrappedKey(
    wrapped: WrappedKey,
): BaseCryptoSuite<AsymmetricEncryptionAlgorithm> {
    return getKeyWrapSuite(wrapped.alg);
}