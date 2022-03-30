import { getAdminAddress } from '@openzeppelin/upgrades-core';
import { BigNumberish, BytesLike } from 'ethers';
import { ethers, network } from 'hardhat';
import { Network } from 'hardhat/types';
import { Context } from 'mocha';
import { Votes } from '../config/config';
import {
    getOrDeployLuciDao, getOrDeployLuciDaoGovernanceReserve,
    getOrDeployLuciDaoTimelock, getOrDeployProxiedGovernance
} from '../scripts/deployFunctions';
import { isDevelopment, testRunningInHardhat } from '../scripts/utilities';
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

export async function initGovernanceScenario(context: Context, proposalDescription: string) {
    //depends on signer, white3,
    context.newQuorum = "14";
    context.loweredDelay = "30";
    context.grantAmount = ethers.utils.parseUnits("15000");

    context.PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
    context.EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));
    context.TIMELOCK_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    context.CANCELLER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CANCELLER_ROLE"));

    context.luciDaoToken = await getOrDeployLuciDao();
    context.luciDaoTimelock = await getOrDeployLuciDaoTimelock();
    context.luciDaoGovernor = await getOrDeployProxiedGovernance(context.signer, context.luciDaoToken, context.luciDaoTimelock);
    context.luciDaoGovernanceReserve = await getOrDeployLuciDaoGovernanceReserve(context.luciDaoToken, context.luciDaoTimelock);

    const proxyAdminAddress = await getAdminAddress(network.provider, context.luciDaoGovernor.address);
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

export async function enactNewVotingDelayAndQuorumProposal(context: Context, newDelay: string, newQuorum: string) {
    const proposalDescription = "Proposal #6: change voting delay";
    const changeVotingDelayCalldata = context.luciDaoGovernor.interface.encodeFunctionData("setVotingDelay",
        [newDelay]);
    const changeQuorumCalldata = context.luciDaoGovernor.interface.encodeFunctionData("updateQuorumNumerator",
        [newQuorum]);
    const proposalArgs = [[context.luciDaoGovernor.address, context.luciDaoGovernor.address],
                          [0, 0],
                          [changeVotingDelayCalldata, changeQuorumCalldata]
                        ] as ProposalArgs;
    await enactProposal(context.luciDaoGovernor, ...proposalArgs, proposalDescription, Votes.For);
}

export function checkSkipTest(skipFlag: boolean, context: Mocha.Context) {
    if (skipFlag) {
        context.skip();
    }
}

export async function resetNetwork(network: Network) {
    if (isDevelopment() && (process.env.HARDHAT_NETWORK || process.env.HARDHAT_NETWORK == "localhost")) {
        await network.provider.send("hardhat_reset");
    }
}

export async function setSnapshot(network: Network): Promise<Uint8Array | undefined> {
    if (testRunningInHardhat()) {
        return network.provider.send("evm_snapshot");
    }
    return Promise.resolve(undefined);
}

export async function restoreSnapshot(network: Network, snapshot: Uint8Array | undefined) {
    if (testRunningInHardhat()) {
        await network.provider.send("evm_revert", [snapshot]);
    }
}
