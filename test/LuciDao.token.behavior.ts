import { expect } from 'chai';
import { ethers } from 'hardhat';

import { lcdAllocations, totalSupply } from '../config/config';


export function luciDaoTokenBehavior(): void {
  it("should have expected init parameters", async function () {
    const totalLuciDao = await this.luciDaoToken.totalSupply();
    const expectedTotalLuciDao = ethers.utils.parseUnits(Object.values(lcdAllocations).reduce((a, b) => ((+a) + (+b)).toString()));
    expect(totalLuciDao).to.eq(expectedTotalLuciDao);
    expect(totalLuciDao).to.eq(ethers.utils.parseUnits(totalSupply));

    const ownerBalance = await this.luciDaoToken.balanceOf(this.signer.address);
    expect(ownerBalance).to.eq(totalLuciDao);

    const ownerVotes = await this.luciDaoToken.getVotes(this.signer.address);
    expect(ownerVotes).to.eq(0);

    const lucidDecimals = await this.luciDaoToken.decimals();
    expect(lucidDecimals).to.eq(18);
  });

  it("should be transferred between addresses", async function () {
    await expect(() => this.luciDaoToken.transfer(this.addr1.address, this.oneEth))
      .to.changeTokenBalances(this.luciDaoToken, [this.signer, this.addr1],
        [this.negativeOneEth, this.oneEth]);
  });

  it("should be transferred on behalf of approved addresses", async function () {
    await this.luciDaoToken.approve(this.addr1.address, this.oneEth);
    expect(await this.luciDaoToken.allowance(this.signer.address, this.addr1.address)).to.eq(this.oneEth);
    await expect(() => this.luciDaoToken.connect(this.addr1).transferFrom(this.signer.address, this.addr1.address, this.oneEth))
      .to.changeTokenBalances(this.luciDaoToken, [this.signer, this.addr1],
        [this.negativeOneEth, this.oneEth]);
    expect(await this.luciDaoToken.allowance(this.signer.address, this.addr1.address)).to.eq(this.zero);
    await expect(this.luciDaoToken.connect(this.addr1).transferFrom(this.signer.address, this.addr1.address, this.oneEth))
      .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("should be delegated to other addresses", async function () {
    await this.luciDaoToken.delegate(this.addr1.address);
    expect(await this.luciDaoToken.delegates(this.signer.address)).to.eq(this.addr1.address);
    expect(await this.luciDaoToken.delegates(this.addr1.address)).to.eq(this.addressZero);
  });
}