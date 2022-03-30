// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LucidaoGovernanceReserve is Ownable {
	using SafeERC20 for IERC20;

	event Received(address, uint256);

	function approveToken(IERC20 token, uint256 weiAmount, address spender) external onlyOwner {
		token.safeApprove(spender, weiAmount);
	}

	function increaseAllowanceToken(IERC20 token, uint256 weiAmount, address spender) external onlyOwner {
		token.safeIncreaseAllowance(spender, weiAmount);
	}

	function decreaseAllowanceToken(IERC20 token, uint256 weiAmount, address spender) external onlyOwner {
		token.safeDecreaseAllowance(spender, weiAmount);
	}

	function transferEth(address payable receiver, uint256 amount) external onlyOwner {
		if (amount > 0) {
			(bool success, ) = receiver.call{ value: amount }("");
			require(success, "Native token transfer failed");
		}
    }

	receive() external payable {
		emit Received(msg.sender, msg.value);
	}
}
