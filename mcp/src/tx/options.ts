export function txOptions(options: any) {
  return {
    options: {
      sendOptions: { skipPreflight: options.skipPreflight ?? false },
    },
    priorityFee: options.priorityFee ? Number(options.priorityFee) : undefined,
  };
}