// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {LegitRegistry712} from "../src/LegitRegistry712.sol";

contract LegitRegistry712Script is Script {
    function run() public {
        vm.startBroadcast();
        new LegitRegistry712(msg.sender);
        vm.stopBroadcast();
    }
}
