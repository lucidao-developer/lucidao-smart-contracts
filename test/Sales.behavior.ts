import { expect } from 'chai';
import { ethers } from 'ethers';

import { lcdAllocations, preSale, publicSale } from '../config/config';

export function salesBehavior(): void {
  const maxAmountSpendablePresale = ethers.utils.parseUnits(preSale.maxAmountSpendable, 6);
  const maxAmountSpendablePublicSale = ethers.utils.parseUnits(publicSale.maxAmountSpendable, 6);

  const parsedPreSaleAllocation = ethers.utils.parseUnits(lcdAllocations.preSale);
  const parsedpublicSaleAllocation = ethers.utils.parseUnits(lcdAllocations.publicSale);

  it("should have expected init parameters", async function () {
    const sales = [this.luciDaoPreSale, this.luciDaoPublicSale];
    await Promise.all(sales.map(async sale => {
      const saleVars = sale.address === this.luciDaoPreSale.address ? preSale : publicSale;
      const allocation = sale.address === this.luciDaoPreSale.address ? parsedPreSaleAllocation : parsedpublicSaleAllocation;
      const maxAmountSpendable = sale.address === this.luciDaoPreSale.address ? maxAmountSpendablePresale : maxAmountSpendablePublicSale;
      expect(await sale.token()).to.eq(this.luciDaoToken.address);
      expect(await sale.buyToken()).to.eq(this.fUsdt.address);
      expect(await sale.rate()).to.eq(ethers.utils.parseUnits(saleVars.rate, 12));
      expect(await sale.treasuryWallet()).to.eq(this.luciDaoGovernanceReserve.address);
      expect(await sale.openingTime()).to.eq(saleVars.startTime);
      expect(await sale.closingTime()).to.eq(saleVars.endTime);
      expect(await sale.cap()).to.eq(maxAmountSpendable);
      expect(await sale.tokensForSale()).to.eq(allocation);
      expect(await sale.isBeforeOpen()).to.be.true;
      expect(await sale.isOpen()).to.be.false;
      expect(await sale.isClosed()).to.be.false;
    }));

    let self = this;
    await Promise.all(this.whitelisted.map(async function (presaler: string) {
      expect(await self.luciDaoPreSale.isWhitelisted(presaler)).to.be.true;
      expect(await self.luciDaoPublicSale.isWhitelisted(presaler)).to.be.false;
    }));
  });

  it("should not allow sales before opening time", async function () {
    await expect(this.luciDaoPreSale.buyTokens(maxAmountSpendablePresale)).to.be.revertedWith("Sale not open");
    await expect(this.luciDaoPublicSale.buyTokens(maxAmountSpendablePublicSale)).to.be.revertedWith("Sale not open");
  });

  it("should not allow to add presale addresses if not contract owner", async function () {
    await expect(this.luciDaoPublicSale.connect(this.white1).addToWhitelist(this.white3.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });
}