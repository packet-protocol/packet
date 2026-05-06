
export type PacketIDL = {
  "address": "A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao",
  "metadata": {
    "name": "packet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "xpkt.dev"
  },
  "instructions": [
    {
      "name": "adminCreateVault",
      "docs": [
        "--- ADMIN INSTRUCTIONS ---",
        "Admin Create vault ix"
      ],
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
      "docs": [
        "Admin Update vault authority ix"
      ],
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
      "docs": [
        "Admin Update vault payment wall fee ix"
      ],
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
      "docs": [
        "Admin Withdraw from vault ix"
      ],
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
      "docs": [
        "Approve escrow ix"
      ],
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
          "name": "sender",
          "writable": true
        },
        {
          "name": "thread",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  104,
                  114,
                  101,
                  97,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.thread_id"
              }
            ]
          }
        },
        {
          "name": "fromActivity",
          "writable": true
        },
        {
          "name": "toActivity",
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
      "name": "compressAccountsIdempotent",
      "discriminator": [
        70,
        236,
        171,
        120,
        164,
        93,
        113,
        181
      ],
      "accounts": [],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "compressAndCloseParams"
            }
          }
        }
      ]
    },
    {
      "name": "createActivity",
      "docs": [
        "Create Activity ix"
      ],
      "discriminator": [
        185,
        108,
        147,
        27,
        45,
        183,
        236,
        153
      ],
      "accounts": [
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner"
        },
        {
          "name": "compressionConfig"
        },
        {
          "name": "pdaRentSponsor",
          "writable": true
        },
        {
          "name": "activity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  105,
                  116,
                  121
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createActivityParams"
            }
          }
        }
      ]
    },
    {
      "name": "createEphemeralInbox",
      "docs": [
        "Create ephemeral inbox ix"
      ],
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
      "docs": [
        "--- INBOX INSTRUCTIONS ---",
        "Create inbox ix"
      ],
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
      "docs": [
        "-- INBOX METADATA INSTRUCTIONS ---",
        "Create inbox metadata ix"
      ],
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
      "docs": [
        "Create key ix"
      ],
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
      "docs": [
        "-- PERMIT INSTRUCTIONS ---",
        "Create permit ix"
      ],
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
      "docs": [
        "Create permit with ed25519 permit ix"
      ],
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
      "docs": [
        "--- MESSAGE INSTRUCTIONS ---",
        "Create thread ix"
      ],
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
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true
        },
        {
          "name": "compressionConfig"
        },
        {
          "name": "pdaRentSponsor",
          "writable": true
        },
        {
          "name": "thread",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  104,
                  114,
                  101,
                  97,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.thread_id"
              }
            ]
          }
        },
        {
          "name": "fromActivity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "toActivity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  116,
                  105,
                  118,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "arg",
                "path": "params.to"
              }
            ]
          }
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
              "name": "createThreadParams"
            }
          }
        }
      ]
    },
    {
      "name": "createUser",
      "docs": [
        "--- USER INSTRUCTIONS ---",
        "Create user ix"
      ],
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
      "name": "decompressAccountsIdempotent",
      "discriminator": [
        114,
        67,
        61,
        123,
        234,
        31,
        1,
        112
      ],
      "accounts": [],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "decompressIdempotentParams",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "packedLightAccountVariant"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "deleteInboxMetadata",
      "docs": [
        "Delete inbox metadata ix"
      ],
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
      "docs": [
        "Edit inbox payment ix"
      ],
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
      "docs": [
        "Edit key ix"
      ],
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
      "docs": [
        "Edit user ix"
      ],
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
      "docs": [
        "Extend permit ix"
      ],
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
      "docs": [
        "Extend permit with ed25519 permit ix"
      ],
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
      "name": "initializeCompressionConfig",
      "discriminator": [
        133,
        228,
        12,
        169,
        56,
        76,
        222,
        61
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "programData"
        },
        {
          "name": "authority",
          "signer": true
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
              "name": "initConfigParams"
            }
          }
        }
      ]
    },
    {
      "name": "revokePermit",
      "docs": [
        "Revoke permit ix"
      ],
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
      "docs": [
        "Revoke permit with ed25519 permit ix"
      ],
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
      "name": "sendMsg",
      "docs": [
        "Send message ix"
      ],
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
          "name": "thread",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  104,
                  114,
                  101,
                  97,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.thread_id"
              }
            ]
          }
        },
        {
          "name": "fromActivity",
          "writable": true
        },
        {
          "name": "toActivity",
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
      "name": "updateCompressionConfig",
      "discriminator": [
        135,
        215,
        243,
        81,
        163,
        146,
        33,
        70
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "updateAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "instructionData",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateInboxMetadata",
      "docs": [
        "Update inbox metadata ix"
      ],
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
      "docs": [
        "Withdraw escrow payment ix"
      ],
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
                "path": "params.inbox_id"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "thread",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  104,
                  114,
                  101,
                  97,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.thread_id"
              }
            ]
          }
        },
        {
          "name": "paymentMint",
          "writable": true
        },
        {
          "name": "paymentEscrowTokenAccount",
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
          "name": "receiverTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
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
          "name": "permit",
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
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
              "name": "withdrawEscrowParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "activity",
      "discriminator": [
        159,
        236,
        145,
        113,
        221,
        192,
        137,
        112
      ]
    },
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
      "name": "thread",
      "discriminator": [
        186,
        27,
        154,
        111,
        51,
        36,
        159,
        90
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
      "name": "invalidRentSponsor",
      "msg": "Rent sponsor mismatch"
    },
    {
      "code": 6001,
      "name": "missingSeedAccount",
      "msg": "Missing seed account"
    },
    {
      "code": 6002,
      "name": "seedMismatch",
      "msg": "Seed value does not match account data"
    },
    {
      "code": 6003,
      "name": "cTokenDecompressionNotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6004,
      "name": "pdaDecompressionNotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6005,
      "name": "tokenCompressionNotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6006,
      "name": "pdaCompressionNotImplemented",
      "msg": "Not implemented"
    }
  ],
  "types": [
    {
      "name": "activity",
      "docs": [
        "`Activity` struct represents a box that holds recent thread activities for a user.",
        "PDA derivation : `[\"activity\", owner]`"
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "compressionInfo",
            "type": {
              "defined": {
                "name": "compressionInfo"
              }
            }
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "len",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "raw",
            "type": {
              "defined": {
                "name": "segment",
                "generics": [
                  {
                    "kind": "const",
                    "value": "120"
                  }
                ]
              }
            }
          }
        ]
      }
    },
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
            "name": "threadId",
            "type": "u32"
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
      "name": "compressAndCloseParams",
      "docs": [
        "Parameters for compress_and_close instruction.",
        "Matches SDK's SaveAccountsData field order for compatibility."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proof",
            "docs": [
              "Validity proof for compressed account verification"
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "compressedAccounts",
            "docs": [
              "Accounts to compress (meta only - data read from PDA)"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "compressedAccountMetaNoLamportsNoAddress"
                }
              }
            }
          },
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset into remaining_accounts where Light system accounts begin"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "compressedAccountData",
      "docs": [
        "Compressed account data used when decompressing."
      ],
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
            "name": "data",
            "type": {
              "generic": "t"
            }
          }
        ]
      }
    },
    {
      "name": "compressedAccountMeta",
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
            "name": "address",
            "docs": [
              "Address."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
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
      "name": "compressedAccountMetaNoLamportsNoAddress",
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
            "name": "outputStateTreeIndex",
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
      "name": "compressionInfo",
      "docs": [
        "SDK CompressionInfo - a compact 24-byte struct for custom zero-copy PDAs.",
        "",
        "This is the lightweight version of compression info used in the SDK.",
        "CToken has its own compression handling via `light_compressible::CompressionInfo`.",
        "",
        "# Memory Layout (24 bytes with #[repr(C)])",
        "- `last_claimed_slot`: u64 @ offset 0 (8 bytes, 8-byte aligned)",
        "- `lamports_per_write`: u32 @ offset 8 (4 bytes)",
        "- `config_version`: u16 @ offset 12 (2 bytes)",
        "- `state`: CompressionState @ offset 14 (1 byte)",
        "- `_padding`: u8 @ offset 15 (1 byte)",
        "- `rent_config`: RentConfig @ offset 16 (8 bytes, 2-byte aligned)",
        "",
        "Fields are ordered for optimal alignment to achieve exactly 24 bytes."
      ],
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lastClaimedSlot",
            "docs": [
              "Slot when rent was last claimed (epoch boundary accounting)."
            ],
            "type": "u64"
          },
          {
            "name": "lamportsPerWrite",
            "docs": [
              "Lamports to top up on each write (from config, stored per-account to avoid passing config on every write)"
            ],
            "type": "u32"
          },
          {
            "name": "configVersion",
            "docs": [
              "Version of the compressible config used to initialize this account."
            ],
            "type": "u16"
          },
          {
            "name": "state",
            "docs": [
              "Account compression state."
            ],
            "type": {
              "defined": {
                "name": "compressionState"
              }
            }
          },
          {
            "name": "padding",
            "type": "u8"
          },
          {
            "name": "rentConfig",
            "docs": [
              "Rent function parameters for determining compressibility/claims."
            ],
            "type": {
              "defined": {
                "name": "rentConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "compressionState",
      "docs": [
        "Compression state for SDK CompressionInfo.",
        "",
        "This enum uses #[repr(u8)] for Pod compatibility:",
        "- Uninitialized = 0 (default, account not yet set up)",
        "- Decompressed = 1 (account is decompressed/active on Solana)",
        "- Compressed = 2 (account is compressed in Merkle tree)"
      ],
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "uninitialized"
          },
          {
            "name": "decompressed"
          },
          {
            "name": "compressed"
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
      "name": "createActivityParams",
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
            "name": "proof",
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "addressTreeInfo",
            "type": {
              "defined": {
                "name": "packedAddressTreeInfo"
              }
            }
          },
          {
            "name": "outputStateTreeIndex",
            "type": "u8"
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
              "Combined proof for:",
              "assigned address 0 = Thread Light-PDA",
              "assigned address 1 = Message compressed account"
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
            "name": "to",
            "type": "pubkey"
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
      "name": "decompressIdempotentParams",
      "docs": [
        "Parameters for decompress_idempotent instruction.",
        "Generic over the variant type - each program defines its own `PackedProgramAccountVariant`.",
        "",
        "Field order matches `LoadAccountsData` from light-client for compatibility."
      ],
      "generics": [
        {
          "kind": "type",
          "name": "v"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "systemAccountsOffset",
            "docs": [
              "Offset into remaining_accounts where Light system accounts begin"
            ],
            "type": "u8"
          },
          {
            "name": "tokenAccountsOffset",
            "docs": [
              "Accounts before this offset are PDA accounts, at and after are token accounts.",
              "Set to accounts.len() if no token accounts."
            ],
            "type": "u8"
          },
          {
            "name": "outputQueueIndex",
            "docs": [
              "Packed index of the output queue in remaining_accounts."
            ],
            "type": "u8"
          },
          {
            "name": "proof",
            "docs": [
              "Validity proof for compressed account verification"
            ],
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "accounts",
            "docs": [
              "Accounts to decompress - wrapped in CompressedAccountData for metadata"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "compressedAccountData",
                  "generics": [
                    {
                      "kind": "type",
                      "type": {
                        "generic": "v"
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
            "name": "proof",
            "type": {
              "defined": {
                "name": "validityProof"
              }
            }
          },
          {
            "name": "accountMeta",
            "type": {
              "defined": {
                "name": "compressedAccountMeta"
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
      "name": "initConfigParams",
      "docs": [
        "Configuration parameters for initializing compression config.",
        "Field order matches SDK client's `InitializeCompressionConfigAnchorData`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "writeTopUp",
            "type": "u32"
          },
          {
            "name": "rentSponsor",
            "type": "pubkey"
          },
          {
            "name": "compressionAuthority",
            "type": "pubkey"
          },
          {
            "name": "rentConfig",
            "type": {
              "defined": {
                "name": "rentConfig"
              }
            }
          },
          {
            "name": "addressSpace",
            "type": {
              "vec": "pubkey"
            }
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
        "`Message` struct represents a message sent from one party to another.",
        "associated with [`Thread`].",
        "",
        "PDA derivation : `[\"msg\", thread_id, msg_seq]`"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "discriminator",
            "docs": [
              "Unique identifier for the [`Message`] compressed account to be able to queried from Photon RPC"
            ],
            "type": {
              "array": [
                "u8",
                8
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
            "name": "threadId",
            "docs": [
              "Thread id associated with the message."
            ],
            "type": "u32"
          },
          {
            "name": "msgSeq",
            "docs": [
              "Message sequence number in the thread, starting from 1."
            ],
            "type": "u32"
          },
          {
            "name": "senderSide",
            "docs": [
              "sender side"
            ],
            "type": "u8"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of when the message was sent"
            ],
            "type": "i64"
          },
          {
            "name": "payment",
            "docs": [
              "Optional payment information associated with the message."
            ],
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
            "docs": [
              "Type of the message content"
            ],
            "type": {
              "defined": {
                "name": "messageType"
              }
            }
          },
          {
            "name": "content",
            "docs": [
              "Actual content of the message, stored as a byte vector.",
              "Client should be able to deserialize the content based on the message type."
            ],
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
            "type": {
              "option": {
                "defined": {
                  "name": "payment"
                }
              }
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
            "name": "other",
            "fields": [
              "u16"
            ]
          }
        ]
      }
    },
    {
      "name": "packedActivity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "len",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                5
              ]
            }
          },
          {
            "name": "raw",
            "type": {
              "defined": {
                "name": "segment",
                "generics": [
                  {
                    "kind": "const",
                    "value": "120"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "packedActivitySeeds",
      "docs": [
        "Packed seeds with u8 indices for Activity PDA."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ownerIdx",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
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
      "name": "packedLightAccountVariant",
      "docs": [
        "Program-wide packed variant enum for efficient serialization."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "activity",
            "fields": [
              {
                "name": "seeds",
                "type": {
                  "defined": {
                    "name": "packedActivitySeeds"
                  }
                }
              },
              {
                "name": "data",
                "type": {
                  "defined": {
                    "name": "packedActivity"
                  }
                }
              }
            ]
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
      "name": "rentConfig",
      "docs": [
        "Rent function parameters,",
        "used to calculate whether the account is compressible."
      ],
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseRent",
            "docs": [
              "Base rent constant: rent = base_rent + num_bytes * lamports_per_byte_per_epoch"
            ],
            "type": "u16"
          },
          {
            "name": "compressionCost",
            "type": "u16"
          },
          {
            "name": "lamportsPerBytePerEpoch",
            "type": "u8"
          },
          {
            "name": "maxFundedEpochs",
            "type": "u8"
          },
          {
            "name": "maxTopUp",
            "docs": [
              "Maximum lamports that can be charged per top-up operation.",
              "Protects against griefing by accounts with high lamports_per_write."
            ],
            "type": "u16"
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
              "Single proof for:",
              "assigned address 0 = Message compressed account"
            ],
            "type": {
              "defined": {
                "name": "createAccountsProof"
              }
            }
          },
          {
            "name": "createAccountsProofWithArchive",
            "docs": [
              "Combined proof for:",
              "assigned address 0 = Message compressed account",
              "assigned address 1 = InboxArchive compressed account"
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "createAccountsProof"
                }
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
      "name": "thread",
      "docs": [
        "`Thread` struct represents a conversation thread between two parties.",
        "",
        "- PDA derivation : `[\"thread\", thread_id]`"
      ],
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "compressionInfo",
            "type": {
              "defined": {
                "name": "compressionInfo"
              }
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
            "name": "lastSenderSide",
            "docs": [
              "Indicates which party sent the last message in the thread.",
              "0 = from, 1 = to"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "id",
            "docs": [
              "Global unique thread id"
            ],
            "type": "u32"
          },
          {
            "name": "from",
            "docs": [
              "Wallet address of the first party in the conversation thread."
            ],
            "type": "pubkey"
          },
          {
            "name": "to",
            "docs": [
              "Wallet address of the second party in the conversation thread."
            ],
            "type": "pubkey"
          },
          {
            "name": "inboxId",
            "docs": [
              "Optional inbox id.",
              "",
              "If the [`Thread`] is associated with an [`Inbox`], this field will be inbox_id, otherwise u64::MAX."
            ],
            "type": "u64"
          },
          {
            "name": "totalMsgs",
            "docs": [
              "Message count for the `from` and `to` wallet addresses"
            ],
            "type": "u32"
          },
          {
            "name": "lastMsgSeq",
            "docs": [
              "Sequence number of the last message in the thread"
            ],
            "type": "u32"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "Timestamp of the last message in the thread"
            ],
            "type": "i64"
          },
          {
            "name": "lastReadSeqFrom",
            "docs": [
              "Last read message sequence number for the `from` wallet address."
            ],
            "type": "u32"
          },
          {
            "name": "lastReadSeqTo",
            "docs": [
              "Last read message sequence number for the `to` wallet address."
            ],
            "type": "u32"
          },
          {
            "name": "escrowPayment",
            "docs": [
              "Optional escrow payment info for the thread"
            ],
            "type": {
              "defined": {
                "name": "cOption",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "threadEscrowInfo"
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
      "name": "threadEscrowInfo",
      "repr": {
        "kind": "c"
      },
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
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
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
            "name": "inboxId",
            "type": "u64"
          },
          {
            "name": "threadId",
            "type": "u32"
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
