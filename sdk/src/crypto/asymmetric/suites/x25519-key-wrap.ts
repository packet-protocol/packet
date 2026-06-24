import {
    AsymmetricEncryptionAlgorithm,
    KeyDerivationAlgorithm,
} from "../../types/asymmetric.js";
import { SymmetricEncryptionAlgorithm } from "../../types/symmetric.js";

import { KeyWrapPipelineSuite } from "../pipeline/key-wrap-suite.js";
import {
    NativeX25519RecipientKeyAdapter,
} from "../pipeline/recipient-adapters.js";
import {
    HkdfSha256SharedKeyDeriver,
    NaclBoxBeforeSharedKeyDeriver,
} from "../pipeline/shared-key-derivers.js";
import {
    Aes256GcmKeyWrapCipher,
    XSalsa20Poly1305KeyWrapCipher,
} from "../pipeline/key-wrap-ciphers.js";

export class X25519KeyWrapSuite extends KeyWrapPipelineSuite<
    AsymmetricEncryptionAlgorithm.X25519
> {
    constructor() {
        super({
            recipient: new NativeX25519RecipientKeyAdapter(),

            defaultKdf: KeyDerivationAlgorithm.HKDF_SHA256,
            defaultEnc: SymmetricEncryptionAlgorithm.A256GCM,

            derivers: [
                new HkdfSha256SharedKeyDeriver(),
                new NaclBoxBeforeSharedKeyDeriver(),
            ],

            ciphers: [
                new Aes256GcmKeyWrapCipher(),
                new XSalsa20Poly1305KeyWrapCipher(),
            ],
        });
    }
}
