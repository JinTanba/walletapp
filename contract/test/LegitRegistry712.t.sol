// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LegitRegistry712} from "../src/LegitRegistry712.sol";

contract LegitRegistry712Test is Test {
    LegitRegistry712 private registry;
    uint256 private adminPrivateKey;
    address private admin;

    function setUp() public {
        adminPrivateKey = 0xA11CE;
        admin = vm.addr(adminPrivateKey);
        registry = new LegitRegistry712(admin);
    }

    function testConstructorSetsAdmin() public view {
        assertEq(registry.ADMIN(), admin);
    }

    function testSubmitAttestationRecordsWalletAndEmitsEvent() public {
        address wallet = makeAddr("wallet");
        LegitRegistry712.Claim memory claim = _defaultClaim(wallet);
        (bytes memory signature, bytes32 digest) = _signClaim(claim, adminPrivateKey);
        bytes32 expectedUid = keccak256(abi.encodePacked(digest, admin));

        vm.expectEmit(true, true, false, true, address(registry));
        emit LegitRegistry712.Attested(
            expectedUid,
            wallet,
            claim.appId,
            claim.userHash,
            claim.issuedAt,
            claim.expiresAt,
            claim.nonce,
            admin,
            signature
        );

        registry.submitAttestation(claim, signature);

        assertTrue(registry.usedNonce(claim.nonce));
        assertTrue(registry.isLegit(wallet));
        assertEq(registry.lastUID(wallet), expectedUid);
    }

    function testSubmitAttestationRejectsWrongAdminSignature() public {
        address wallet = makeAddr("wallet");
        LegitRegistry712.Claim memory claim = _defaultClaim(wallet);
        (bytes memory signature,) = _signClaim(claim, 0xBEEF);

        vm.expectRevert("UNAUTHORIZED_ADMIN");
        registry.submitAttestation(claim, signature);
    }

    function testSubmitAttestationRejectsZeroWallet() public {
        LegitRegistry712.Claim memory claim = _defaultClaim(address(0));
        (bytes memory signature,) = _signClaim(claim, adminPrivateKey);

        vm.expectRevert("WALLET_ZERO");
        registry.submitAttestation(claim, signature);
    }

    function testSubmitAttestationRejectsUsedNonce() public {
        address wallet = makeAddr("wallet");
        LegitRegistry712.Claim memory claim = _defaultClaim(wallet);
        (bytes memory signature,) = _signClaim(claim, adminPrivateKey);

        registry.submitAttestation(claim, signature);

        vm.expectRevert("NONCE_USED");
        registry.submitAttestation(claim, signature);
    }

    function testSubmitAttestationRejectsExpiredClaims() public {
        address wallet = makeAddr("wallet");
        LegitRegistry712.Claim memory claim = _defaultClaim(wallet);
        claim.expiresAt = uint64(block.timestamp + 1);
        (bytes memory signature,) = _signClaim(claim, adminPrivateKey);

        vm.warp(claim.expiresAt + 1);

        vm.expectRevert("EXPIRED");
        registry.submitAttestation(claim, signature);
    }

    function _defaultClaim(address wallet) internal view returns (LegitRegistry712.Claim memory claim) {
        claim.appId = keccak256("app");
        claim.userHash = keccak256("user");
        claim.wallet = wallet;
        claim.nonce = keccak256("nonce");
        claim.issuedAt = uint64(block.timestamp);
        claim.expiresAt = uint64(block.timestamp + 1 days);
    }

    function _signClaim(LegitRegistry712.Claim memory claim, uint256 privateKey)
        internal
        view
        returns (bytes memory signature, bytes32 digest)
    {
        digest = registry.typedDigest(claim);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        signature = abi.encodePacked(r, s, v);
    }
}
