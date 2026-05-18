import envPaths from "env-paths";
import { homedir } from "node:os";
import path from "node:path";

/**
 * OS-aware configuration paths.
 *
 * env-paths resolves to the right place on each platform:
 *   Linux:   $XDG_CONFIG_HOME/xpkt   (default ~/.config/xpkt)
 *   macOS:   ~/Library/Preferences/xpkt
 *   Windows: %APPDATA%\xpkt\Config
 *
 * The `suffix: ""` option strips the default "-nodejs" suffix env-paths
 * appends, so the directory name stays exactly "xpkt".
 */
const paths = envPaths("xpkt", { suffix: "" });

export const ConfigFolderPath = paths.config;

/**
 * Primary config file (TOML, hand-editable, includes comments).
 * Stored at <config>/config.toml.
 */
export const ConfigPath = path.join(ConfigFolderPath, "config.toml");

/**
 * Path to the Packet-managed wallet. Used only when the user has NOT
 * pointed us at an external keypair (Solana CLI's, hardware wallet, etc.).
 */
export const WalletPath = path.join(ConfigFolderPath, "wallet.json");

/**
 * Solana CLI's default keypair location. We auto-detect this so a user
 * who already ran `solana-keygen new` doesn't have to import their key
 * into Packet. interop comes for free.
 */
export const SolanaDefaultKeypairPath = path.join(
  homedir(),
  ".config",
  "solana",
  "id.json"
);

/**
 * Current schema version of the on-disk config format.
 */
export const ConfigSchemaVersion = 1;
