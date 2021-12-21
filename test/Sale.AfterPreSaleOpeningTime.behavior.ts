import { expect } from "chai";
import { ethers } from "ethers";
import { lcdAllocations, preSale } from "../config/config";

export function afterPreSaleOpeningTimeBehavior(): void {
  const maxAmountSpendablePresale = ethers.utils.parseUnits(preSale.maxAmountSpendable, 6);

  const parsedPreSaleAllocation = ethers.utils.parseUnits(lcdAllocations.preSale);
  const parsedPreSaleRate = ethers.utils.parseUnits(preSale.rate, 12);

  it("should not allow sales for addresses before approving spending on the buyingToken", async function () {
    await expect(this.luciDaoPreSale.buyTokens(maxAmountSpendablePresale)).to.be.revertedWith("AnyswapV3ERC20: request exceeds allowance");
  });

  it("should not allow sales for addresses not in whitelist", async function () {
    await expect(this.luciDaoPreSale.connect(this.white3).buyTokens(maxAmountSpendablePresale)).to.be.revertedWith("Beneficiary isn't whitelisted");
  });

  it("should allow sales for addresses in whitelist", async function () {
    await this.fUsdt.approve(this.luciDaoPreSale.address, maxAmountSpendablePresale);
    await expect(() => this.luciDaoPreSale.buyTokens(maxAmountSpendablePresale)).to.changeTokenBalance(this.fUsdt, this.signer, -maxAmountSpendablePresale);
    expect(await this.luciDaoPreSale.contributions(this.signer.address)).to.eq(maxAmountSpendablePresale);
    expect(await this.luciDaoPreSale.weiRaised()).to.eq(maxAmountSpendablePresale);
    expect(await this.luciDaoPreSale.tokensSold()).to.eq(maxAmountSpendablePresale.mul(parsedPreSaleRate));
  });

  it("should send buyTokens to the right vault in the right amount", async function () {
    const halfMaxAmount = maxAmountSpendablePresale.div(2);
    await this.fUsdt.transfer(this.white1.address, maxAmountSpendablePresale);
    await this.fUsdt.connect(this.white1).approve(this.luciDaoPreSale.address, maxAmountSpendablePresale);
    await expect(() => this.luciDaoPreSale.connect(this.white1).buyTokens(halfMaxAmount)).to.changeTokenBalance(this.fUsdt, this.luciDaoGovernanceReserve, halfMaxAmount);
  });

  it("should allow multiple sales if below the purchase limit", async function () {
    const quarterMaxAmount = maxAmountSpendablePresale.div(4);
    await expect(() => this.luciDaoPreSale.connect(this.white1).buyTokens(quarterMaxAmount)).to.changeTokenBalance(this.fUsdt, this.white1, -quarterMaxAmount);
    await expect(() => this.luciDaoPreSale.connect(this.white1).buyTokens(quarterMaxAmount)).to.changeTokenBalance(this.fUsdt, this.white1, -quarterMaxAmount);
    await expect(this.luciDaoPreSale.connect(this.white1).buyTokens(ethers.utils.parseUnits("1", 6))).to.be.revertedWith("Beneficiary's cap exceeded");
  });

  it("should not allow sales for more than purchase limit", async function () {
    await this.fUsdt.approve(this.luciDaoPreSale.address, maxAmountSpendablePresale);
    await expect(this.luciDaoPreSale.buyTokens(ethers.utils.parseUnits("1", 6))).to.be.revertedWith("Beneficiary's cap exceeded");
  });

  it("should not allow withdraws before closing time", async function () {
    await expect(this.luciDaoPreSale.withdrawTokens()).to.be.revertedWith("Sale not finished yet");
    await expect(this.luciDaoPreSale.connect(this.white2).withdrawTokens()).to.be.revertedWith("Sale not finished yet");
    await expect(this.luciDaoPreSale.connect(this.white3).withdrawTokens()).to.be.revertedWith("Sale not finished yet");
  });

  // it("should not allow to buy more than the max sale limit", async function () {
  //   const tokensStillToSellGuard = "1000000";
  //   const tokensForSale = await this.luciDaoPreSale.tokensForSale();
  //   const rate = await this.luciDaoPreSale.rate();

  //   let tokensSold = await this.luciDaoPreSale.tokensSold();
  //   let index = 0;

  //   while (tokensForSale.sub(tokensSold).gt(ethers.utils.parseUnits(tokensStillToSellGuard))) {
  //     const wallet = this.additionalWallets[index];
  //     this.fUsdt.connect(wallet).approve(this.luciDaoPreSale.address, maxAmountSpendablePresale);
  //     await this.luciDaoPreSale.connect(wallet).buyTokens(maxAmountSpendablePresale);

  //     tokensSold = await this.luciDaoPreSale.tokensSold();
  //     index++;
  //   }

  //   await expect(this.luciDaoPreSale.connect(this.additionalWallets[index]).buyTokens(maxAmountSpendablePresale)).to.be.revertedWith("Buy amount too high");
  //   // TODO: buy the tokens remaining then test if you cannot buy more
  // });

  it("should not allow to buy more than the max sale limit", async function () {
    // let tokenSold = await this.luciDaoPublicSale.tokensSold();
    // let contributions = tokenSold.div(parsedPreSaleRate);
    let weiSold = await this.luciDaoPreSale.weiRaised();
    let spendableLiquidityToken = (parsedPreSaleAllocation.div(parsedPreSaleRate)).sub(weiSold);
    let idx = 0;

    while (spendableLiquidityToken.gt(this.zero)) {
      let actualSpendableAmount = spendableLiquidityToken.gt(maxAmountSpendablePresale) ? maxAmountSpendablePresale : spendableLiquidityToken;
      spendableLiquidityToken = spendableLiquidityToken.sub(maxAmountSpendablePresale);
      await this.fUsdt.connect(this.additionalWallets[idx]).approve(this.luciDaoPreSale.address, actualSpendableAmount);
      await this.luciDaoPreSale.connect(this.additionalWallets[idx]).buyTokens(actualSpendableAmount);
      console.log(`${this.additionalWallets[idx].address} - Amount: ${actualSpendableAmount} - Remain ${spendableLiquidityToken}`);
      idx += 1;
    }

    const oneFusdt = ethers.utils.parseUnits("1", 6);

    await this.fUsdt.connect(this.additionalWallets[idx]).approve(this.luciDaoPreSale.address, oneFusdt);
    await expect(this.luciDaoPreSale.connect(this.additionalWallets[idx]).buyTokens(oneFusdt)).to.be.revertedWith("Buy amount too high");
  });

}