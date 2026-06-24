import { type PACKET_PROGRAM_ID } from "../constants.js";

export type PacketIDL = {
  "address": PACKET_PROGRAM_ID | string,
  "metadata": {
    "name": "packet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "xpkt.dev"
  },
  "instructions": [
    {
      "name": "adminCreateVault",
      "discriminator": [
        78,
        229,
        12,
        179,
        31,
        188,
        104,
        172
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "8xp7jKKGPwQCZmX4yhCJZscJkotoqQAJXn1XHKJRytGn"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createVaultParams"
            }
          }
        }
      ]
    },
    {
      "name": "adminUpdateVaultAuthority",
      "discriminator": [
        228,
        173,
        115,
        231,
        128,
        47,
        170,
        17
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateVaultAuthorityParams"
            }
          }
        }
      ]
    },
    {
      "name": "adminUpdateVaultPaymentWallFee",
      "discriminator": [
        103,
        203,
        228,
        48,
        73,
        4,
        204,
        204
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateVaultPaymentWallFeeParams"
            }
          }
        }
      ]
    },
    {
      "name": "adminWithdrawFromVault",
      "discriminator": [
        215,
        36,
        157,
        132,
        73,
        52,
        181,
        42
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawFromVaultParams"
            }
          }
        }
      ]
    },
    {
      "name": "approveEscrow",
      "discriminator": [
        79,
        143,
        76,
        129,
        122,
        177,
        12,
        122
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "approveEscrowParams"
            }
          }
        }
      ]
    },
    {
      "name": "archiveInbox",
      "discriminator": [
        37,
        193,
        74,
        202,
        187,
        99,
        255,
        0
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "inbox",
          "writable": true
        },
        {
          "name": "inboxBody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  95,
                  98,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "archiveInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "createEphemeralInbox",
      "discriminator": [
        78,
        186,
        165,
        249,
        72,
        113,
        254,
        204
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "params.id"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "inboxMetadata",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        },
        {
          "name": "paymentMint",
          "writable": true,
          "optional": true
        },
        {
          "name": "paymentTokenAccount",
          "optional": true
        },
        {
          "name": "paymentEscrowTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "inbox"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentVaultTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "createInbox",
      "discriminator": [
        217,
        134,
        249,
        100,
        35,
        95,
        26,
        130
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "params.id"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "inboxBody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  95,
                  98,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        },
        {
          "name": "inboxMetadata",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        },
        {
          "name": "paymentMint",
          "writable": true,
          "optional": true
        },
        {
          "name": "paymentTokenAccount",
          "optional": true
        },
        {
          "name": "paymentEscrowTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "inbox"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentVaultTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "createInboxMetadata",
      "discriminator": [
        73,
        222,
        146,
        151,
        48,
        185,
        195,
        224
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true
        },
        {
          "name": "inboxMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "inboxMetadataFields"
            }
          }
        }
      ]
    },
    {
      "name": "createKey",
      "discriminator": [
        176,
        81,
        20,
        95,
        41,
        237,
        96,
        126
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createKeyParams"
            }
          }
        }
      ]
    },
    {
      "name": "createPermit",
      "discriminator": [
        115,
        112,
        27,
        231,
        45,
        228,
        206,
        52
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.operator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createPermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "createPermitWithEd25519Permit",
      "discriminator": [
        11,
        211,
        213,
        44,
        145,
        93,
        248,
        68
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.owner"
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.operator"
              }
            ]
          }
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createPermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "createThread",
      "discriminator": [
        182,
        223,
        64,
        3,
        133,
        33,
        204,
        26
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "targetInbox",
          "writable": true,
          "optional": true
        },
        {
          "name": "targetInboxBody",
          "writable": true,
          "optional": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "paymentMint",
          "optional": true
        },
        {
          "name": "tokenProgram",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "to",
          "type": "pubkey"
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createThreadParams"
            }
          }
        }
      ]
    },
    {
      "name": "createUser",
      "discriminator": [
        108,
        227,
        130,
        130,
        252,
        109,
        75,
        218
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createUserParams"
            }
          }
        }
      ]
    },
    {
      "name": "deleteInboxMetadata",
      "discriminator": [
        32,
        243,
        37,
        94,
        26,
        171,
        83,
        229
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true
        },
        {
          "name": "inboxMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "editInboxPayment",
      "discriminator": [
        163,
        144,
        131,
        128,
        116,
        129,
        18,
        50
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "targetInbox",
          "writable": true
        },
        {
          "name": "paymentMint",
          "writable": true,
          "optional": true
        },
        {
          "name": "paymentTokenAccount",
          "optional": true
        },
        {
          "name": "paymentEscrowTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "targetInbox"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentVaultTokenAccount",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "editInboxPaymentParams"
            }
          }
        }
      ]
    },
    {
      "name": "editKey",
      "discriminator": [
        98,
        44,
        180,
        169,
        33,
        42,
        65,
        77
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "editKeyParams"
            }
          }
        }
      ]
    },
    {
      "name": "editUser",
      "discriminator": [
        154,
        159,
        198,
        79,
        53,
        229,
        58,
        80
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "editUserParams"
            }
          }
        }
      ]
    },
    {
      "name": "extendPermit",
      "discriminator": [
        142,
        226,
        246,
        239,
        127,
        2,
        33,
        5
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "permit"
          ]
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.operator"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "extendPermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "extendPermitWithEd25519Permit",
      "discriminator": [
        233,
        88,
        19,
        196,
        196,
        91,
        79,
        233
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.owner"
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.operator"
              }
            ]
          }
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "extendPermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "revokePermit",
      "discriminator": [
        1,
        245,
        99,
        29,
        176,
        216,
        229,
        206
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true,
          "relations": [
            "permit"
          ]
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "permit.operator",
                "account": "permit"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "revokePermitWithEd25519Permit",
      "discriminator": [
        50,
        150,
        136,
        126,
        0,
        150,
        107,
        209
      ],
      "accounts": [
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "permit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.owner"
              },
              {
                "kind": "arg",
                "path": "params.ed25519_permit.operator"
              }
            ]
          }
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "revokePermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "roomAddMember",
      "discriminator": [
        139,
        246,
        174,
        26,
        222,
        35,
        186,
        220
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "roomAddMemberParams"
            }
          }
        }
      ]
    },
    {
      "name": "roomCreate",
      "discriminator": [
        83,
        227,
        75,
        208,
        168,
        171,
        117,
        249
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "paramsId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "paramsRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "roomPublishHeader",
      "discriminator": [
        132,
        57,
        42,
        234,
        129,
        183,
        166,
        9
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "roomPublishHeaderParams"
            }
          }
        }
      ]
    },
    {
      "name": "roomReinitRoot",
      "discriminator": [
        127,
        37,
        144,
        3,
        102,
        78,
        112,
        149
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "roomRemoveMember",
      "discriminator": [
        50,
        69,
        1,
        243,
        156,
        18,
        91,
        71
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "roomRemoveMemberParams"
            }
          }
        }
      ]
    },
    {
      "name": "roomSendMessage",
      "discriminator": [
        242,
        169,
        32,
        201,
        14,
        3,
        59,
        154
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "roomSendMessageParams"
            }
          }
        }
      ]
    },
    {
      "name": "roomStageRecipientPage",
      "discriminator": [
        77,
        154,
        223,
        116,
        226,
        212,
        245,
        23
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  111,
                  109
                ]
              },
              {
                "kind": "arg",
                "path": "roomId"
              }
            ]
          }
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "roomId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "roomStageRecipientPageParams"
            }
          }
        }
      ]
    },
    {
      "name": "sendMsg",
      "discriminator": [
        78,
        190,
        95,
        244,
        10,
        26,
        126,
        148
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "targetInbox",
          "writable": true,
          "optional": true
        },
        {
          "name": "targetInboxBody",
          "writable": true,
          "optional": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107,
                  101,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "paymentMint",
          "optional": true
        },
        {
          "name": "tokenProgram",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "receiver",
          "type": "pubkey"
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "sendMsgParams"
            }
          }
        }
      ]
    },
    {
      "name": "updateInboxMetadata",
      "discriminator": [
        79,
        191,
        199,
        22,
        178,
        130,
        140,
        135
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true
        },
        {
          "name": "inboxMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "inbox"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "inboxMetadataFields"
            }
          }
        }
      ]
    },
    {
      "name": "withdrawEscrowPayment",
      "discriminator": [
        51,
        26,
        74,
        46,
        66,
        12,
        89,
        112
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "permit",
          "optional": true
        },
        {
          "name": "inbox",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  98,
                  111,
                  120
                ]
              },
              {
                "kind": "arg",
                "path": "params.current_thread.inbox_id"
              },
              {
                "kind": "arg",
                "path": "params.current_thread.to"
              }
            ]
          }
        },
        {
          "name": "escrowTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "inbox"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawEscrowParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agentAccount",
      "discriminator": [
        241,
        119,
        69,
        140,
        233,
        9,
        112,
        50
      ]
    },
    {
      "name": "inbox",
      "discriminator": [
        41,
        120,
        76,
        139,
        162,
        162,
        166,
        244
      ]
    },
    {
      "name": "inboxBody",
      "discriminator": [
        202,
        169,
        42,
        166,
        150,
        18,
        232,
        141
      ]
    },
    {
      "name": "inboxMetadata",
      "discriminator": [
        252,
        171,
        1,
        159,
        26,
        25,
        227,
        56
      ]
    },
    {
      "name": "packetVault",
      "discriminator": [
        175,
        201,
        131,
        95,
        152,
        126,
        38,
        71
      ]
    },
    {
      "name": "permit",
      "discriminator": [
        219,
        195,
        186,
        174,
        197,
        232,
        83,
        160
      ]
    },
    {
      "name": "room",
      "discriminator": [
        156,
        199,
        67,
        27,
        222,
        23,
        185,
        94
      ]
    },
    {
      "name": "user",
      "discriminator": [
        159,
        117,
        95,
        227,
        239,
        151,
        58,
        236
      ]
    }
  ],
  "events": [
    {
      "name": "escrowApproved",
      "discriminator": [
        87,
        181,
        230,
        68,
        208,
        43,
        121,
        31
      ]
    },
    {
      "name": "escrowWithdrawn",
      "discriminator": [
        43,
        206,
        174,
        47,
        105,
        219,
        216,
        239
      ]
    },
    {
      "name": "inboxArchive",
      "discriminator": [
        84,
        181,
        242,
        197,
        180,
        108,
        118,
        58
      ]
    },
    {
      "name": "message",
      "discriminator": [
        254,
        153,
        196,
        121,
        136,
        47,
        235,
        156
      ]
    },
    {
      "name": "messageSent",
      "discriminator": [
        116,
        70,
        224,
        76,
        128,
        28,
        110,
        55
      ]
    },
    {
      "name": "roomCreated",
      "discriminator": [
        9,
        177,
        128,
        166,
        26,
        19,
        14,
        243
      ]
    },
    {
      "name": "roomEpochHeader",
      "discriminator": [
        187,
        42,
        102,
        246,
        93,
        231,
        151,
        171
      ]
    },
    {
      "name": "roomEraReset",
      "discriminator": [
        84,
        69,
        220,
        115,
        1,
        244,
        53,
        175
      ]
    },
    {
      "name": "roomHeaderPublished",
      "discriminator": [
        168,
        205,
        26,
        116,
        105,
        216,
        245,
        136
      ]
    },
    {
      "name": "roomMember",
      "discriminator": [
        127,
        146,
        39,
        153,
        243,
        115,
        198,
        230
      ]
    },
    {
      "name": "roomMemberAdded",
      "discriminator": [
        20,
        172,
        66,
        42,
        192,
        130,
        129,
        223
      ]
    },
    {
      "name": "roomMemberRemoved",
      "discriminator": [
        152,
        223,
        204,
        248,
        73,
        103,
        8,
        41
      ]
    },
    {
      "name": "roomMessage",
      "discriminator": [
        193,
        164,
        21,
        31,
        137,
        6,
        145,
        241
      ]
    },
    {
      "name": "roomMessageSent",
      "discriminator": [
        231,
        141,
        18,
        93,
        109,
        182,
        171,
        233
      ]
    },
    {
      "name": "roomRecipientPage",
      "discriminator": [
        146,
        123,
        172,
        203,
        233,
        176,
        244,
        51
      ]
    },
    {
      "name": "roomRecipientPageStaged",
      "discriminator": [
        188,
        209,
        130,
        126,
        92,
        18,
        148,
        164
      ]
    },
    {
      "name": "thread",
      "discriminator": [
        53,
        2,
        66,
        100,
        119,
        114,
        186,
        12
      ]
    },
    {
      "name": "userDecryptionKey",
      "discriminator": [
        165,
        135,
        255,
        150,
        85,
        133,
        11,
        181
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6001,
      "name": "invalidKey",
      "msg": "Invalid key"
    },
    {
      "code": 6002,
      "name": "invalidInstruction",
      "msg": "Invalid instruction"
    },
    {
      "code": 6003,
      "name": "permitRequired",
      "msg": "Permit required"
    },
    {
      "code": 6004,
      "name": "invalidPermit",
      "msg": "Invalid permit"
    },
    {
      "code": 6005,
      "name": "permitExpired",
      "msg": "Permit expired"
    },
    {
      "code": 6006,
      "name": "invalidOperator",
      "msg": "Invalid operator"
    },
    {
      "code": 6007,
      "name": "invalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6008,
      "name": "invalidReceiver",
      "msg": "Invalid receiver"
    },
    {
      "code": 6009,
      "name": "missingEd25519Instruction",
      "msg": "Missing Ed25519 instruction"
    },
    {
      "code": 6010,
      "name": "invalidEd25519Instruction",
      "msg": "Invalid Ed25519 instruction"
    },
    {
      "code": 6011,
      "name": "invalidPermitSigner",
      "msg": "Invalid permit signer"
    },
    {
      "code": 6012,
      "name": "invalidPermitMessage",
      "msg": "Invalid permit message"
    },
    {
      "code": 6013,
      "name": "paymentRequired",
      "msg": "Payment required"
    },
    {
      "code": 6014,
      "name": "paymentMintRequired",
      "msg": "Payment mint required"
    },
    {
      "code": 6015,
      "name": "invalidPayment",
      "msg": "Invalid payment"
    },
    {
      "code": 6016,
      "name": "invalidPaymentAmount",
      "msg": "Invalid payment amount"
    },
    {
      "code": 6017,
      "name": "invalidPaymentMint",
      "msg": "Invalid payment mint"
    },
    {
      "code": 6018,
      "name": "invalidPaymentDestination",
      "msg": "Invalid payment destination"
    },
    {
      "code": 6019,
      "name": "paymentAccountsMissing",
      "msg": "Payment accounts missing"
    },
    {
      "code": 6020,
      "name": "invalidPaymentAccounts",
      "msg": "Invalid payment accounts"
    },
    {
      "code": 6021,
      "name": "invalidPaymentWallFee",
      "msg": "Invalid payment wall fee bps"
    },
    {
      "code": 6022,
      "name": "escrowNotFound",
      "msg": "Escrow not found"
    },
    {
      "code": 6023,
      "name": "escrowAlreadyReleased",
      "msg": "Escrow already released"
    },
    {
      "code": 6024,
      "name": "escrowNotApproved",
      "msg": "Escrow not approved"
    },
    {
      "code": 6025,
      "name": "escrowNotReleasable",
      "msg": "Escrow not releasable"
    },
    {
      "code": 6026,
      "name": "inboxCorrupted",
      "msg": "Inbox corrupted"
    },
    {
      "code": 6027,
      "name": "invalidInboxKind",
      "msg": "Invalid inbox kind"
    },
    {
      "code": 6028,
      "name": "invalidInboxId",
      "msg": "Invalid inbox id"
    },
    {
      "code": 6029,
      "name": "invalidTargetInboxOwner",
      "msg": "Invalid target inbox owner"
    },
    {
      "code": 6030,
      "name": "invalidTargetInbox",
      "msg": "Invalid target inbox"
    },
    {
      "code": 6031,
      "name": "targetInboxRequired",
      "msg": "Target inbox required"
    },
    {
      "code": 6032,
      "name": "targetInboxNotAllowedForSelfThread",
      "msg": "Target inbox not allowed for self-thread"
    },
    {
      "code": 6033,
      "name": "inboxNotFull",
      "msg": "Inbox body not full"
    },
    {
      "code": 6034,
      "name": "inboxNeedsArchival",
      "msg": "Inbox needs archival"
    },
    {
      "code": 6035,
      "name": "msgPlusArchiveParamsRequired",
      "msg": "Msg plus archive params required or do separate archive inbox instruction"
    },
    {
      "code": 6036,
      "name": "invalidThreadId",
      "msg": "Invalid thread id"
    },
    {
      "code": 6037,
      "name": "invalidThread",
      "msg": "Invalid thread"
    },
    {
      "code": 6038,
      "name": "invalidActivityMint",
      "msg": "Invalid activity mint"
    },
    {
      "code": 6039,
      "name": "invalidActivitySegmentMetadata",
      "msg": "Invalid activity segment metadata"
    },
    {
      "code": 6040,
      "name": "duplicateActivitySegmentMetadata",
      "msg": "Duplicate activity segment metadata"
    },
    {
      "code": 6041,
      "name": "missingActivitySegmentMetadata",
      "msg": "Missing activity segment metadata"
    },
    {
      "code": 6042,
      "name": "missingActivityUpdateProof",
      "msg": "Missing activity update proof"
    },
    {
      "code": 6043,
      "name": "agentIdentityNotLinkedToOwner",
      "msg": "Agent identity account needs to have `agent_wallet` field set to owner wallet to be used as agent"
    },
    {
      "code": 6044,
      "name": "invalidAgentIdentity",
      "msg": "Invalid agent identity"
    },
    {
      "code": 6045,
      "name": "invalidEpoch",
      "msg": "Invalid epoch"
    },
    {
      "code": 6046,
      "name": "invalidRecipientMode",
      "msg": "Invalid recipient mode"
    },
    {
      "code": 6047,
      "name": "invalidMemberSlot",
      "msg": "Invalid member slot"
    },
    {
      "code": 6048,
      "name": "invalidMember",
      "msg": "Invalid member"
    },
    {
      "code": 6049,
      "name": "invalidMemberAccount",
      "msg": "Invalid member account"
    },
    {
      "code": 6050,
      "name": "inactiveMember",
      "msg": "Inactive member"
    },
    {
      "code": 6051,
      "name": "mutationRequiresHeader",
      "msg": "Mutation requires the previous mutation to be covered by a header"
    },
    {
      "code": 6052,
      "name": "publicationOpen",
      "msg": "A staged publication is open"
    },
    {
      "code": 6053,
      "name": "publicationNotOpen",
      "msg": "No staged publication is open"
    },
    {
      "code": 6054,
      "name": "pendingPagesIncomplete",
      "msg": "Staged pages incomplete"
    },
    {
      "code": 6055,
      "name": "recipientCheckpointRequired",
      "msg": "Recipient checkpoint required"
    },
    {
      "code": 6056,
      "name": "invalidRecipientDescriptor",
      "msg": "Invalid recipient descriptor"
    },
    {
      "code": 6057,
      "name": "descriptorTooLarge",
      "msg": "Descriptor too large"
    },
    {
      "code": 6058,
      "name": "invalidDescriptorKind",
      "msg": "Invalid descriptor kind"
    },
    {
      "code": 6059,
      "name": "invalidRecipientEncoding",
      "msg": "Invalid recipient encoding"
    },
    {
      "code": 6060,
      "name": "invalidDeltaOp",
      "msg": "Invalid delta op"
    },
    {
      "code": 6061,
      "name": "invalidStateTransition",
      "msg": "Invalid recipient state transition"
    },
    {
      "code": 6062,
      "name": "memberNotInActiveHeader",
      "msg": "Member not covered by the latest activated header"
    },
    {
      "code": 6063,
      "name": "invalidChainBreak",
      "msg": "Invalid chain break"
    },
    {
      "code": 6064,
      "name": "invalidPageIndex",
      "msg": "Invalid page index"
    },
    {
      "code": 6065,
      "name": "pageTooLarge",
      "msg": "Page too large"
    },
    {
      "code": 6066,
      "name": "sendEpochChanged",
      "msg": "Room epoch changed while the message was in flight"
    },
    {
      "code": 6067,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "agentAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collection",
            "docs": [
              "Collection this agent belongs to (offset 8 - for filtering)"
            ],
            "type": "pubkey"
          },
          {
            "name": "creator",
            "docs": [
              "Immutable creator snapshot at registration time"
            ],
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "Agent owner (cached from Core asset)"
            ],
            "type": "pubkey"
          },
          {
            "name": "asset",
            "docs": [
              "Metaplex Core asset address (unique identifier)"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "atomEnabled",
            "docs": [
              "ATOM Engine enabled (irreversible once set to true)"
            ],
            "type": "bool"
          },
          {
            "name": "agentWallet",
            "docs": [
              "Agent's operational wallet (set via Ed25519 signature verification)",
              "None = no wallet set, Some = wallet address"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "feedbackDigest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedbackCount",
            "type": "u64"
          },
          {
            "name": "responseDigest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "responseCount",
            "type": "u64"
          },
          {
            "name": "revokeDigest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "revokeCount",
            "type": "u64"
          },
          {
            "name": "parentAsset",
            "docs": [
              "Parent asset link (optional, first-write-wins when locked)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "parentLocked",
            "docs": [
              "Parent link lock (once true, parent cannot be modified)"
            ],
            "type": "bool"
          },
          {
            "name": "colLocked",
            "docs": [
              "Collection pointer lock (once true, collection pointer cannot be modified)"
            ],
            "type": "bool"
          },
          {
            "name": "agentUri",
            "docs": [
              "Agent URI (IPFS/Arweave/HTTP link, max 250 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "nftName",
            "docs": [
              "NFT name (e.g., \"Agent #123\", max 32 bytes)",
              "Kept to avoid extra RPC to Metaplex for display"
            ],
            "type": "string"
          },
          {
            "name": "col",
            "docs": [
              "Canonical collection pointer: c1:<cid_norm>"
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "approveEscrowParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "Proof for the current compressed Thread input and updated Thread output."
            ],
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "threadAccountMeta",
            "type": {
              "defined": {
                "name": "compressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "currentThread",
            "type": {
              "defined": {
                "name": "thread"
              }
            }
          }
        ]
      }
    },
    {
      "name": "archiveInboxParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAccountsProof",
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "optional",
            "docs": [
              "If optional, returns Ok(()) when the inbox body is not full."
            ],
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "cOption",
      "repr": {
        "kind": "transparent"
      },
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inner",
            "type": {
              "defined": {
                "name": "cOptionRepr",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "generic": "t"
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "cOptionRepr",
      "docs": [
        "A custom Option type that is compatible with zero-copy deserialization and can be used in Anchor accounts.",
        "The `tag` field indicates whether the option is `Some` or `None`, and the `value` field holds the actual value when `Some`."
      ],
      "repr": {
        "kind": "c"
      },
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tag",
            "docs": [
              "[0,0,0,0] = None, [1,0,0,0] = Some"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "pad",
            "docs": [
              "explicit padding so `value` stays 8-byte aligned"
            ],
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "value",
            "type": {
              "generic": "t"
            }
          }
        ]
      }
    },
    {
      "name": "compressedAccountMetaPacket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treeInfo",
            "docs": [
              "Merkle tree context."
            ],
            "type": {
              "defined": {
                "name": "packedStateTreeInfo"
              }
            }
          },
          {
            "name": "outputStateTreeIndex",
            "docs": [
              "Output merkle tree index."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "compressedAccountUpdateInfo",
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treeInfo",
            "type": {
              "defined": {
                "name": "packedStateTreeInfo"
              }
            }
          },
          {
            "name": "accountData",
            "type": {
              "generic": "t"
            }
          }
        ]
      }
    },
    {
      "name": "compressedAccountsProof",
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "The validity proof."
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "addressTreeInfo",
            "docs": [
              "Single packed address tree info (all accounts use same tree)."
            ],
            "type": {
              "defined": {
                "name": "packedAddressTreeInfo"
              }
            }
          },
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset in remaining_accounts where Light system accounts start."
            ],
            "type": "u8"
          },
          {
            "name": "outputStateTreeIndex",
            "docs": [
              "Output merkle tree index."
            ],
            "type": "u8"
          },
          {
            "name": "update",
            "docs": [
              "updated account info to return to the client."
            ],
            "type": {
              "defined": {
                "name": "compressedAccountUpdateInfo",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "generic": "t"
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "compressedAccountsProofOptionalUpdate",
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "The validity proof."
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "addressTreeInfo",
            "docs": [
              "Single packed address tree info (all accounts use same tree)."
            ],
            "type": {
              "defined": {
                "name": "packedAddressTreeInfo"
              }
            }
          },
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset in remaining_accounts where Light system accounts start."
            ],
            "type": "u8"
          },
          {
            "name": "outputStateTreeIndex",
            "docs": [
              "Output merkle tree index."
            ],
            "type": "u8"
          },
          {
            "name": "update",
            "docs": [
              "Optional updated account info to return to the client."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "compressedAccountUpdateInfo",
                  "generics": [
                    {
                      "kind": "type",
                      "type": {
                        "generic": "t"
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "compressedCreateAccountsProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "The validity proof."
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "addressTreeInfo",
            "docs": [
              "Single packed address tree info (all accounts use same tree)."
            ],
            "type": {
              "defined": {
                "name": "packedAddressTreeInfo"
              }
            }
          },
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset in remaining_accounts where Light system accounts start."
            ],
            "type": "u8"
          },
          {
            "name": "outputStateTreeIndex",
            "docs": [
              "Output merkle tree index."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "compressedProof",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "b",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "c",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "createAccountsProof",
      "docs": [
        "Proof data for instruction params when creating new compressed accounts.",
        "Used in the INIT flow - pass directly to instruction data.",
        "All accounts use the same address tree, so only one `address_tree_info` is needed."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "The validity proof."
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "addressTreeInfo",
            "docs": [
              "Single packed address tree info (all accounts use same tree)."
            ],
            "type": {
              "defined": {
                "name": "packedAddressTreeInfo"
              }
            }
          },
          {
            "name": "outputStateTreeIndex",
            "docs": [
              "Output state tree index for new compressed accounts."
            ],
            "type": "u8"
          },
          {
            "name": "stateTreeIndex",
            "docs": [
              "State merkle tree index (needed for mint creation decompress validation).",
              "This is optional to maintain backwards compatibility."
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset in remaining_accounts where Light system accounts start."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "createInboxParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "metadata",
            "type": {
              "option": {
                "defined": {
                  "name": "inboxMetadataFields"
                }
              }
            }
          },
          {
            "name": "paymentRule",
            "type": {
              "option": {
                "defined": {
                  "name": "paymentRuleInput"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "createKeyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAccountsProof",
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "keyType",
            "type": {
              "option": {
                "defined": {
                  "name": "keyType"
                }
              }
            }
          },
          {
            "name": "key",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "createPermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "expiresAt",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "createPermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519Permit",
            "type": {
              "defined": {
                "name": "ed25519Permit"
              }
            }
          }
        ]
      }
    },
    {
      "name": "createThreadParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAccountsProof",
            "docs": [
              "Proof for new compressed Thread at assigned address 0 and Message at assigned address 1."
            ],
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "threadId",
            "type": "u32"
          },
          {
            "name": "message",
            "type": {
              "defined": {
                "name": "messageInput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "createUserParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "createVaultParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentWallFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "ed25519Permit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "expiresAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "programId",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "editInboxPaymentParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentRule",
            "type": {
              "option": {
                "defined": {
                  "name": "paymentRuleInput"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "editKeyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAccountsProof",
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "accountMeta",
            "type": {
              "defined": {
                "name": "compressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "currentKeyType",
            "type": {
              "defined": {
                "name": "keyType"
              }
            }
          },
          {
            "name": "currentKey",
            "type": "bytes"
          },
          {
            "name": "newKeyType",
            "type": {
              "option": {
                "defined": {
                  "name": "keyType"
                }
              }
            }
          },
          {
            "name": "newKey",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "editUserParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "escrow",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "releaseSeconds",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrowApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "threadId",
            "type": "u32"
          },
          {
            "name": "approver",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "escrowWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "threadId",
            "type": "u32"
          },
          {
            "name": "receiver",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "extendPermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "newExpiresAt",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "extendPermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519Permit",
            "type": {
              "defined": {
                "name": "ed25519Permit"
              }
            }
          },
          {
            "name": "newExpiresAt",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "inbox",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "kind",
            "docs": [
              "[Kind](InboxKind) of the inbox."
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Padding to make the next field 8-byte aligned."
            ],
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "version",
            "docs": [
              "Version of the account."
            ],
            "type": "u16"
          },
          {
            "name": "owner",
            "docs": [
              "Owner of the inbox"
            ],
            "type": "pubkey"
          },
          {
            "name": "id",
            "docs": [
              "Unique identifier for the inbox. The combination of (owner, id) must be unique."
            ],
            "type": "u64"
          },
          {
            "name": "index",
            "docs": [
              "Index of the inbox page.",
              "- when [InboxKind] is Ephemeral, index is always 0.",
              "- When [InboxKind] is Standard, index starts from 0 and increments by 1 when the current page is full."
            ],
            "type": "u64"
          },
          {
            "name": "len",
            "docs": [
              "Number of threads in the current inbox.",
              "- when [InboxKind] is Ephemeral, len is total threads ever created.",
              "- When [InboxKind] is Standard, len is number of threads in the current page."
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "Timestamp of the last update to the inbox.(received threads only)"
            ],
            "type": "i64"
          },
          {
            "name": "paymentRule",
            "docs": [
              "(Optional) payment wall for the inbox."
            ],
            "type": {
              "defined": {
                "name": "cOption",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "paymentRule"
                      }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "inboxArchive",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "raw",
            "type": {
              "defined": {
                "name": "segment",
                "generics": [
                  {
                    "kind": "const",
                    "value": "192"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "inboxBody",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "raw",
            "type": {
              "defined": {
                "name": "segment",
                "generics": [
                  {
                    "kind": "const",
                    "value": "384"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "inboxMetadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inbox",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "inboxMetadataFields",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "keyType",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "x25519"
          },
          {
            "name": "secp256k1"
          },
          {
            "name": "ed25519WalletDerivedX25519"
          },
          {
            "name": "other",
            "fields": [
              "u16"
            ]
          }
        ]
      }
    },
    {
      "name": "message",
      "docs": [
        "Message content pointer/payload stored as a compressed account.",
        "",
        "Address derivation: `[\"msg\", thread_id, msg_seq]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "threadId",
            "type": "u32"
          },
          {
            "name": "msgSeq",
            "type": "u32"
          },
          {
            "name": "senderSide",
            "docs": [
              "0 = thread.from, 1 = thread.to."
            ],
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "payment",
            "type": {
              "option": {
                "defined": {
                  "name": "payment"
                }
              }
            }
          },
          {
            "name": "messageType",
            "type": {
              "defined": {
                "name": "messageType"
              }
            }
          },
          {
            "name": "content",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "messageInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "messageType",
            "type": {
              "defined": {
                "name": "messageType"
              }
            }
          },
          {
            "name": "content",
            "type": "bytes"
          },
          {
            "name": "payment",
            "docs": [
              "amount input only.",
              "mint and to token accounts derived from accounts"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "messageSent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "threadId",
            "type": "u32"
          },
          {
            "name": "msgSeq",
            "type": "u32"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "messageType",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "text"
          },
          {
            "name": "url"
          },
          {
            "name": "ipfs"
          },
          {
            "name": "irys"
          },
          {
            "name": "arweave"
          },
          {
            "name": "packetChat"
          },
          {
            "name": "other",
            "fields": [
              "u16"
            ]
          }
        ]
      }
    },
    {
      "name": "packedAddressTreeInfo",
      "docs": [
        "Packed address tree info for instruction data.",
        "Contains indices to address tree accounts and root index."
      ],
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addressMerkleTreePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "addressQueuePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "rootIndex",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "packedStateTreeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rootIndex",
            "type": "u16"
          },
          {
            "name": "proveByIndex",
            "type": "bool"
          },
          {
            "name": "merkleTreePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "queuePubkeyIndex",
            "type": "u8"
          },
          {
            "name": "leafIndex",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "packetVault",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paymentWallFeeBps",
            "type": "u16"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "payment",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "paymentRule",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inner",
            "type": {
              "defined": {
                "name": "payment"
              }
            }
          },
          {
            "name": "escrow",
            "type": {
              "defined": {
                "name": "cOption",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "escrow"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "tokenProgram",
            "docs": [
              "0 = SPL Token Program, 1 = Token-2022."
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          }
        ]
      }
    },
    {
      "name": "paymentRuleInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inner",
            "type": {
              "defined": {
                "name": "payment"
              }
            }
          },
          {
            "name": "escrowEnabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "permit",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "expiresAt",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "revokePermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519Permit",
            "type": {
              "defined": {
                "name": "ed25519Permit"
              }
            }
          }
        ]
      }
    },
    {
      "name": "room",
      "docs": [
        "Room PDA. Fields are grouped by alignment (u64s, u32s, u16s, u8s, explicit",
        "padding, then 32-byte arrays) so there are no implicit pad bytes; the layout",
        "is pinned by the compile-time size assertion below."
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "Version of the account."
            ],
            "type": "u16"
          },
          {
            "name": "padding0",
            "docs": [
              "Padding to make the next field 8-byte aligned."
            ],
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "admin",
            "docs": [
              "Admin of the room."
            ],
            "type": "pubkey"
          },
          {
            "name": "era",
            "docs": [
              "Room generation. Era 0 is the original room. A poisoned room can be",
              "reset (`room_reinit_root`) to a fresh root state; each reset bumps `era`.",
              "`era` is folded into every room compressed-account address seed",
              "(header / member / message / page), so a new era gets a clean,",
              "never-used compressed-address namespace while the room PDA / `room_id`",
              "(the room identity) stay the same."
            ],
            "type": "u64"
          },
          {
            "name": "globalLen",
            "docs": [
              "Total messages sent (last assigned global_seq)."
            ],
            "type": "u64"
          },
          {
            "name": "currentEpoch",
            "docs": [
              "Current BGW crypto epoch. Increments only when an EpochHeader is",
              "published (activation)."
            ],
            "type": "u64"
          },
          {
            "name": "memberVersion",
            "docs": [
              "Increments on every membership mutation."
            ],
            "type": "u64"
          },
          {
            "name": "latestHeaderMemberVersion",
            "docs": [
              "Member version covered by the latest activated header."
            ],
            "type": "u64"
          },
          {
            "name": "recipientCheckpointEpoch",
            "docs": [
              "Epoch of the last recipient checkpoint (root chain anchor)."
            ],
            "type": "u64"
          },
          {
            "name": "chainStartEpoch",
            "docs": [
              "Epoch where the current key-chain segment began."
            ],
            "type": "u64"
          },
          {
            "name": "pendingEpoch",
            "docs": [
              "Epoch of the open staged publication (current_epoch + 1 while open)."
            ],
            "type": "u64"
          },
          {
            "name": "currentBucket",
            "docs": [
              "Message ordering state."
            ],
            "type": "u32"
          },
          {
            "name": "nextSlot",
            "docs": [
              "1-based next member slot."
            ],
            "type": "u32"
          },
          {
            "name": "recipientExplicitCount",
            "docs": [
              "Explicit slot count of the current recipient state."
            ],
            "type": "u32"
          },
          {
            "name": "recipientAssignedUntilSlot",
            "docs": [
              "Highest slot ever activated (recipient chain mirror)."
            ],
            "type": "u32"
          },
          {
            "name": "recipientDeltaDepth",
            "docs": [
              "Delta depth since the last checkpoint."
            ],
            "type": "u16"
          },
          {
            "name": "pendingPagesTotal",
            "docs": [
              "Total pages of the open staged publication."
            ],
            "type": "u16"
          },
          {
            "name": "pendingPagesDone",
            "docs": [
              "Pages staged so far for the open publication."
            ],
            "type": "u16"
          },
          {
            "name": "currentBucketLen",
            "type": "u8"
          },
          {
            "name": "recipientMode",
            "docs": [
              "RecipientMode of the current recipient state."
            ],
            "type": "u8"
          },
          {
            "name": "recipientEncoding",
            "docs": [
              "RecipientEncoding of the last checkpoint."
            ],
            "type": "u8"
          },
          {
            "name": "publicationOpen",
            "docs": [
              "1 while a staged (two-phase) publication is open."
            ],
            "type": "u8"
          },
          {
            "name": "padding1",
            "docs": [
              "Padding to make the following 32-byte array block 8-byte aligned."
            ],
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "roomId",
            "docs": [
              "Unique identifier for the room. Can be derived from external data by clients."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "latestHeaderHash",
            "docs": [
              "Latest EpochHeader hash (domain \"xpkt-bgw-epoch-header-v2\")."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "paramsId",
            "docs": [
              "Global params artifact identity."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "paramsRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recipientStateRoot",
            "docs": [
              "Current recipient root-chain state root."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pendingPagesHash",
            "docs": [
              "Running page chain hash of the open staged publication."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roomAddMemberParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "type": {
              "defined": {
                "name": "compressedAccountsProofOptionalUpdate",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "roomMember"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "bgwMemberSecret",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "paramsId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "paramsRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roomEpochHeader",
      "docs": [
        "Activated BGW epoch header.",
        "",
        "Address derivation: `[\"room-header\", room, epoch_le]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "memberVersion",
            "type": "u64"
          },
          {
            "name": "headerBindingRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "descriptorKind",
            "docs": [
              "[RecipientDescriptorKind]."
            ],
            "type": "u8"
          },
          {
            "name": "recipientMode",
            "docs": [
              "[RecipientMode] of the state after this header."
            ],
            "type": "u8"
          },
          {
            "name": "recipientEncoding",
            "docs": [
              "[RecipientEncoding] for checkpoints; Empty for Reuse/Delta."
            ],
            "type": "u8"
          },
          {
            "name": "deltaOp",
            "docs": [
              "[RecipientDeltaOp]; None unless `descriptor_kind` is Delta."
            ],
            "type": "u8"
          },
          {
            "name": "deltaSlot",
            "docs": [
              "0 unless `descriptor_kind` is Delta."
            ],
            "type": "u32"
          },
          {
            "name": "deltaDepth",
            "docs": [
              "Delta depth after this header; 0 for checkpoints."
            ],
            "type": "u16"
          },
          {
            "name": "assignedUntilSlot",
            "type": "u32"
          },
          {
            "name": "explicitCount",
            "type": "u32"
          },
          {
            "name": "chainStartEpoch",
            "type": "u64"
          },
          {
            "name": "recipientStateRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "headerHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "descriptorBytes",
            "docs": [
              "Inline checkpoint payload; pages hash (32B) for External; empty for Reuse/Delta."
            ],
            "type": "bytes"
          },
          {
            "name": "headerBytes",
            "docs": [
              "Opaque BGW core and wrapped chain key (client-defined)."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomEraReset",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "era",
            "docs": [
              "The new era. The previous era's compressed accounts are abandoned."
            ],
            "type": "u64"
          },
          {
            "name": "admin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "roomHeaderPublished",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "headerAddress",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "memberVersion",
            "type": "u64"
          },
          {
            "name": "descriptorKind",
            "type": "u8"
          },
          {
            "name": "recipientMode",
            "type": "u8"
          },
          {
            "name": "chainStartEpoch",
            "type": "u64"
          },
          {
            "name": "chainBreak",
            "type": "bool"
          },
          {
            "name": "headerHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roomMember",
      "docs": [
        "Membership of a room owner.",
        "",
        "Address derivation: `[\"room-member\", room, era, owner]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "status",
            "docs": [
              "0 = active, 1 = removed."
            ],
            "type": "u8"
          },
          {
            "name": "slot",
            "type": "u32"
          },
          {
            "name": "joinedMemberVersion",
            "docs": [
              "Member version of the mutation that created or last re-activated this",
              "member. The member may only send while",
              "`joined_member_version <= room.latest_header_member_version`."
            ],
            "type": "u64"
          },
          {
            "name": "era",
            "docs": [
              "Room generation (`room.era`) this membership belongs to. Kept in the",
              "account data (not only the address seed) at a FIXED offset (87) so a",
              "Photon memcmp can filter members by era directly — making the room-wide",
              "member scan era-correct after a `room_reinit_root` reset. Set on create;",
              "re-activation (`activate`) stays in the same era and does not touch it."
            ],
            "type": "u64"
          },
          {
            "name": "secret",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomMemberAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "memberRoomAccount",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u32"
          },
          {
            "name": "memberVersion",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "roomMemberRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "memberRoomAccount",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u32"
          },
          {
            "name": "memberVersion",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "roomMessage",
      "docs": [
        "Room chat message stored as a compressed account.",
        "",
        "Address derivation: `[\"room-message\", room, client_msg_id]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "room",
            "docs": [
              "Room PDA this message belongs to. Kept in the account data (not only the",
              "address seeds) to allow memcmp filtering by room and bucket."
            ],
            "type": "pubkey"
          },
          {
            "name": "cryptoEpoch",
            "type": "u64"
          },
          {
            "name": "globalSeq",
            "type": "u64"
          },
          {
            "name": "bucket",
            "type": "u32"
          },
          {
            "name": "bucketIndex",
            "type": "u8"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "memberSlot",
            "type": "u32"
          },
          {
            "name": "clientMsgId",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "messageType",
            "type": {
              "defined": {
                "name": "messageType"
              }
            }
          },
          {
            "name": "content",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomMessageSent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "messageAddress",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "roomPublishHeaderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "type": {
              "defined": {
                "name": "compressedCreateAccountsProof"
              }
            }
          },
          {
            "name": "epoch",
            "docs": [
              "Must be `room.current_epoch + 1`."
            ],
            "type": "u64"
          },
          {
            "name": "memberVersion",
            "type": "u64"
          },
          {
            "name": "headerBindingRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "descriptorKind",
            "type": "u8"
          },
          {
            "name": "recipientMode",
            "type": "u8"
          },
          {
            "name": "recipientEncoding",
            "type": "u8"
          },
          {
            "name": "deltaOp",
            "type": "u8"
          },
          {
            "name": "deltaSlot",
            "type": "u32"
          },
          {
            "name": "assignedUntilSlot",
            "type": "u32"
          },
          {
            "name": "explicitCount",
            "type": "u32"
          },
          {
            "name": "chainBreak",
            "type": "bool"
          },
          {
            "name": "descriptorBytes",
            "type": "bytes"
          },
          {
            "name": "headerBytes",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomRecipientPage",
      "docs": [
        "Staged recipient page: a byte chunk of the canonical checkpoint",
        "`descriptor_bytes`. Readers concatenate page payloads in index order to",
        "rebuild the descriptor.",
        "",
        "Address derivation: `[\"room-rpage\", room, epoch_le, page_index_le]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "docs": [
              "Pending epoch this page belongs to."
            ],
            "type": "u64"
          },
          {
            "name": "pageIndex",
            "type": "u16"
          },
          {
            "name": "pagesTotal",
            "type": "u16"
          },
          {
            "name": "payloadHash",
            "docs": [
              "sha256 of `payload`."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "payload",
            "docs": [
              "At most `ROOM_MAX_PAGE_BYTES`."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomRecipientPageStaged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "room",
            "type": "pubkey"
          },
          {
            "name": "roomId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pageAddress",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "pageIndex",
            "type": "u16"
          },
          {
            "name": "pagesTotal",
            "type": "u16"
          },
          {
            "name": "payloadHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roomRemoveMemberParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "type": {
              "defined": {
                "name": "compressedAccountsProof",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "roomMember"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "bgwMemberSecret",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "roomSendMessageParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "Proof for compressed member account input and new Message."
            ],
            "type": {
              "defined": {
                "name": "compressedAccountsProof",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "roomMember"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "message",
            "type": {
              "defined": {
                "name": "messageInput"
              }
            }
          },
          {
            "name": "messageId",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "expectedCryptoEpoch",
            "docs": [
              "Epoch the client encrypted the body under. Must equal",
              "`room.current_epoch` at landing time; see the guard in the handler."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "roomStageRecipientPageParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "Create or update the page compressed account."
            ],
            "type": {
              "defined": {
                "name": "compressedAccountsProofOptionalUpdate",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "roomRecipientPage"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "pageIndex",
            "type": "u16"
          },
          {
            "name": "pagesTotal",
            "type": "u16"
          },
          {
            "name": "payload",
            "docs": [
              "<= ROOM_MAX_PAGE_BYTES, non-empty."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "segment",
      "docs": [
        "[`Segment`] is a fixed-size container for thread ids.",
        "",
        "`N` is the byte size of the segment, must be a multiple of [`THREAD_ID_BYTES`] (4).",
        "",
        "It provides efficient operations to maintain a recency-ordered list of thread ids.",
        "with O(1) insertions and O(S) spill when full, where S is the spill size."
      ],
      "repr": {
        "kind": "transparent"
      },
      "generics": [
        {
          "kind": "const",
          "name": "n",
          "type": "usize"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "raw",
            "docs": [
              "Packed u32 thread ids, index 0 = newest."
            ],
            "type": {
              "array": [
                "u8",
                {
                  "generic": "n"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "sendMsgParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "createAccountsProof",
            "docs": [
              "Proof for current compressed Thread input, updated Thread output, and new Message."
            ],
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "threadAccountMeta",
            "type": {
              "defined": {
                "name": "compressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "currentThread",
            "type": {
              "defined": {
                "name": "thread"
              }
            }
          },
          {
            "name": "message",
            "type": {
              "defined": {
                "name": "messageInput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "thread",
      "docs": [
        "Conversation state between two parties.",
        "",
        "Compressed account derivation: `[\"thread\", thread_id]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "lastSenderSide",
            "docs": [
              "0 = from, 1 = to."
            ],
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u32"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "inboxId",
            "docs": [
              "`NO_INBOX_ID` when the thread is not associated with an inbox."
            ],
            "type": "u64"
          },
          {
            "name": "totalMsgs",
            "type": "u32"
          },
          {
            "name": "lastMsgSeq",
            "type": "u32"
          },
          {
            "name": "lastUpdated",
            "type": "i64"
          },
          {
            "name": "lastReadSeqFrom",
            "type": "u32"
          },
          {
            "name": "lastReadSeqTo",
            "type": "u32"
          },
          {
            "name": "escrowPayment",
            "type": {
              "option": {
                "defined": {
                  "name": "threadEscrowInfo"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "threadEscrowInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "senderApproval",
            "type": "u8"
          },
          {
            "name": "receiverApproval",
            "type": "u8"
          },
          {
            "name": "released",
            "type": "u8"
          },
          {
            "name": "tokenProgram",
            "docs": [
              "0 = SPL Token Program, 1 = Token-2022."
            ],
            "type": "u8"
          },
          {
            "name": "releaseTime",
            "type": "i64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": {
              "defined": {
                "name": "escrow"
              }
            }
          }
        ]
      }
    },
    {
      "name": "updateVaultAuthorityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "updateVaultPaymentWallFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "agent",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "userDecryptionKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "keyType",
            "type": {
              "defined": {
                "name": "keyType"
              }
            }
          },
          {
            "name": "key",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "validityProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "option": {
              "defined": {
                "name": "compressedProof"
              }
            }
          }
        ]
      }
    },
    {
      "name": "withdrawEscrowParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "Proof for the current compressed Thread input and updated Thread output."
            ],
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "threadAccountMeta",
            "type": {
              "defined": {
                "name": "compressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "currentThread",
            "type": {
              "defined": {
                "name": "thread"
              }
            }
          }
        ]
      }
    },
    {
      "name": "withdrawFromVaultParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
