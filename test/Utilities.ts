import { BigNumberish, BytesLike } from 'ethers';
import { ethers, network } from 'hardhat';
import { Context } from 'mocha';
import { Votes } from '../config/config';
import {
    deployLuciDao, deployLuciDaoGovernanceReserve, deployLuciDaoTimelock, deployProxiedGovernance, getOrDeployfUsdt
} from '../scripts/deployFunctions';
import { importModule } from '../scripts/utilities';
import { LucidaoGovernor, ProxyAdmin } from '../typechain';
import { ProposalArgs } from '../types/mochaContextAugmentations';

export async function voteProposal(governor: LucidaoGovernor, targets: string[], values: BigNumberish[], calldatas: BytesLike[], description: string, vote: Votes) {
    const tx = await governor.propose(targets, values, calldatas, description);
    const txReceipt = await tx.wait();
    const proposalId = (txReceipt.events![0].args!["proposalId"]).toString();
    const votingDelay = await governor.votingDelay();
    for (let index = 0; index <= votingDelay.toNumber(); index++) {
        await network.provider.send("evm_mine");
    }
    await governor.castVote(proposalId, vote);
    const proposalDeadline = await governor.proposalDeadline(proposalId);
    const currentBlock = await ethers.provider.getBlockNumber();
    for (let index = currentBlock; index <= proposalDeadline.toNumber(); index++) {
        await network.provider.send("evm_mine");
    }

    return proposalId;
}

export async function enactProposal(governor: LucidaoGovernor, targets: string[], values: BigNumberish[], calldatas: BytesLike[], description: string, vote: Votes) {
    const descriptionHash = ethers.utils.id(description);
    const proposalArgs = [targets, values, calldatas] as ProposalArgs;
    const proposalId = await voteProposal(governor, ...proposalArgs, description, vote);
    await governor.queue(...proposalArgs, descriptionHash);
    const proposalEta = await governor.proposalEta(proposalId);
    await network.provider.send("evm_mine", [proposalEta.toNumber()]);
    await governor.execute(...proposalArgs, descriptionHash);
}

export async function initGovernanceScenario(context: Context, liquidityVault: string, proposalDescription: string) {
    //depends on signer, white3,
    context.newQuorum = "14";
    context.loweredDelay = "30";
    context.grantAmount = ethers.utils.parseUnits("15000");

    context.PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
    context.EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));
    context.TIMELOCK_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));

    context.luciDaoToken = await deployLuciDao();
    context.luciDaoTimelock = await deployLuciDaoTimelock();
    context.luciDaoGovernor = await deployProxiedGovernance(context.signer, context.luciDaoToken, context.luciDaoTimelock);
    context.fUsdt = await getOrDeployfUsdt(context.signer);
    context.luciDaoGovernanceReserve = await deployLuciDaoGovernanceReserve(liquidityVault, context.luciDaoToken, context.fUsdt, context.luciDaoTimelock);

    const chainId = await context.signer.getChainId();
    const moduleName = "../.openzeppelin/unknown-" + chainId + ".json";
    const mod = await importModule(moduleName);
    const proxyAdminAddress = mod.admin.address;
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    context.proxyAdmin = ProxyAdmin.attach(proxyAdminAddress) as ProxyAdmin;

    context.descriptionHash = ethers.utils.id(proposalDescription);
    context.approveCalldata = context.luciDaoGovernanceReserve.interface.encodeFunctionData("approveToken", [context.luciDaoToken.address, context.grantAmount, context.luciDaoTimelock.address]);
    context.transferCalldata = context.luciDaoToken.interface.encodeFunctionData("transferFrom", [context.luciDaoGovernanceReserve.address, context.white3.address, context.grantAmount]);
    context.changeQuorumCalldata = context.luciDaoGovernor.interface.encodeFunctionData("updateQuorumNumerator", [context.newQuorum]);
    context.proposalArgs = [[context.luciDaoGovernanceReserve.address, context.luciDaoToken.address], [0, 0], [context.approveCalldata, context.transferCalldata]];
    context.proposal = [...context.proposalArgs, proposalDescription];
    context.queueId = await context.luciDaoTimelock.hashOperationBatch(...context.proposalArgs, ethers.constants.HashZero, context.descriptionHash);
    context.proposalHash = [...context.proposalArgs, context.descriptionHash];
}

export async function delegateAndPropose(context: Context) {
    await context.luciDaoToken.delegate(context.signer.address);
    const tx = await context.luciDaoGovernor.propose(...context.proposal);
    const txReceipt = await tx.wait();
    context.proposalId = (txReceipt.events![0].args!["proposalId"]).toString();
}

export async function enactNewQuorumProposal(context: Context) {
    const proposalDescription = "Proposal #4: change quorum requirement";
    const proposalArgs = [[context.luciDaoGovernor.address], [0], [context.changeQuorumCalldata]] as ProposalArgs;
    await enactProposal(context.luciDaoGovernor, ...proposalArgs, proposalDescription, Votes.For);
}