// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../LuciDaoGovernor.sol";

contract LucidaoGovernorUpgraded is LucidaoGovernor {
	function version() public view virtual override returns (string memory) {
		return "v2";
	}
}
