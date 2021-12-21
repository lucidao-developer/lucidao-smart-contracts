import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';

import { GetLiquidityVaultAddress, preSale, publicSale, Votes } from '../config/config';
import {
  deployLuciDaoGovernanceReserve,
  deployLuciDao,
  deploySaleContracts,
  deployLuciDaoTimelock,
  deployLuciDaoVestingTreasury,
  getOrDeployfUsdt,
} from '../scripts/deployFunctions';
import { DummyImplementation, DummyImplementationUpgraded, TransparentUpgradeableProxy } from "../typechain";
import { mockConsoleLog } from '../scripts/utilities';
import { luciDaoGovernanceReserveBehavior } from './GovernanceReserve.behavior';
import { governanceBehavior } from './Governance.behavior';
import { governanceNewProxyBehavior } from './Governance.NewProxy.behavior';
import { governanceProposalsBehavior } from './Governance.Proposals.behavior';
import { governanceProxyBehavior } from './Governance.Proxy.behavior';
import { governanceTimelockBehavior } from './Governance.Timelock.behavior';
import { governanceReserveBehavior } from './Governance.Reserve.behavior';
import { luciDaoTokenBehavior } from './LuciDao.token.behavior';
import { afterPreSaleOpeningTimeBehavior } from './Sale.AfterPreSaleOpeningTime.behavior';
import { afterPublicSaleOpeningTimeBehavior } from './Sale.AfterPublicSaleOpeningTime.behavior';
import { afterSaleClosingTimeBehavior } from './Sale.AfterSaleClosingTime.behavior';
import { salesBehavior } from './Sales.behavior';
import { timelockBehavior } from './Timelock.behavior';
import { enactProposal, initGovernanceScenario, delegateAndPropose, enactNewQuorumProposal } from './Utilities';
import { luciDaoVestingTreasuryBehavior } from './VestingTreasury.behavior';


describe("Unit tests", () => {
  const oneEth = ethers.constants.One.mul(ethers.constants.WeiPerEther);
  const negativeOneEth = ethers.constants.NegativeOne.mul(ethers.constants.WeiPerEther);
  const zero = ethers.constants.Zero;
  const addressZero = ethers.constants.AddressZero;
  let liquidityVaultAddress: string;
  let signer: SignerWithAddress;
  let addr1: SignerWithAddress;
  let liquidityVault: SignerWithAddress;
  let white1: SignerWithAddress, white2: SignerWithAddress, white3: SignerWithAddress;
  let signers: SignerWithAddress[];

  before(async function () {
    mockConsoleLog();
    signers = await ethers.getSigners();
    [signer, addr1, liquidityVault, white1, white2, white3] = signers;
    liquidityVaultAddress = await GetLiquidityVaultAddress();
  });

  describe("LuciDao Token", () => {
    before(async function () {
      this.luciDaoToken = await deployLuciDao();
      this.oneEth = oneEth;
      this.negativeOneEth = negativeOneEth;
      this.zero = zero;
      this.signer = signer;
      this.addr1 = addr1;
      this.addressZero = addressZero;
    });

    luciDaoTokenBehavior();
  });

  describe("LuciDaoGovernanceReserve", () => {
    before(async function () {
      this.addr1 = addr1;
      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer);
      this.luciDaoTimelock = await deployLuciDaoTimelock();
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, this.luciDaoTimelock);
    });

    luciDaoGovernanceReserveBehavior();
  });

  describe("LuciDaoSales", () => {
    let additionalWallets: SignerWithAddress[];

    before(async function () {
      additionalWallets = signers.slice(Math.max(signers.length - 50, 1));
      this.whitelisted = [signer.address, white1.address, white2.address];
      const whitelistEnhanced = additionalWallets.map(x => x.address);

      this.additionalWallets = additionalWallets;
      this.whitelisted = this.whitelisted.concat(whitelistEnhanced);

      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer, this.whitelisted);
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, await deployLuciDaoTimelock());
      this.white1 = white1;
      this.white2 = white2;
      this.white3 = white3;
      this.signers = signers;
      this.signer = signer;

      [this.luciDaoPreSale, this.luciDaoPublicSale] = await deploySaleContracts(this.luciDaoToken, this.luciDaoGovernanceReserve, this.fUsdt, this.whitelisted);
    });

    salesBehavior();
  });

  describe("LucidAfterPreSalesOpeningTime", () => {
    let additionalWallets: SignerWithAddress[];

    before(async function () {
      await network.provider.send("hardhat_reset");
      additionalWallets = signers.slice(Math.max(signers.length - 50, 1));
      this.whitelisted = [signer.address, white1.address, white2.address];
      const whitelistEnhanced = additionalWallets.map(x => x.address);

      this.additionalWallets = additionalWallets;
      this.whitelisted = this.whitelisted.concat(whitelistEnhanced);
      this.zero = zero;

      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer, this.whitelisted);
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, await deployLuciDaoTimelock());
      this.white1 = white1;
      this.white2 = white2;
      this.white3 = white3;
      this.signers = signers;
      this.signer = signer;

      [this.luciDaoPreSale, this.luciDaoPublicSale] = await deploySaleContracts(this.luciDaoToken, this.luciDaoGovernanceReserve, this.fUsdt, this.whitelisted);
      await network.provider.send("evm_mine", [preSale.startTime + 1]);
    });

    afterPreSaleOpeningTimeBehavior();
  });

  describe("LucidAfterPublicSalesOpeningTime", () => {

    before(async function () {
      await network.provider.send("hardhat_reset");
      this.additionalWallets = signers.slice(Math.max(signers.length - 50, 1));
      this.whitelisted = [signer.address, white1.address, white2.address];
      const whitelistEnhanced = this.additionalWallets.map(x => x.address);

      this.additionalWallets = this.additionalWallets;
      this.whitelisted = this.whitelisted.concat(whitelistEnhanced);

      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer, this.whitelisted);
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, await deployLuciDaoTimelock());
      this.white1 = white1;
      this.white2 = white2;
      this.white3 = white3;
      this.signers = signers;
      this.signer = signer;
      this.zero = zero;

      [, this.luciDaoPublicSale] = await deploySaleContracts(this.luciDaoToken, this.luciDaoGovernanceReserve, this.fUsdt, this.whitelisted);
      var self = this;
      await Promise.all(this.whitelisted.map(async function (whitelistdAddress: string) {
        await self.luciDaoPublicSale.addToWhitelist(whitelistdAddress);
      }));
      await Promise.all(this.whitelisted.map(async function (whitelistdAddress: string) {
        expect(await self.luciDaoPublicSale.isWhitelisted(whitelistdAddress)).to.be.true;
      }));
      await network.provider.send("evm_mine", [publicSale.startTime + 1]);
    });

    afterPublicSaleOpeningTimeBehavior();
  });

  describe("LucidAfterSalesClosingTime", () => {
    let additionalWallets: SignerWithAddress[];

    before(async function () {
      await network.provider.send("hardhat_reset");

      additionalWallets = signers.slice(Math.max(signers.length - 50, 1));
      this.whitelisted = [signer.address, white1.address, white2.address];
      const whitelistEnhanced = additionalWallets.map(x => x.address);

      this.additionalWallets = additionalWallets;
      this.whitelisted = this.whitelisted.concat(whitelistEnhanced);

      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer, this.whitelisted);
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, await deployLuciDaoTimelock());
      this.white1 = white1;
      this.white2 = white2;
      this.white3 = white3;
      this.signers = signers;
      this.signer = signer;

      [this.luciDaoPreSale, this.luciDaoPublicSale] = await deploySaleContracts(this.luciDaoToken, this.luciDaoGovernanceReserve, this.fUsdt, this.whitelisted);
      //FIXME: pass in test context!
      const maxAmountSpendablePresale = ethers.utils.parseUnits(preSale.maxAmountSpendable, 6);
      const maxAmountSpendablePublicSale = ethers.utils.parseUnits(publicSale.maxAmountSpendable, 6);

      await network.provider.send("evm_mine", [preSale.startTime + 1]);
      await this.fUsdt.approve(this.luciDaoPreSale.address, maxAmountSpendablePresale);
      await this.luciDaoPreSale.buyTokens(maxAmountSpendablePresale)

      await this.luciDaoPublicSale.addToWhitelist(this.signer.address);
      await network.provider.send("evm_mine", [publicSale.startTime + 1]);
      await this.fUsdt.approve(this.luciDaoPublicSale.address, maxAmountSpendablePublicSale);
      await this.luciDaoPublicSale.buyTokens(maxAmountSpendablePublicSale)

      await network.provider.send("evm_mine", [publicSale.endTime + 1]);
    });

    afterSaleClosingTimeBehavior();
  });

  describe("LuciDaoVestingTreasury", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");

      this.luciDaoToken = await deployLuciDao();
      this.fUsdt = await getOrDeployfUsdt(signer);
      this.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVaultAddress, this.luciDaoToken, this.fUsdt, await deployLuciDaoTimelock());
      this.LuciDaoVestingTreasury = await deployLuciDaoVestingTreasury(this.luciDaoToken, this.luciDaoGovernanceReserve);

      await network.provider.send("evm_mine", [publicSale.endTime + 1]);
    });

    luciDaoVestingTreasuryBehavior();
  });

  describe("Timelock", () => {
    before(async function () {
      this.luciDaoTimelock = await deployLuciDaoTimelock();
    });

    timelockBehavior();
  });

  describe("Governance", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #1: Give grant to team";
      this.zero = zero;
      this.signer = signer;
      this.addr1 = addr1;
      this.white1 = white1;
      this.white3 = white3;
      this.addressZero = addressZero;
      this.oneEth = oneEth;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
    });

    governanceBehavior();
  });

  describe("Governance - Proposals", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #2: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
      await delegateAndPropose(this);
    });

    governanceProposalsBehavior();
  });

  describe("Governance - Timelock", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      this.addressZero = addressZero;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
      await this.luciDaoToken.delegate(this.signer.address);
      await enactProposal(this.luciDaoGovernor, ...this.proposalArgs, proposalDescription, Votes.For);
    });
    governanceTimelockBehavior();
  });

  describe("Governance - Reserve", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      this.oneEth = oneEth;
      this.addr1 = addr1;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
      await delegateAndPropose(this);
    });
    governanceReserveBehavior();
  });

  describe("Governance - Proxy", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
      await delegateAndPropose(this);
      const LuciDaoGovernorUpgraded = await ethers.getContractFactory("LucidaoGovernorUpgraded");
      this.luciDaoGovernorUpgraded = await LuciDaoGovernorUpgraded.deploy();
      await this.luciDaoGovernorUpgraded.deployed();
      // this.luciDaoGovernorUpgradedAddress = await upgrades.prepareUpgrade(luciDaoGovernor.address, LuciDaoGovernorUpgraded);

      const TransparentUpgradeableProxy = await ethers.getContractFactory("contracts/test/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
      this.transparentUpgradeableProxy = TransparentUpgradeableProxy.attach(this.luciDaoGovernor.address) as TransparentUpgradeableProxy;

      await enactNewQuorumProposal(this);
    });

    governanceProxyBehavior();
  });

  describe("Governance - New proxy stub", () => {
    before(async function () {
      await network.provider.send("hardhat_reset");
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, liquidityVaultAddress, proposalDescription);
      await delegateAndPropose(this);

      const DummyImplementation = await ethers.getContractFactory("DummyImplementation");
      this.dummyImplementation = await upgrades.deployProxy(DummyImplementation, [42], { initializer: 'store' }) as DummyImplementation & DummyImplementationUpgraded;

      await this.dummyImplementation.deployed();

      const DummyImplementationUpgraded = await ethers.getContractFactory("DummyImplementationUpgraded");
      this.dummyImplementationUpgraded = await DummyImplementationUpgraded.deploy() as DummyImplementationUpgraded;
      await this.dummyImplementationUpgraded.deployed();
    });

    governanceNewProxyBehavior();
  });
});