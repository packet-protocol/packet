import type { Bytes } from "../../types/common";
import type { BodyEncoding } from "../types/common";
import {
    type Encrypted,
    type SymmetricEncryptionAlgorithm,
} from "../types/symmetric";

export abstract class BaseSymmetricSuite<
    TAlg extends SymmetricEncryptionAlgorithm = SymmetricEncryptionAlgorithm,
> {
    abstract readonly alg: TAlg;

    abstract encrypt(
        key: Bytes,
        data: Bytes,
        encoding: BodyEncoding,
        iv?: Bytes,
    ): Promise<Encrypted<TAlg>>;

    abstract decrypt(
        key: Bytes,
        payload: Encrypted<TAlg>,
    ): Promise<Bytes>;
}