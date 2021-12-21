import { expect } from 'chai';
import { ethers } from 'ethers';

import { GetLiquidityVaultAddress, usdtForLiquidity } from '../config/config';

export function luciDaoGovernanceReserveBehavior(): void {
  const parsedUsdtForLiquidity = ethers.utils.parseUnits(usdtForLiquidity, 6);

  it("should have expected init parameters", async function () {
    const liquidityVaultAddress = await GetLiquidityVaultAddress();
    expect(await this.luciDaoGovernanceReserve.liquidityVault()).to.eq(liquidityVaultAddress);
    expect(await this.luciDaoGovernanceReserve.amountForLiquidity()).to.eq(+usdtForLiquidity);
    expect(await this.luciDaoGovernanceReserve.canWithdrawForLiquidity()).to.eq(true);
    expect(await this.luciDaoGovernanceReserve.owner()).to.eq(this.luciDaoTimelock.address);
  });

  it("should repeat function only if transaction fails & should withdraw to liquidity vault only once", async function () {
    const liquidityVaultAddress = await GetLiquidityVaultAddress();

    let liquidityVaultAccount = {
      getAddress: function(){
        return liquidityVaultAddress;
      }
    }
    //const isLoggedInStub = sinon.stub(account, "getAddress").returns(liquidityVaultAddress);

    await expect(this.luciDaoGovernanceReserve.withdrawForLiquidity()).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    await this.fUsdt.mint(this.luciDaoGovernanceReserve.address, parsedUsdtForLiquidity);
    // FIXME: changeTokenBalances accepts Wallets or Signers, we have a string as the second parameter
    await expect(() => this.luciDaoGovernanceReserve.connect(this.addr1).withdrawForLiquidity())
      .to.changeTokenBalances(this.fUsdt, [this.luciDaoGovernanceReserve, liquidityVaultAccount],
        [-parsedUsdtForLiquidity, parsedUsdtForLiquidity]);
    await expect(this.luciDaoGovernanceReserve.withdrawForLiquidity()).to.be.revertedWith("Function already executed");
  });

}