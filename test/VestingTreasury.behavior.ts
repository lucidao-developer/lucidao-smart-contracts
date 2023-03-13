import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { lcdAllocations, releaseTime } from '../config/config';
import { checkSkipTest } from './Utilities';


export function luciDaoVestingTreasuryBehavior(): void {
  const parsedVestingTreasuryAllocation = ethers.utils.parseUnits(lcdAllocations.vestingTreasury);

  it("should have expected init parameters", async function () {
    checkSkipTest(this.skipTest, this);
    expect(await this.LuciDaoVestingTreasury.releaseTime()).to.eq(releaseTime);
    expect(await this.LuciDaoVestingTreasury.beneficiary()).to.eq(this.luciDaoGovernanceReserve.address);
    expect(await this.LuciDaoVestingTreasury.token()).to.eq(this.luciDaoToken.address);
    expect(await this.luciDaoToken.balanceOf(this.LuciDaoVestingTreasury.address)).to.eq(parsedVestingTreasuryAllocation);
  });

  it("should withdraw token only after release time", async function () {
    checkSkipTest(this.skipTest, this);
    await expect(this.LuciDaoVestingTreasury.release()).to.be.revertedWith("TokenTimelock: current time is before release time");
    await network.provider.send("evm_mine", [releaseTime + 1]);
    await expect(() => this.LuciDaoVestingTreasury.release()).to.changeTokenBalances(
      this.luciDaoToken,
      [this.LuciDaoVestingTreasury, this.luciDaoGovernanceReserve],
      [parsedVestingTreasuryAllocation.mul(ethers.constants.NegativeOne), parsedVestingTreasuryAllocation]
    );
  });
}