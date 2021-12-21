import { expect } from "chai";
import { ethers } from "ethers";
import { lcdAllocations, preSale, publicSale } from "../config/config";

export function afterPublicSaleOpeningTimeBehavior(): void {
  const maxAmountSpendablePublicSale = ethers.utils.parseUnits(publicSale.maxAmountSpendable, 6);
  const parsedpublicSaleAllocation = ethers.utils.parseUnits(lcdAllocations.publicSale);
  const parsedPublicSaleRate = ethers.utils.parseUnits(publicSale.rate, 12);

  it("should not allow sales for addresses before approving spending on the buyingToken", async function () {
    await expect(this.luciDaoPublicSale.buyTokens(maxAmountSpendablePublicSale)).to.be.revertedWith("AnyswapV3ERC20: request exceeds allowance");
  });

  it("should not allow sales for addresses not in whitelist", async function () {
    await expect(this.luciDaoPublicSale.connect(this.white3).buyTokens(maxAmountSpendablePublicSale)).to.be.revertedWith("Beneficiary isn't whitelisted");
  });

  it("should allow sales for addresses in whitelist", async function () {
    await this.fUsdt.approve(this.luciDaoPublicSale.address, maxAmountSpendablePublicSale);
    await expect(() => this.luciDaoPublicSale.buyTokens(maxAmountSpendablePublicSale)).to.changeTokenBalance(this.fUsdt, this.signer, -maxAmountSpendablePublicSale);
    expect(await this.luciDaoPublicSale.contributions(this.signer.address)).to.eq(maxAmountSpendablePublicSale);
    expect(await this.luciDaoPublicSale.weiRaised()).to.eq(maxAmountSpendablePublicSale);
    expect(await this.luciDaoPublicSale.tokensSold()).to.eq(maxAmountSpendablePublicSale.mul(parsedPublicSaleRate));
  });

  it("should send buyTokens to the right vault in the right amount", async function () {
    const halfMaxAmount = maxAmountSpendablePublicSale.div(2);
    await this.fUsdt.transfer(this.white1.address, maxAmountSpendablePublicSale);
    await this.fUsdt.connect(this.white1).approve(this.luciDaoPublicSale.address, maxAmountSpendablePublicSale);
    await expect(() => this.luciDaoPublicSale.connect(this.white1).buyTokens(halfMaxAmount)).to.changeTokenBalance(this.fUsdt, this.luciDaoGovernanceReserve, halfMaxAmount);
  });

  it("should allow multiple sales if below the purchase limit", async function () {
    const quarterMaxAmount = maxAmountSpendablePublicSale.div(4);
    await expect(() => this.luciDaoPublicSale.connect(this.white1).buyTokens(quarterMaxAmount)).to.changeTokenBalance(this.fUsdt, this.white1, -quarterMaxAmount);
    await expect(() => this.luciDaoPublicSale.connect(this.white1).buyTokens(quarterMaxAmount)).to.changeTokenBalance(this.fUsdt, this.white1, -quarterMaxAmount);
    await expect(this.luciDaoPublicSale.connect(this.white1).buyTokens(ethers.utils.parseUnits("1", 6))).to.be.revertedWith("Beneficiary's cap exceeded");
  });

  it("should not allow sales for more than purchase limit", async function () {
    await this.fUsdt.approve(this.luciDaoPublicSale.address, maxAmountSpendablePublicSale);
    await expect(this.luciDaoPublicSale.buyTokens(ethers.utils.parseUnits("1", 6))).to.be.revertedWith("Beneficiary's cap exceeded");
  });

  it("should not allow withdraws before closing time", async function () {
    await expect(this.luciDaoPublicSale.withdrawTokens()).to.be.revertedWith("Sale not finished yet");
    await expect(this.luciDaoPublicSale.connect(this.white2).withdrawTokens()).to.be.revertedWith("Sale not finished yet");
    await expect(this.luciDaoPublicSale.connect(this.white3).withdrawTokens()).to.be.revertedWith("Sale not finished yet");
  });

  it("should not allow to add presale addresses", async function () {
    await expect(this.luciDaoPublicSale.addToWhitelist(this.white3.address)).to.be.revertedWith("Sale already started");
  });

  it("should not allow to buy more than the max sale limit", async function () {
    let weiSold = await this.luciDaoPublicSale.weiRaised();
    let spendableLiquidityToken = (parsedpublicSaleAllocation.div(parsedPublicSaleRate)).sub(weiSold);
    let idx = 0;

    while (spendableLiquidityToken.gt(this.zero)) {
      let actualSpendableAmount = spendableLiquidityToken.gt(maxAmountSpendablePublicSale) ? maxAmountSpendablePublicSale : spendableLiquidityToken;
      spendableLiquidityToken = spendableLiquidityToken.sub(maxAmountSpendablePublicSale);
      await this.fUsdt.connect(this.additionalWallets[idx]).approve(this.luciDaoPublicSale.address, actualSpendableAmount);
      await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).buyTokens(actualSpendableAmount);
      console.log(`${this.additionalWallets[idx].address} - Amount: ${actualSpendableAmount} - Remain ${spendableLiquidityToken}`);
      // let contribution = await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).contributions(this.additionalWallets[idx].address);
      // console.log(`contribution ${contribution.toString()}`);
      idx += 1;
    }

    // let tokenSold = await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).tokensSold();
    // let remainToken = parsedpublicSaleAllocation.sub(tokenSold);
    // console.log(`Token sold ${tokenSold.toString()} - Remain: ${remainToken.toString()}`);

    //let balance = await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).balanceOf(this.additionalWallets[idx].address);
    //let contribution = await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).contributions(this.additionalWallets[idx].address);
    // let cap = await this.luciDaoPublicSale.connect(this.additionalWallets[idx]).cap();
    // console.log(`contribution ${cap.toString()} ${this.oneEth}`);

    const oneFusdt = ethers.utils.parseUnits("1", 6);

    await this.fUsdt.connect(this.additionalWallets[idx]).approve(this.luciDaoPublicSale.address, oneFusdt);
    await expect(this.luciDaoPublicSale.connect(this.additionalWallets[idx]).buyTokens(oneFusdt)).to.be.revertedWith("Buy amount too high");
  });

}