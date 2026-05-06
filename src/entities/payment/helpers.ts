import { TokenProgramType } from "./types";

export const ParsePaymentRuleTokenProgram = (tokenProgram: any): TokenProgramType => {
    switch (tokenProgram) {
        case 0:
            return TokenProgramType.TokenProgram;
        case 1:
            return TokenProgramType.Token2022Program;
        default:
            throw new Error("Unsupported token program");
    }
}