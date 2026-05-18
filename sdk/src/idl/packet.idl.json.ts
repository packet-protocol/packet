export const PACKET_IDL_JSON = {
  "address": "A3YNvikE96zn2PYrbqRa8hheH99ks7qt22zQiUF8Ttao",
  "metadata": {
    "name": "packet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "xpkt.dev"
  },
  "instructions": [
    {
      "name": "admin_create_vault",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreateVaultParams"
            }
          }
        }
      ]
    },
    {
      "name": "admin_update_vault_authority",
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
              "name": "UpdateVaultAuthorityParams"
            }
          }
        }
      ]
    },
    {
      "name": "admin_update_vault_payment_wall_fee",
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
              "name": "UpdateVaultPaymentWallFeeParams"
            }
          }
        }
      ]
    },
    {
      "name": "admin_withdraw_from_vault",
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
          "name": "vault_token_account",
          "writable": true
        },
        {
          "name": "destination_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
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
          "name": "token_mint"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "WithdrawFromVaultParams"
            }
          }
        }
      ]
    },
    {
      "name": "approve_escrow",
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
          "name": "event_authority",
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
              "name": "ApproveEscrowParams"
            }
          }
        }
      ]
    },
    {
      "name": "archive_inbox",
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
          "name": "inbox_body",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "ArchiveInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_ephemeral_inbox",
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
          "name": "inbox_metadata",
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
          "name": "payment_mint",
          "writable": true,
          "optional": true
        },
        {
          "name": "payment_token_account",
          "optional": true
        },
        {
          "name": "payment_escrow_token_account",
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
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "payment_vault_token_account",
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
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "token_program",
          "optional": true
        },
        {
          "name": "associated_token_program",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreateInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_inbox",
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
          "name": "inbox_body",
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
          "name": "inbox_metadata",
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
          "name": "payment_mint",
          "writable": true,
          "optional": true
        },
        {
          "name": "payment_token_account",
          "optional": true
        },
        {
          "name": "payment_escrow_token_account",
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
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "payment_vault_token_account",
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
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "token_program",
          "optional": true
        },
        {
          "name": "associated_token_program",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreateInboxParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_inbox_metadata",
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
          "name": "inbox_metadata",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "InboxMetadataFields"
            }
          }
        }
      ]
    },
    {
      "name": "create_key",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreateKeyParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_permit",
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
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreatePermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_permit_with_ed25519_permit",
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
          "name": "instructions_sysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreatePermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_thread",
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
          "name": "target_inbox",
          "writable": true,
          "optional": true
        },
        {
          "name": "target_inbox_body",
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
          "name": "from_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "to_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "vault_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "payment_mint",
          "optional": true
        },
        {
          "name": "token_program",
          "optional": true
        },
        {
          "name": "associated_token_program",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "event_authority",
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
              "name": "CreateThreadParams"
            }
          }
        }
      ]
    },
    {
      "name": "create_user",
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
          "name": "agent_identity",
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "CreateUserParams"
            }
          }
        }
      ]
    },
    {
      "name": "delete_inbox_metadata",
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
          "name": "inbox_metadata",
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
      "name": "edit_inbox_payment",
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
          "name": "target_inbox",
          "writable": true
        },
        {
          "name": "payment_mint",
          "writable": true,
          "optional": true
        },
        {
          "name": "payment_token_account",
          "optional": true
        },
        {
          "name": "payment_escrow_token_account",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "target_inbox"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "payment_vault_token_account",
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
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "token_program",
          "optional": true
        },
        {
          "name": "associated_token_program",
          "optional": true,
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "EditInboxPaymentParams"
            }
          }
        }
      ]
    },
    {
      "name": "edit_key",
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
              "name": "EditKeyParams"
            }
          }
        }
      ]
    },
    {
      "name": "edit_user",
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
          "name": "agent_identity",
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "EditUserParams"
            }
          }
        }
      ]
    },
    {
      "name": "extend_permit",
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
              "name": "ExtendPermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "extend_permit_with_ed25519_permit",
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
          "name": "instructions_sysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "ExtendPermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "revoke_permit",
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
                "account": "Permit"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "revoke_permit_with_ed25519_permit",
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
          "name": "instructions_sysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "RevokePermitWithEd25519PermitParams"
            }
          }
        }
      ]
    },
    {
      "name": "send_msg",
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
          "name": "target_inbox",
          "writable": true,
          "optional": true
        },
        {
          "name": "target_inbox_body",
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
          "name": "from_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "to_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "vault_token_account",
          "writable": true,
          "optional": true
        },
        {
          "name": "payment_mint",
          "optional": true
        },
        {
          "name": "token_program",
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "event_authority",
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
              "name": "SendMsgParams"
            }
          }
        }
      ]
    },
    {
      "name": "update_inbox_metadata",
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
          "name": "inbox_metadata",
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
              "name": "InboxMetadataFields"
            }
          }
        }
      ]
    },
    {
      "name": "withdraw_escrow_payment",
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
          "name": "escrow_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "inbox"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "payment_mint"
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
          "name": "to_token_account",
          "writable": true
        },
        {
          "name": "payment_mint"
        },
        {
          "name": "token_program"
        },
        {
          "name": "event_authority",
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
              "name": "WithdrawEscrowParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "AgentAccount",
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
      "name": "Inbox",
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
      "name": "InboxBody",
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
      "name": "InboxMetadata",
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
      "name": "PacketVault",
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
      "name": "Permit",
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
      "name": "User",
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
      "name": "EscrowApproved",
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
      "name": "EscrowWithdrawn",
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
      "name": "InboxArchive",
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
      "name": "Message",
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
      "name": "MessageSent",
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
      "name": "Thread",
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
      "name": "UserDecryptionKey",
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
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6001,
      "name": "InvalidKey",
      "msg": "Invalid key"
    },
    {
      "code": 6002,
      "name": "InvalidInstruction",
      "msg": "Invalid instruction"
    },
    {
      "code": 6003,
      "name": "PermitRequired",
      "msg": "Permit required"
    },
    {
      "code": 6004,
      "name": "InvalidPermit",
      "msg": "Invalid permit"
    },
    {
      "code": 6005,
      "name": "PermitExpired",
      "msg": "Permit expired"
    },
    {
      "code": 6006,
      "name": "InvalidOperator",
      "msg": "Invalid operator"
    },
    {
      "code": 6007,
      "name": "InvalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6008,
      "name": "InvalidReceiver",
      "msg": "Invalid receiver"
    },
    {
      "code": 6009,
      "name": "MissingEd25519Instruction",
      "msg": "Missing Ed25519 instruction"
    },
    {
      "code": 6010,
      "name": "InvalidEd25519Instruction",
      "msg": "Invalid Ed25519 instruction"
    },
    {
      "code": 6011,
      "name": "InvalidPermitSigner",
      "msg": "Invalid permit signer"
    },
    {
      "code": 6012,
      "name": "InvalidPermitMessage",
      "msg": "Invalid permit message"
    },
    {
      "code": 6013,
      "name": "PaymentRequired",
      "msg": "Payment required"
    },
    {
      "code": 6014,
      "name": "PaymentMintRequired",
      "msg": "Payment mint required"
    },
    {
      "code": 6015,
      "name": "InvalidPayment",
      "msg": "Invalid payment"
    },
    {
      "code": 6016,
      "name": "InvalidPaymentAmount",
      "msg": "Invalid payment amount"
    },
    {
      "code": 6017,
      "name": "InvalidPaymentMint",
      "msg": "Invalid payment mint"
    },
    {
      "code": 6018,
      "name": "InvalidPaymentDestination",
      "msg": "Invalid payment destination"
    },
    {
      "code": 6019,
      "name": "PaymentAccountsMissing",
      "msg": "Payment accounts missing"
    },
    {
      "code": 6020,
      "name": "InvalidPaymentAccounts",
      "msg": "Invalid payment accounts"
    },
    {
      "code": 6021,
      "name": "InvalidPaymentWallFee",
      "msg": "Invalid payment wall fee bps"
    },
    {
      "code": 6022,
      "name": "EscrowNotFound",
      "msg": "Escrow not found"
    },
    {
      "code": 6023,
      "name": "EscrowAlreadyReleased",
      "msg": "Escrow already released"
    },
    {
      "code": 6024,
      "name": "EscrowNotApproved",
      "msg": "Escrow not approved"
    },
    {
      "code": 6025,
      "name": "EscrowNotReleasable",
      "msg": "Escrow not releasable"
    },
    {
      "code": 6026,
      "name": "InboxCorrupted",
      "msg": "Inbox corrupted"
    },
    {
      "code": 6027,
      "name": "InvalidInboxKind",
      "msg": "Invalid inbox kind"
    },
    {
      "code": 6028,
      "name": "InvalidInboxId",
      "msg": "Invalid inbox id"
    },
    {
      "code": 6029,
      "name": "InvalidTargetInboxOwner",
      "msg": "Invalid target inbox owner"
    },
    {
      "code": 6030,
      "name": "InvalidTargetInbox",
      "msg": "Invalid target inbox"
    },
    {
      "code": 6031,
      "name": "TargetInboxRequired",
      "msg": "Target inbox required"
    },
    {
      "code": 6032,
      "name": "TargetInboxNotAllowedForSelfThread",
      "msg": "Target inbox not allowed for self-thread"
    },
    {
      "code": 6033,
      "name": "InboxNotFull",
      "msg": "Inbox body not full"
    },
    {
      "code": 6034,
      "name": "InboxNeedsArchival",
      "msg": "Inbox needs archival"
    },
    {
      "code": 6035,
      "name": "MsgPlusArchiveParamsRequired",
      "msg": "Msg plus archive params required or do separate archive inbox instruction"
    },
    {
      "code": 6036,
      "name": "InvalidThreadId",
      "msg": "Invalid thread id"
    },
    {
      "code": 6037,
      "name": "InvalidThread",
      "msg": "Invalid thread"
    },
    {
      "code": 6038,
      "name": "InvalidActivityMint",
      "msg": "Invalid activity mint"
    },
    {
      "code": 6039,
      "name": "InvalidActivitySegmentMetadata",
      "msg": "Invalid activity segment metadata"
    },
    {
      "code": 6040,
      "name": "DuplicateActivitySegmentMetadata",
      "msg": "Duplicate activity segment metadata"
    },
    {
      "code": 6041,
      "name": "MissingActivitySegmentMetadata",
      "msg": "Missing activity segment metadata"
    },
    {
      "code": 6042,
      "name": "MissingActivityUpdateProof",
      "msg": "Missing activity update proof"
    },
    {
      "code": 6043,
      "name": "AgentIdentityNotLinkedToOwner",
      "msg": "Agent identity account needs to have `agent_wallet` field set to owner wallet to be used as agent"
    },
    {
      "code": 6044,
      "name": "InvalidAgentIdentity",
      "msg": "Invalid agent identity"
    }
  ],
  "types": [
    {
      "name": "AgentAccount",
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
            "name": "atom_enabled",
            "docs": [
              "ATOM Engine enabled (irreversible once set to true)"
            ],
            "type": "bool"
          },
          {
            "name": "agent_wallet",
            "docs": [
              "Agent's operational wallet (set via Ed25519 signature verification)",
              "None = no wallet set, Some = wallet address"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "feedback_digest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedback_count",
            "type": "u64"
          },
          {
            "name": "response_digest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "response_count",
            "type": "u64"
          },
          {
            "name": "revoke_digest",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "revoke_count",
            "type": "u64"
          },
          {
            "name": "parent_asset",
            "docs": [
              "Parent asset link (optional, first-write-wins when locked)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "parent_locked",
            "docs": [
              "Parent link lock (once true, parent cannot be modified)"
            ],
            "type": "bool"
          },
          {
            "name": "col_locked",
            "docs": [
              "Collection pointer lock (once true, collection pointer cannot be modified)"
            ],
            "type": "bool"
          },
          {
            "name": "agent_uri",
            "docs": [
              "Agent URI (IPFS/Arweave/HTTP link, max 250 bytes)"
            ],
            "type": "string"
          },
          {
            "name": "nft_name",
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
      "name": "ApproveEscrowParams",
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
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "thread_account_meta",
            "type": {
              "defined": {
                "name": "CompressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "current_thread",
            "type": {
              "defined": {
                "name": "Thread"
              }
            }
          }
        ]
      }
    },
    {
      "name": "ArchiveInboxParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "create_accounts_proof",
            "type": {
              "defined": {
                "name": "CreateAccountsProof"
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
      "name": "COption",
      "repr": {
        "kind": "transparent"
      },
      "generics": [
        {
          "kind": "type",
          "name": "T"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inner",
            "type": {
              "defined": {
                "name": "COptionRepr",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "generic": "T"
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
      "name": "COptionRepr",
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
          "name": "T"
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
            "name": "_pad",
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
              "generic": "T"
            }
          }
        ]
      }
    },
    {
      "name": "CompressedAccountMetaPacket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tree_info",
            "docs": [
              "Merkle tree context."
            ],
            "type": {
              "defined": {
                "name": "PackedStateTreeInfo"
              }
            }
          },
          {
            "name": "output_state_tree_index",
            "docs": [
              "Output merkle tree index."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "CompressedProof",
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
      "name": "CreateAccountsProof",
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
                "name": "ValidityProof"
              }
            }
          },
          {
            "name": "address_tree_info",
            "docs": [
              "Single packed address tree info (all accounts use same tree)."
            ],
            "type": {
              "defined": {
                "name": "PackedAddressTreeInfo"
              }
            }
          },
          {
            "name": "output_state_tree_index",
            "docs": [
              "Output state tree index for new compressed accounts."
            ],
            "type": "u8"
          },
          {
            "name": "state_tree_index",
            "docs": [
              "State merkle tree index (needed for mint creation decompress validation).",
              "This is optional to maintain backwards compatibility."
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "system_accounts_offset",
            "docs": [
              "Offset in remaining_accounts where Light system accounts start."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "CreateInboxParams",
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
                  "name": "InboxMetadataFields"
                }
              }
            }
          },
          {
            "name": "payment_rule",
            "type": {
              "option": {
                "defined": {
                  "name": "PaymentRuleInput"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreateKeyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "create_accounts_proof",
            "type": {
              "defined": {
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "key_type",
            "type": {
              "option": {
                "defined": {
                  "name": "KeyType"
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
      "name": "CreatePermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "expires_at",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "CreatePermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519_permit",
            "type": {
              "defined": {
                "name": "Ed25519Permit"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreateThreadParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "create_accounts_proof",
            "docs": [
              "Proof for new compressed Thread at assigned address 0 and Message at assigned address 1."
            ],
            "type": {
              "defined": {
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "thread_id",
            "type": "u32"
          },
          {
            "name": "message",
            "type": {
              "defined": {
                "name": "MessageInput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "CreateUserParams",
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
      "name": "CreateVaultParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "payment_wall_fee_bps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "Ed25519Permit",
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
            "name": "expires_at",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "program_id",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "EditInboxPaymentParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "payment_rule",
            "type": {
              "option": {
                "defined": {
                  "name": "PaymentRuleInput"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "EditKeyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "create_accounts_proof",
            "type": {
              "defined": {
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "account_meta",
            "type": {
              "defined": {
                "name": "CompressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "current_key_type",
            "type": {
              "defined": {
                "name": "KeyType"
              }
            }
          },
          {
            "name": "current_key",
            "type": "bytes"
          },
          {
            "name": "new_key_type",
            "type": {
              "option": {
                "defined": {
                  "name": "KeyType"
                }
              }
            }
          },
          {
            "name": "new_key",
            "type": {
              "option": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "EditUserParams",
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
      "name": "Escrow",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "release_seconds",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "EscrowApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "thread_id",
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
      "name": "EscrowWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "thread_id",
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
      "name": "ExtendPermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "new_expires_at",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "ExtendPermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519_permit",
            "type": {
              "defined": {
                "name": "Ed25519Permit"
              }
            }
          },
          {
            "name": "new_expires_at",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "Inbox",
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
            "name": "_padding",
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
            "name": "last_updated",
            "docs": [
              "Timestamp of the last update to the inbox.(received threads only)"
            ],
            "type": "i64"
          },
          {
            "name": "payment_rule",
            "docs": [
              "(Optional) payment wall for the inbox."
            ],
            "type": {
              "defined": {
                "name": "COption",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "PaymentRule"
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
      "name": "InboxArchive",
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
                "name": "Segment",
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
      "name": "InboxBody",
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
                "name": "Segment",
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
      "name": "InboxMetadata",
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
      "name": "InboxMetadataFields",
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
      "name": "KeyType",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "X25519"
          },
          {
            "name": "Secp256k1"
          },
          {
            "name": "Ed25519WalletDerivedX25519"
          },
          {
            "name": "Other",
            "fields": [
              "u16"
            ]
          }
        ]
      }
    },
    {
      "name": "Message",
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
            "name": "thread_id",
            "type": "u32"
          },
          {
            "name": "msg_seq",
            "type": "u32"
          },
          {
            "name": "sender_side",
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
                  "name": "Payment"
                }
              }
            }
          },
          {
            "name": "message_type",
            "type": {
              "defined": {
                "name": "MessageType"
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
      "name": "MessageInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "message_type",
            "type": {
              "defined": {
                "name": "MessageType"
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
      "name": "MessageSent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "thread_id",
            "type": "u32"
          },
          {
            "name": "msg_seq",
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
      "name": "MessageType",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Text"
          },
          {
            "name": "Url"
          },
          {
            "name": "Ipfs"
          },
          {
            "name": "Irys"
          },
          {
            "name": "Arweave"
          },
          {
            "name": "Other",
            "fields": [
              "u16"
            ]
          }
        ]
      }
    },
    {
      "name": "PackedAddressTreeInfo",
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
            "name": "address_merkle_tree_pubkey_index",
            "type": "u8"
          },
          {
            "name": "address_queue_pubkey_index",
            "type": "u8"
          },
          {
            "name": "root_index",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "PackedStateTreeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "root_index",
            "type": "u16"
          },
          {
            "name": "prove_by_index",
            "type": "bool"
          },
          {
            "name": "merkle_tree_pubkey_index",
            "type": "u8"
          },
          {
            "name": "queue_pubkey_index",
            "type": "u8"
          },
          {
            "name": "leaf_index",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "PacketVault",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "payment_wall_fee_bps",
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
      "name": "Payment",
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
      "name": "PaymentRule",
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
                "name": "Payment"
              }
            }
          },
          {
            "name": "escrow",
            "type": {
              "defined": {
                "name": "COption",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "Escrow"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "token_program",
            "docs": [
              "0 = SPL Token Program, 1 = Token-2022."
            ],
            "type": "u8"
          },
          {
            "name": "_padding",
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
      "name": "PaymentRuleInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "inner",
            "type": {
              "defined": {
                "name": "Payment"
              }
            }
          },
          {
            "name": "escrow_enabled",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Permit",
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
            "name": "expires_at",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "RevokePermitWithEd25519PermitParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ed25519_permit",
            "type": {
              "defined": {
                "name": "Ed25519Permit"
              }
            }
          }
        ]
      }
    },
    {
      "name": "Segment",
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
          "name": "N",
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
                  "generic": "N"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "SendMsgParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "create_accounts_proof",
            "docs": [
              "Proof for current compressed Thread input, updated Thread output, and new Message."
            ],
            "type": {
              "defined": {
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "thread_account_meta",
            "type": {
              "defined": {
                "name": "CompressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "current_thread",
            "type": {
              "defined": {
                "name": "Thread"
              }
            }
          },
          {
            "name": "message",
            "type": {
              "defined": {
                "name": "MessageInput"
              }
            }
          }
        ]
      }
    },
    {
      "name": "Thread",
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
            "name": "last_sender_side",
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
            "name": "inbox_id",
            "docs": [
              "`NO_INBOX_ID` when the thread is not associated with an inbox."
            ],
            "type": "u64"
          },
          {
            "name": "total_msgs",
            "type": "u32"
          },
          {
            "name": "last_msg_seq",
            "type": "u32"
          },
          {
            "name": "last_updated",
            "type": "i64"
          },
          {
            "name": "last_read_seq_from",
            "type": "u32"
          },
          {
            "name": "last_read_seq_to",
            "type": "u32"
          },
          {
            "name": "escrow_payment",
            "type": {
              "option": {
                "defined": {
                  "name": "ThreadEscrowInfo"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ThreadEscrowInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender_approval",
            "type": "u8"
          },
          {
            "name": "receiver_approval",
            "type": "u8"
          },
          {
            "name": "released",
            "type": "u8"
          },
          {
            "name": "token_program",
            "docs": [
              "0 = SPL Token Program, 1 = Token-2022."
            ],
            "type": "u8"
          },
          {
            "name": "release_time",
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
                "name": "Escrow"
              }
            }
          }
        ]
      }
    },
    {
      "name": "UpdateVaultAuthorityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "new_authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "UpdateVaultPaymentWallFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "new_fee_bps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "User",
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
      "name": "UserDecryptionKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "key_type",
            "type": {
              "defined": {
                "name": "KeyType"
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
      "name": "ValidityProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "option": {
              "defined": {
                "name": "CompressedProof"
              }
            }
          }
        ]
      }
    },
    {
      "name": "WithdrawEscrowParams",
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
                "name": "CreateAccountsProof"
              }
            }
          },
          {
            "name": "thread_account_meta",
            "type": {
              "defined": {
                "name": "CompressedAccountMetaPacket"
              }
            }
          },
          {
            "name": "current_thread",
            "type": {
              "defined": {
                "name": "Thread"
              }
            }
          }
        ]
      }
    },
    {
      "name": "WithdrawFromVaultParams",
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
}