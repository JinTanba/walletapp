// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract LegitRegistry712 is EIP712 {
    using ECDSA for bytes32;
    address public immutable ADMIN; // 複数Walletにすることもできる. この単一点障害
    mapping(bytes32 => bool) public usedNonce;

    mapping(address => bool) public isLegit;

    mapping(address => bytes32) public lastUID;


    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(bytes32 appId,bytes32 userHash,address wallet,bytes32 nonce,uint64 issuedAt,uint64 expiresAt)");

    /// @dev イベント類
    event Attested(
        bytes32 indexed uid,
        address indexed wallet,
        bytes32 appId,
        bytes32 userHash,
        uint64 issuedAt,
        uint64 expiresAt,
        bytes32 nonce,
        address admin,
        bytes adminSignature
    );
    event Revoked(address indexed wallet);

    /// @dev 署名対象データ
    struct Claim {
        bytes32 appId;
        bytes32 userHash;  // PIIを潰した識別子（pepper付きhash） <---- これ最悪なくてもいい
        address wallet;    // 正統化するウォレット（Safeなど）
        bytes32 nonce;     // 一度きり
        uint64 issuedAt;   // 発行時刻
        uint64 expiresAt;
    }

    constructor(address adminSigner)
        EIP712("UryuDAO", "1")
    {
        require(adminSigner != address(0), "ADMIN_ZERO");
        ADMIN = adminSigner;
    }

    /// @notice 署名対象structのハッシュ（structHash）
    function _hashClaim(Claim calldata c) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                c.appId,
                c.userHash,
                c.wallet,
                c.nonce,
                c.issuedAt,
                c.expiresAt
            )
        );
    }

    /// @notice EIP-712 digest（_hashTypedDataV4）を返す
    function _typedDigest(Claim calldata c) internal view returns (bytes32) {
        return _hashTypedDataV4(_hashClaim(c));
    }

    /// @notice 提出された管理者署名を検証し、合格したwalletを正統として刻む
    /// @param c オンボーディングバックエンドが作成したClaim
    /// @param adminSignature 管理者EOAによるEIP-712署名（v,r,s連結の65bytes）
    function submitAttestation(Claim calldata c, bytes calldata adminSignature) external {
        require(c.wallet != address(0), "WALLET_ZERO");
        require(!usedNonce[c.nonce], "NONCE_USED");
        require(c.expiresAt == 0 || block.timestamp < c.expiresAt, "EXPIRED");

        // EIP-712ダイジェスト計算
        bytes32 digest = _typedDigest(c);

        // 署名者復元
        address signer = digest.recover(adminSignature);
        require(signer == ADMIN, "UNAUTHORIZED_ADMIN");

        // 反映
        usedNonce[c.nonce] = true;
        isLegit[c.wallet] = true;

        // UID（任意）：digestと署名者から導出
        bytes32 uid = keccak256(abi.encodePacked(digest, signer));
        lastUID[c.wallet] = uid;

        emit Attested(uid, c.wallet, c.appId, c.userHash, c.issuedAt, c.expiresAt, c.nonce, signer, adminSignature);
    }

    function hashClaim(Claim calldata c) external pure returns (bytes32) {
        return _hashClaim(c);
    }

    function typedDigest(Claim calldata c) external view returns (bytes32) {
        return _typedDigest(c);
    }

    function recoverSigner(Claim calldata c, bytes calldata adminSignature) external view returns (address) {
        return _typedDigest(c).recover(adminSignature);
    }
}
