export function assertUserStringLimits(params: {
    name: string;
    uri: string;
}) {
    const nameBytes = Buffer.byteLength(params.name, "utf8");
    const uriBytes = Buffer.byteLength(params.uri, "utf8");

    if (nameBytes > 32) {
        throw new Error(`User name is too long: ${nameBytes} bytes > 32`);
    }

    if (uriBytes > 200) {
        throw new Error(`User uri is too long: ${uriBytes} bytes > 200`);
    }
}