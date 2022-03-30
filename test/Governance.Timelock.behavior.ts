import { expect } from "chai";
import { ethers } from "hardhat";
import { timelockMinDelayInSeconds, Votes } from "../config/config";
import { checkSkipTest, enactProposal } from "../test/Utilities";

export function governanceTimelockBehavior(): void {
    it("should have expected role rules", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoTimelock.hasRole(this.PROPOSER_ROLE, this.luciDaoGovernor.address)).to.be.true;
        expect(await this.luciDaoTimelock.hasRole(this.PROPOSER_ROLE, this.signer.address)).to.be.false;
        expect(await this.luciDaoTimelock.hasRole(this.PROPOSER_ROLE, this.white1.address)).to.be.false;
        expect(await this.luciDaoTimelock.hasRole(this.EXECUTOR_ROLE, this.addressZero)).to.be.true;
        // with zero, everyone can execute even though the role is not recognized
        expect(await this.luciDaoTimelock.hasRole(this.EXECUTOR_ROLE, this.luciDaoGovernor.address)).to.be.false;
        expect(await this.luciDaoTimelock.hasRole(this.TIMELOCK_ADMIN_ROLE, this.luciDaoGovernor.address)).to.be.true;
        expect(await this.luciDaoTimelock.hasRole(this.TIMELOCK_ADMIN_ROLE, this.signer.address)).to.be.false;
        expect(await this.luciDaoTimelock.hasRole(this.TIMELOCK_ADMIN_ROLE, this.white1.address)).to.be.false;
        // Only lucidao governor can cancel a proposal
        expect(await this.luciDaoTimelock.hasRole(this.CANCELLER_ROLE, this.addressZero)).to.be.false;
        expect(await this.luciDaoTimelock.hasRole(this.CANCELLER_ROLE, this.luciDaoGovernor.address)).to.be.true;
    });

    it("should recognize operations sent from the governance", async function () {
        checkSkipTest(this.skipTest, this);
        expect(await this.luciDaoTimelock.isOperation(this.queueId)).to.be.true;
    });

    it("should not queue action without a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.luciDaoTimelock.scheduleBatch([this.luciDaoGovernanceReserve.address, this.luciDaoToken.address], [0, 0], [this.approveCalldata, this.transferCalldata], ethers.constants.HashZero, this.descriptionHash, timelockMinDelayInSeconds)).to.be.reverted;
    });

    it("should not allow changing parameters without a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        const newDelay = "30";
        await expect(this.luciDaoTimelock.grantRole(this.EXECUTOR_ROLE, this.white1.address)).to.be.reverted;
        await expect(this.luciDaoTimelock.revokeRole(this.TIMELOCK_ADMIN_ROLE, this.luciDaoGovernor.address)).to.be.reverted;
        await expect(this.luciDaoTimelock.connect(this.white1).renounceRole(this.TIMELOCK_ADMIN_ROLE, this.luciDaoGovernor.address)).to.be.reverted;
        await expect(this.luciDaoTimelock.updateDelay(newDelay)).to.be.revertedWith("TimelockController: caller must be timelock");
    });

    it("should allow changing parameters with a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        const proposalDescription = "Proposal #5: lower timelock delay";
        const updateDelayCalldata = this.luciDaoTimelock.interface.encodeFunctionData("updateDelay", [this.loweredDelay]);
        await enactProposal(this.luciDaoGovernor, [this.luciDaoTimelock.address], [0], [updateDelayCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoTimelock.getMinDelay()).to.eq(this.loweredDelay);
    });
}