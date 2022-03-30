import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { ethers, network, upgrades } from 'hardhat';
import { lcdAllocations, Votes } from '../config/config';
import {
  getOrDeployLuciDao, getOrDeployLuciDaoGovernanceReserve, getOrDeployLuciDaoTimelock,
  getOrDeployLuciDaoVestingTreasury,
  transferLuciDaoTo
} from '../scripts/deployFunctions';
import { RedeployManager } from '../scripts/redeployManager';
import { mockConsoleLog } from '../scripts/utilities';
import { DummyImplementation, DummyImplementationUpgraded, TransparentUpgradeableProxy } from "../typechain";
import { governanceBehavior } from './Governance.behavior';
import { governanceNewProxyBehavior } from './Governance.NewProxy.behavior';
import { governanceProposalsBehavior } from './Governance.Proposals.behavior';
import { governanceProxyBehavior } from './Governance.Proxy.behavior';
import { governanceReserveBehavior } from './Governance.Reserve.behavior';
import { governanceTimelockBehavior } from './Governance.Timelock.behavior';
import { luciDaoGovernanceReserveBehavior } from './GovernanceReserve.behavior';
import { luciDaoTokenBehavior } from './LuciDao.token.behavior';
import { redeployManagerBehavior } from './RedeployManager.behavior';
import { timelockBehavior } from './Timelock.behavior';
import { delegateAndPropose, enactNewQuorumProposal, enactProposal, initGovernanceScenario, resetNetwork, restoreSnapshot, setSnapshot } from './Utilities';
import { luciDaoVestingTreasuryBehavior } from './VestingTreasury.behavior';

var chai = require("chai");
chai.config.includeStack = true;

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
  let tmpAirdropManagerAddress: SignerWithAddress;
  let tmpLuciDaoGovernanceReserve: SignerWithAddress;
  let tmpLuciDaoLiquidity: SignerWithAddress;
  let tmpLuciDaoVestingTreasuryAddress: SignerWithAddress;
  let signers: SignerWithAddress[];

  before(async function () {
    mockConsoleLog();
    signers = await ethers.getSigners();
    [signer, addr1, liquidityVault, white1, white2, white3,
      tmpAirdropManagerAddress, tmpLuciDaoGovernanceReserve,
      tmpLuciDaoLiquidity, tmpLuciDaoVestingTreasuryAddress
    ] = signers;
    this.skipTest = false;
  });

  describe("LuciDao Token", () => {
    before(async function () {
      await resetNetwork(network);
      this.luciDaoToken = await getOrDeployLuciDao();
      this.oneEth = oneEth;
      this.negativeOneEth = negativeOneEth;
      this.zero = zero;
      this.signer = signer;
      this.addr1 = addr1;
      this.addressZero = addressZero;
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    luciDaoTokenBehavior();
  });

  describe("LuciDaoGovernanceReserve", () => {
    before(async function () {
      await resetNetwork(network);
      this.addr1 = addr1;
      this.signer = signer;
      this.luciDaoToken = await getOrDeployLuciDao();
      this.luciDaoTimelock = await getOrDeployLuciDaoTimelock();
      this.luciDaoGovernanceReserve = await getOrDeployLuciDaoGovernanceReserve(this.luciDaoToken, this.luciDaoTimelock);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    luciDaoGovernanceReserveBehavior();
  });

  describe("LuciDaoVestingTreasury", () => {
    before(async function () {
      await resetNetwork(network);
      this.luciDaoToken = await getOrDeployLuciDao();
      this.luciDaoGovernanceReserve = await getOrDeployLuciDaoGovernanceReserve(this.luciDaoToken, await getOrDeployLuciDaoTimelock());
      this.LuciDaoVestingTreasury = await getOrDeployLuciDaoVestingTreasury(this.luciDaoToken, this.luciDaoGovernanceReserve);

      // FIXME: was this line important for the tests?
      // await network.provider.send("evm_mine", [publicSale.endTime + 1]);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    luciDaoVestingTreasuryBehavior();
  });

  describe("Timelock", () => {
    before(async function () {
      await resetNetwork(network);
      this.luciDaoTimelock = await getOrDeployLuciDaoTimelock();
    });

    timelockBehavior();
  });

  describe("Governance", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #1: Give grant to team";
      this.zero = zero;
      this.signer = signer;
      this.addr1 = addr1;
      this.white1 = white1;
      this.white3 = white3;
      this.addressZero = addressZero;
      this.oneEth = oneEth;
      await initGovernanceScenario(this, proposalDescription);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    governanceBehavior();
  });

  describe("Governance - Proposals", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #2: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, proposalDescription);
      await delegateAndPropose(this);
    });

    governanceProposalsBehavior();
  });

  describe("Governance - Timelock", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      this.addressZero = addressZero;
      await initGovernanceScenario(this, proposalDescription);
      await this.luciDaoToken.delegate(this.signer.address);
      await enactProposal(this.luciDaoGovernor, ...this.proposalArgs, proposalDescription, Votes.For);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    governanceTimelockBehavior();
  });

  describe("Governance - Reserve", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      this.oneEth = oneEth;
      this.addr1 = addr1;
      await initGovernanceScenario(this, proposalDescription);
      await delegateAndPropose(this);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    governanceReserveBehavior();
  });

  describe("Governance - Proxy", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, proposalDescription);
      await delegateAndPropose(this);
      const LuciDaoGovernorUpgraded = await ethers.getContractFactory("LucidaoGovernorUpgraded");
      this.luciDaoGovernorUpgraded = await LuciDaoGovernorUpgraded.deploy();
      await this.luciDaoGovernorUpgraded.deployed();
      // this.luciDaoGovernorUpgradedAddress = await upgrades.prepareUpgrade(luciDaoGovernor.address, LuciDaoGovernorUpgraded);

      const TransparentUpgradeableProxy = await ethers.getContractFactory("contracts/test/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
      this.transparentUpgradeableProxy = TransparentUpgradeableProxy.attach(this.luciDaoGovernor.address) as TransparentUpgradeableProxy;

      await enactNewQuorumProposal(this);
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    governanceProxyBehavior();
  });

  describe("Governance - New proxy stub", () => {
    before(async function () {
      await resetNetwork(network);
      const proposalDescription = "Proposal #3: Give grant to team again";
      this.signer = signer;
      this.white1 = white1;
      this.white3 = white3;
      await initGovernanceScenario(this, proposalDescription);
      await delegateAndPropose(this);

      const DummyImplementation = await ethers.getContractFactory("DummyImplementation");
      this.dummyImplementation = await upgrades.deployProxy(DummyImplementation, [42], { initializer: 'store' }) as DummyImplementation & DummyImplementationUpgraded;

      await this.dummyImplementation.deployed();

      const DummyImplementationUpgraded = await ethers.getContractFactory("DummyImplementationUpgraded");
      this.dummyImplementationUpgraded = await DummyImplementationUpgraded.deploy() as DummyImplementationUpgraded;
      await this.dummyImplementationUpgraded.deployed();
    });

    beforeEach(async function () {
      this.snapshot = await setSnapshot(network);
    })

    afterEach(async function () {
      await restoreSnapshot(network, this.snapshot)
    })

    governanceNewProxyBehavior();
  });

  describe("Token distribution", () => {
    beforeEach(async function () {
      this.signer = signer;
      this.airdropManagerAddress = tmpAirdropManagerAddress.address;
      this.luciDaoToken = await getOrDeployLuciDao();
      this.redeployReserveLcdBalance = "580800000";
    });

    redeployManagerBehavior();
  });
});