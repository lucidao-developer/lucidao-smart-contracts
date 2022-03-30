import { expect } from 'chai';
import { ethers } from 'hardhat';
import { governance } from '../config/config';
import { checkSkipTest } from './Utilities';

export function governanceBehavior(): void {
    it("should have expected init parameters", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoGovernor.proposalThreshold()).to.eq(ethers.utils.parseUnits(governance.proposalThreshold));
        expect(await this.luciDaoGovernor.quorumNumerator()).to.eq(governance.quorumNumerator);
        expect(await this.luciDaoGovernor.quorumDenominator()).to.eq(governance.quorumDenominator);
        expect(await this.luciDaoGovernor.votingDelay()).to.eq(governance.votingDelay);
        expect(await this.luciDaoGovernor.votingPeriod()).to.eq(governance.votingPeriod);
    });

    it("should not allow proposal from users with not enough delegated votes", async function () {
        checkSkipTest(this.skipTest, this);
        const signerVotes = await this.luciDaoToken.getVotes(this.signer.address);
        expect(signerVotes).to.eq(this.zero);
        expect(signerVotes).to.be.lt(await this.luciDaoGovernor.proposalThreshold());

        await expect(this.luciDaoGovernor.propose(...this.proposal)).to.be.revertedWith("Governor: proposer votes below proposal threshold");
    });

    it("should allow proposal from users with enough delegated votes", async function () {
        checkSkipTest(this.skipTest, this);
        await this.luciDaoToken.delegate(this.signer.address);
        const signerVotes = await this.luciDaoToken.getVotes(this.signer.address);
        expect(signerVotes).to.eq(await this.luciDaoToken.balanceOf(this.signer.address));
        expect(signerVotes).to.be.gte(await this.luciDaoGovernor.proposalThreshold());

        const tx = await this.luciDaoGovernor.propose(...this.proposal);
        const txReceipt = await tx.wait();
        this.proposalId = (txReceipt.events![0].args!["proposalId"]).toString();
    });

    it("should not allow to change governance parameters without a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.luciDaoGovernor.updateQuorumNumerator(this.newQuorum)).to.be.revertedWith("Governor: onlyGovernance");
        await expect(this.luciDaoGovernor.updateTimelock(this.luciDaoTimelock.address)).to.be.revertedWith("Governor: onlyGovernance");
    });
}