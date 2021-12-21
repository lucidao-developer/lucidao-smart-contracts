import { expect } from "chai";
import { Votes } from "../config/config";
import { enactProposal } from "../test/Utilities";

export function governanceProxyBehavior(): void {
    it("should not allow changing governance implementation without a governance operation", async function () {
        await expect(this.transparentUpgradeableProxy.upgradeTo(this.luciDaoGovernorUpgraded.address)).to.be.revertedWith("function selector was not recognized and there's no fallback function");
    });

    it("should allow changing governance implementation with a governance operation", async function () {
        const newVotingDelay = "600";
        const proposalDescription = "Proposal #5: change governance implementation";
        const changeImplCalldata = this.proxyAdmin.interface.encodeFunctionData("upgrade", [this.luciDaoGovernor.address, this.luciDaoGovernorUpgraded.address]);
        await enactProposal(this.luciDaoGovernor, [this.proxyAdmin.address], [0], [changeImplCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoGovernor.quorumNumerator()).to.eq(this.newQuorum);
        expect(await this.luciDaoGovernor.votingDelay()).to.eq(newVotingDelay);
    });

    it("should allow to make proposals after governance implementation change", async function () {
        const proposalDescription = "Proposal #7: grant funds";
        const approveCalldata = this.luciDaoGovernanceReserve.interface.encodeFunctionData("approveToken", [this.luciDaoToken.address, this.grantAmount, this.white1.address]);
        await enactProposal(this.luciDaoGovernor, [this.luciDaoGovernanceReserve.address], [0], [approveCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoToken.allowance(this.luciDaoGovernanceReserve.address, this.white1.address)).to.eq(this.grantAmount);
    });
}