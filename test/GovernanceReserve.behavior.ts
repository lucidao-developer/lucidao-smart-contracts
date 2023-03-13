import { expect } from 'chai';
import { ethers } from 'hardhat';
import { lcdAllocations } from '../config/config';
import { transferLuciDaoTo, transferOwnershipForGovernanceReserve } from '../scripts/deployFunctions';
import { checkSkipTest } from './Utilities';

export function luciDaoGovernanceReserveBehavior(): void {
  it("should have expected init parameters", async function () {
    checkSkipTest(this.skipTest, this);
    expect(await this.luciDaoGovernanceReserve.owner()).to.eq(this.luciDaoTimelock.address);
  });

  it("Governance reserve can receive native token", async function () {
    checkSkipTest(this.skipTest, this);
    const provider = ethers.provider;
    const nativeTokenAmount = "100";
    const parsedEthAmount = ethers.utils.parseEther(nativeTokenAmount);

    const governanceReserveBalance = await provider.getBalance(this.luciDaoGovernanceReserve.address);

    const owner1InitialBalance = await provider.getBalance(this.addr1.address);
    const tx = await (await this.addr1.sendTransaction({
      to: this.luciDaoGovernanceReserve.address,
      value: parsedEthAmount
    })).wait();

    const newOwner1InitialBalance = await provider.getBalance(this.addr1.address);

    expect(newOwner1InitialBalance).to.be.eq(owner1InitialBalance
      .sub(parsedEthAmount)
      .sub(tx.gasUsed.mul(tx.effectiveGasPrice)));

    const newGovernanceReserveBalance = await provider.getBalance(this.luciDaoGovernanceReserve.address);

    expect(newGovernanceReserveBalance).to.be.eq(governanceReserveBalance
      .add(parsedEthAmount));
  });

  it("after redeploy should have correct owner", async function () {
    checkSkipTest(this.skipTest, this);
    const LuciDaoGovernanceReserve = await ethers.getContractFactory("LucidaoGovernanceReserve");
    const myLuciDaoGovernanceReserve = await LuciDaoGovernanceReserve.deploy();
    await myLuciDaoGovernanceReserve.deployed();

    const LuciDao = await ethers.getContractFactory("Lucidao");
    const myLuciDaoToken = await LuciDao.deploy();
    await myLuciDaoToken.deployed();

    expect(await myLuciDaoGovernanceReserve.owner())
      .to.be.eq(this.signer.address);

    // try {
    //   await transferOwnershipForGovernanceReserve(this.signer,
    //     myLuciDaoGovernanceReserve,
    //     this.luciDaoToken,
    //     this.luciDaoTimelock
    //   )
    //   throw new Error("non previsto");
    // } catch (error) {
    //   let errorMessage = "";
    //   if (error instanceof Error) {
    //     errorMessage = error.message;
    //   }
    //   expect(errorMessage.indexOf("Governance Reserve has an unexpected balance"))
    //     .to.be.gt(-1);
    // };

    await transferLuciDaoTo(myLuciDaoToken,
      "GovernanceReserve",
      myLuciDaoGovernanceReserve.address,
      lcdAllocations.governanceReserve);

    await transferOwnershipForGovernanceReserve(this.signer,
      myLuciDaoGovernanceReserve,
      myLuciDaoToken,
      this.luciDaoTimelock
    );

    expect(await myLuciDaoGovernanceReserve.owner())
      .to.be.eq(this.luciDaoTimelock.address);
  })
}