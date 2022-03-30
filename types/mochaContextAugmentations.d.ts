import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, BytesLike } from "ethers";
import { RedeployManager } from "../scripts/redeployManager";
import { AnyswapV3ERC20, DummyImplementation, DummyImplementationUpgraded, Lucidao, LucidaoGovernanceReserve, LucidaoGovernor, LucidaoGovernorUpgraded, LucidaoTimelock, LucidaoVestingTreasury, ProxyAdmin, TransparentUpgradeableProxy } from "../typechain";

export type ProposalArgs = [string[], BigNumberish[], BytesLike[]];

export type Proposal = [...ProposalArgs, string];

declare module "mocha" {
    export interface Context {
        zero: BigNumber;
        oneEth: BigNumber;
        negativeOneEth: BigNumber;
        skipTest: boolean;

        signer: SignerWithAddress;
        addr1: SignerWithAddress;
        white1: SignerWithAddress;
        white2: SignerWithAddress;
        white3: SignerWithAddress;
        liquidityVault: SignerWithAddress;
        addressZero: string;
        whitelisted: string[];
        additionalWallets: SignerWithAddress[];
        signers: SignerWithAddress[];

        luciDaoToken: Lucidao;
        luciDaoTimelock: LucidaoTimelock;
        luciDaoGovernanceReserve: LucidaoGovernanceReserve;
        LuciDaoVestingTreasury: LucidaoVestingTreasury;
        luciDaoGovernor: LucidaoGovernor;
        proxyAdmin: ProxyAdmin;
        lucidGovernorUpgraded: LucidaoGovernorUpgraded;
        transparentUpgradeableProxy: TransparentUpgradeableProxy;
        dummyImplementation: DummyImplementation & DummyImplementationUpgraded;
        dummyImplementationUpgraded: DummyImplementationUpgraded;

        PROPOSER_ROLE: string;
        EXECUTOR_ROLE: string;
        TIMELOCK_ADMIN_ROLE: string;
        CANCELLER_ROLE: string;

        approveCalldata: string;
        transferCalldata: string;
        proposal: Proposal;
        proposalArgs: ProposalArgs;
        proposalHash: [...ProposalArgs, BytesLike];
        proposalId: string;
        queueId: string;

        redeployManager: RedeployManager;
        airdropManagerAddress: string;
        luciDaoGovernanceReserveAddress: string;
        luciDaoLiquidityAddress: string;
        luciDaoVestingTreasuryAddress: string;

        redeployLiquidityLcdBalance: string;
        redeployReserveLcdBalance: string;
    }
}