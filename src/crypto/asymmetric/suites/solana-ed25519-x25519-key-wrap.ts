import {
    AsymmetricEncryptionAlgorithm,
    KeyDerivationAlgorithm,
} from "../../types/asymmetric";
import { SymmetricEncryptionAlgorithm } from "../../types/symmetric";

import { KeyWrapPipelineSuite } from "../pipeline/key-wrap-suite";
import {
    SolanaEd25519X25519RecipientKeyAdapter,
} from "../pipeline/recipient-adapters";
import {
    HkdfSha256SharedKeyDeriver,
    NaclBoxBeforeSharedKeyDeriver,
} from "../pipeline/shared-key-derivers";
import {
    Aes256GcmKeyWrapCipher,
    XSalsa20Poly1305KeyWrapCipher,
} from "../pipeline/key-wrap-ciphers";

export class SolanaEd25519X25519KeyWrapSuite extends KeyWrapPipelineSuite<
    AsymmetricEncryptionAlgorithm.SOLANA_ED25519_X25519
> {
    constructor() {
        super({
            recipient: new SolanaEd25519X25519RecipientKeyAdapter(),

            /**
             * Default is Wallet Standard compatible.
             */
            defaultKdf: KeyDerivationAlgorithm.NACL_BOX_BEFORE,
            defaultEnc: SymmetricEncryptionAlgorithm.XSALSA20_POLY1305,

            /**
             * We can technically also support HKDF/A256GCM here.
             *
             * That would mean:
             *   Solana Ed25519 pubkey -> X25519 pubkey
             *   X25519 shared secret -> HKDF -> AES-GCM
             *
             * But Wallet Standard decrypt expects NaCl box,
             * so NACL_BOX_BEFORE + XSALSA by default.
             */
            derivers: [
                new NaclBoxBeforeSharedKeyDeriver(),
                new HkdfSha256SharedKeyDeriver(),
            ],

            ciphers: [
                new XSalsa20Poly1305KeyWrapCipher(),
                new Aes256GcmKeyWrapCipher(),
            ],
        });
    }
}