// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LucidaoVisionProposals is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _visionIds;
    mapping(uint256 => string) public visions;

    event NewVision (
        uint256 indexed visionId,
        string title
    );

    function writeVision(string calldata title) external onlyOwner {
        uint256 visionId =  _visionIds.current();
        visions[visionId] = title;
        _visionIds.increment();

        emit NewVision(
            visionId,
            title
        );
    }
}