import { BigNumberish } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";
import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { CANCELLER_ROLE, EXECUTOR_ROLE, PROPOSER_ROLE, ProposalState, TIMELOCK_ADMIN_ROLE, Votes } from "../config/config";
import { checkSkipTest, enactNewQuorumProposal, enactNewVotingDelayAndQuorumProposal, removeLeadingZero, voteProposal } from "../test/Utilities";
import { LucidaoGovernor } from "../typechain";
import { getOrDeployLuciDaoTimelock } from "../scripts/deployFunctions";
import { removeOpenzeppelinUnknownFile } from "../scripts/utilities";

export function governanceProposalsBehavior(): void {
    it("should not allow to vote for a pending proposal", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.luciDaoGovernor.castVote(this.proposalId, Votes.For)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("should set a proposal to active after the voting delay passes", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Pending);

        const votingDelay = await this.luciDaoGovernor.votingDelay();
        await network.provider.send("hardhat_mine", [votingDelay.toHexString()]);

        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Active);
    });

    it("should not allow to vote with a value outside the correct range", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.luciDaoGovernor.castVote(this.proposalId, "3")).to.be.revertedWith("GovernorVotingSimple: invalid value for enum VoteType");
    });

    it("should allow to vote for an active proposal", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoGovernor.hasVoted(this.proposalId, this.signer.address)).to.be.false;
        await this.luciDaoGovernor.castVote(this.proposalId, Votes.For);
        expect(await this.luciDaoGovernor.hasVoted(this.proposalId, this.signer.address)).to.be.true;
        const currentBlock = await ethers.provider.getBlockNumber();
        expect((await this.luciDaoGovernor.proposalVotes(this.proposalId)).forVotes).to.be.eq(await this.luciDaoGovernor.getVotes(this.signer.address, currentBlock - 1));
    });

    it("should match the number of delegated tokens and the number of votes cast for a proposal for V1", async function () {
        checkSkipTest(this.skipTest, this);
        const currentBlock = await ethers.provider.getBlockNumber();
        const lucidaoTokenVotes = await this.luciDaoToken.getVotes(this.signer.address);
        const signerVotesRegistered = await this.luciDaoGovernor.getVotes(this.signer.address, currentBlock - 1);
        expect(lucidaoTokenVotes).to.be.eq(signerVotesRegistered);

        const lucidaoTokenNumCheckpoints = await this.luciDaoToken.numCheckpoints(this.signer.address);
        const lucidaoTokenLastCheckpoint = await this.luciDaoToken.checkpoints(this.signer.address, lucidaoTokenNumCheckpoints - 1);

        expect(lucidaoTokenLastCheckpoint.votes).to.be.eq(lucidaoTokenVotes);
    });

    it("should not allow to vote for the same proposal multiple times", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoGovernor.hasVoted(this.proposalId, this.signer.address)).to.be.true;
        await expect(this.luciDaoGovernor.castVote(this.proposalId, Votes.For)).to.be.revertedWith("GovernorVotingSimple: vote already cast");
    });

    it("should not allow to vote for a closed proposal", async function () {
        checkSkipTest(this.skipTest, this);
        const votingDelay = await this.luciDaoGovernor.proposalDeadline(this.proposalId);
        const currentBlock = await ethers.provider.getBlockNumber();
        const correctVotingDelay = removeLeadingZero(votingDelay.sub(currentBlock - 1).toHexString())
        await network.provider.send("hardhat_mine", [correctVotingDelay]);

        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Succeeded);
        await expect(this.luciDaoGovernor.connect(this.white1).castVote(this.proposalId, Votes.For)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("should allow anyone to queue succeeded proposals", async function () {
        checkSkipTest(this.skipTest, this);
        await this.luciDaoGovernor.connect(this.white1).queue(...this.proposalHash);
        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Queued);
        await expect(this.luciDaoGovernor.castVote(this.proposalId, Votes.For)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("should not allow to execute proposals before queue time is over", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.luciDaoGovernor.execute(...this.proposalHash)).to.be.revertedWith("TimelockController: operation is not ready");
    });

    it("should allow anyone to execute queued proposals + should use dao vault funds to reward an address", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoTimelock.isOperationReady(this.queueId)).to.be.false;

        const proposalEta = await this.luciDaoGovernor.proposalEta(this.proposalId);
        await network.provider.send("evm_mine", [proposalEta.toNumber()]);

        expect(await this.luciDaoTimelock.isOperationReady(this.queueId)).to.be.true;
        await expect(this.luciDaoTimelock.cancel(this.queueId)).to.be.reverted;
        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Queued);

        await expect(() => this.luciDaoGovernor.execute(...this.proposalHash)).to.changeTokenBalances(this.luciDaoToken, [this.luciDaoGovernanceReserve, this.white3], [this.grantAmount.mul(ethers.constants.NegativeOne), this.grantAmount]);
        expect(await this.luciDaoTimelock.isOperationDone(this.queueId)).to.be.true;
        expect(await this.luciDaoGovernor.state(this.proposalId)).to.eq(ProposalState.Executed);
        await expect(this.luciDaoGovernor.castVote(this.proposalId, Votes.For)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("should not allow to queue unsuccessful proposals", async function () {
        checkSkipTest(this.skipTest, this);
        // VOTE ABSTAIN
        let proposalDescription = "Proposal #3: lower timelock delay";
        let descriptionHash = ethers.utils.id(proposalDescription);
        const updateDelayCalldata = this.luciDaoTimelock.interface.encodeFunctionData("updateDelay", [this.loweredDelay]);
        const proposalArgs = [[this.luciDaoTimelock.address], [0], [updateDelayCalldata]] as [string[], BigNumberish[], BytesLike[]];
        let proposalId = await voteProposal(this.luciDaoGovernor, ...proposalArgs, proposalDescription, Votes.Abstain);
        let delay = removeLeadingZero((await this.luciDaoGovernor.proposalDeadline(proposalId)).toHexString())
        await network.provider.send("hardhat_mine", [delay])
        expect(await this.luciDaoGovernor.state(proposalId)).to.eq(ProposalState.Defeated);
        await expect(this.luciDaoGovernor.queue([this.luciDaoTimelock.address], [0], [updateDelayCalldata], descriptionHash)).to.be.revertedWith("Governor: proposal not successful");
        // VOTE AGAINST
        proposalDescription = "Proposal #3 Bogaloo: lower timelock delay";
        descriptionHash = ethers.utils.id(proposalDescription);
        proposalId = await voteProposal(this.luciDaoGovernor, ...proposalArgs, proposalDescription, Votes.Abstain);
        delay = removeLeadingZero((await this.luciDaoGovernor.proposalDeadline(proposalId)).toHexString())
        await network.provider.send("hardhat_mine", [delay])
        expect(await this.luciDaoGovernor.state(proposalId)).to.eq(ProposalState.Defeated);
        await expect(this.luciDaoGovernor.queue([this.luciDaoTimelock.address], [0], [updateDelayCalldata], descriptionHash)).to.be.revertedWith("Governor: proposal not successful");
    });

    it("should allow to change governance parameters with a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        await enactNewQuorumProposal(this);

        expect(await this.luciDaoGovernor.quorumNumerator()).to.eq(this.newQuorum);
    });

    it("should allow to change voting delay parameter with a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        const newVotingDelay = "600";
        const newQuorum = "21";
        expect(await this.luciDaoGovernor.quorumNumerator()).to.eq(this.newQuorum);
        expect(await this.luciDaoGovernor.quorumNumerator()).to.not.eq(newQuorum);
        expect(await this.luciDaoGovernor.votingDelay()).to.not.eq(newVotingDelay);
        await expect(this.luciDaoGovernor.setVotingDelay(newVotingDelay))
            .to.be.revertedWith("Governor: onlyGovernance");
        await enactNewVotingDelayAndQuorumProposal(this, newVotingDelay, newQuorum);
        expect(await this.luciDaoGovernor.votingDelay()).to.eq(newVotingDelay);
        expect(await this.luciDaoGovernor.quorumNumerator()).to.eq(newQuorum);
    });

    it("should refuse a proposal with equal for and against votes", async function () {
        checkSkipTest(this.skipTest, this);
        await this.luciDaoToken.transfer(this.white1.address, ethers.utils.parseUnits("35200001"));
        await this.luciDaoToken.transfer(this.white3.address, ethers.utils.parseUnits("35200001").sub(this.grantAmount));
        await this.luciDaoToken.connect(this.white1).delegate(this.white1.address);
        await this.luciDaoToken.connect(this.white3).delegate(this.white3.address);


        let proposalDescription = "Proposal #4: get min delay";
        const getMinDelayCalldata = this.luciDaoTimelock.interface.encodeFunctionData("getMinDelay");
        const proposalArgs = [[this.luciDaoTimelock.address], [0], [getMinDelayCalldata]] as [string[], BigNumberish[], BytesLike[]];
        const tx = await this.luciDaoGovernor.propose(...proposalArgs, proposalDescription);
        const txReceipt = await tx.wait();
        const proposalId = (txReceipt.events![0].args!["proposalId"]).toString();

        const votingDelay = removeLeadingZero((await this.luciDaoGovernor.votingDelay()).toHexString());
        await network.provider.send("hardhat_mine", [votingDelay]);
        await this.luciDaoGovernor.connect(this.white1).castVote(proposalId, Votes.Against);
        await this.luciDaoGovernor.connect(this.white3).castVote(proposalId, Votes.For);


        const currentBlock = await ethers.provider.getBlockNumber();
        const votes = await this.luciDaoGovernor.proposalVotes(proposalId);
        const proposalDeadline = await this.luciDaoGovernor.proposalDeadline(proposalId);
        const missingBlock = removeLeadingZero(proposalDeadline.sub(currentBlock - 1).toHexString())
        await network.provider.send("hardhat_mine", [missingBlock]);

        expect(await this.luciDaoGovernor.state(proposalId)).to.eq(ProposalState.Defeated);
    });
}