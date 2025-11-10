// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {LegitRegistry712} from "../src/LegitRegistry712.sol";

contract DeployLocal is Script {
    function run() external {
        // Anvilのデフォルトアカウント #0 を ADMIN として使用
        address adminSigner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

        // Anvilのデフォルトアカウント #0 の秘密鍵
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        LegitRegistry712 registry = new LegitRegistry712(adminSigner);

        vm.stopBroadcast();

        console.log("LegitRegistry712 deployed at:", address(registry));
        console.log("ADMIN address:", adminSigner);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
    }
}
