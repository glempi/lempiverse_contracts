// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


abstract contract FlatEggsArray
{
    struct Egg {
        address from;
        uint256 id;
        uint256 value;
    }

    mapping (uint256 => Egg) toHatch;
    uint256 public eggsBulkLimit;

    uint256 public addIndex;
    uint256 public hatchIndex;
    uint256 public topIndex;

    error WrongReqId(uint256 reqId);
    error EggValueRndLengthInconsistence(uint256 eggValue, uint256 rndLength);
    error TooBigValueToTransfer(uint256 value);

    constructor() {
    }

    function _hatchEgg(address from, uint256 id, uint256 rnd) internal virtual;

    function _startHatch(uint256 reqId, uint256[] memory rnds) internal {

        Egg memory egg = toHatch[reqId];

        if (egg.value == 0) {
            revert WrongReqId(reqId);
        }

        if (egg.value != rnds.length) {
            revert EggValueRndLengthInconsistence(egg.value, rnds.length);
        }

        for (uint256 j = 0; j < rnds.length; j++) {
            _hatchEgg(egg.from, egg.id, rnds[j]);
        }
    }

    function _addEgg(
        uint256 reqId,
        address from,
        uint256 id,
        uint256 value) internal {

        assert (value > 0);

        if (value >= eggsBulkLimit) {
            revert TooBigValueToTransfer(value);
        }

        toHatch[reqId] = Egg(from, id, value);
    }

}

contract FlatEggsArrayTest is FlatEggsArray
{
    function _hatchEgg(address from, uint256 id, uint256 rnd) internal override {
        //TODO
    }


    function testStartHatch(uint256 reqId, uint256[] memory rnds) external {
        _startHatch(reqId, rnds);
    }



    function testAddEggs(
        uint256 reqId,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external
    {
        _addEgg(reqId, from, id, value);
    }
}

