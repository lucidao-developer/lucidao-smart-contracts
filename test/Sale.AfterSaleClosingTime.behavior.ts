import { expect } from "chai";
import { ethers } from "ethers";
import { preSale, publicSale } from "../config/config";

export function afterSaleClosingTimeBehavior(): void {
  const maxAmountSpendablePublicSale = ethers.utils.parseUnits(publicSale.maxAmountSpendable, 6);
  const maxAmountSpendablePresale = ethers.utils.parseUnits(preSale.maxAmountSpendable, 6);
  const parsedPublicSaleRate = ethers.utils.parseUnits(publicSale.rate, 12);
  const parsedPreSaleRate = ethers.utils.parseUnits(preSale.rate, 12);

  it("should not allow sales", async function () {
    await expect(this.luciDaoPreSale.buyTokens(maxAmountSpendablePresale)).to.be.revertedWith("Sale not open");
    await expect(this.luciDaoPublicSale.buyTokens(maxAmountSpendablePublicSale)).to.be.revertedWith("Sale not open");
  });

  it("should allow to withdraw tokens if user bougth any", async function () {
    await expect(() => this.luciDaoPreSale.withdrawTokens()).to.changeTokenBalance(this.luciDaoToken, this.signer, maxAmountSpendablePresale.mul(parsedPreSaleRate));
    await expect(() => this.luciDaoPublicSale.withdrawTokens()).to.changeTokenBalance(this.luciDaoToken, this.signer, maxAmountSpendablePublicSale.mul(parsedPublicSaleRate));
  });

  it("should not allow to withdraw tokens if user hasn't bought any", async function () {
    await expect(this.luciDaoPreSale.connect(this.white2).withdrawTokens()).to.be.revertedWith("Beneficiary is not due any tokens");
    await expect(this.luciDaoPublicSale.connect(this.white2).withdrawTokens()).to.be.revertedWith("Beneficiary is not due any tokens");
  });

  it("should not allow to add presale addresses", async function () {
    await expect(this.luciDaoPublicSale.addToWhitelist(this.white3.address)).to.be.revertedWith("Sale already started");
  });
}