import type { Bytes } from "../../types/common.js";
import { toBase64, fromBase64, utf8, text } from "../../utils/encoding.js";
import type { BodyEncoding } from "../types/common.js";

type EncodedFields<T extends Record<string, Bytes>> = {
    [K in keyof T]: string;
};

type DecodedFields<T extends Record<string, string>> = {
    [K in keyof T]: Bytes;
};

export class PacketEncoder {
    readonly encoding: BodyEncoding;

    constructor(encoding: BodyEncoding) {
        this.encoding = encoding;
    }

    encode(data: Bytes): string {
        return this.encoding === "base64"
            ? toBase64(data)
            : text(data);
    }

    decode(data: string): Bytes {
        return this.encoding === "base64"
            ? fromBase64(data)
            : utf8(data);
    }

    encodeFields<T extends Record<string, Bytes>>(fields: T): EncodedFields<T> {
        const encoded = {} as EncodedFields<T>;

        for (const key in fields) {
            encoded[key] = this.encode(fields[key]);
        }

        return encoded;
    }

    decodeFields<T extends Record<string, string>>(fields: T): DecodedFields<T> {
        const decoded = {} as DecodedFields<T>;

        for (const key in fields) {
            decoded[key] = this.decode(fields[key]);
        }

        return decoded;
    }
}