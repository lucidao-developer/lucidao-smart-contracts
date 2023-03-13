import { expect } from "chai";
import { Votes } from "../config/config";
import { checkSkipTest, enactProposal } from "../test/Utilities";

export function governanceProxyBehavior(): void {
    it("should not allow changing governance implementation without a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        await expect(this.transparentUpgradeableProxy.upgradeTo(this.luciDaoGovernorUpgraded.address)).to.be.revertedWithoutReason();
    });

    it("should allow changing governance implementation with a governance operation", async function () {
        checkSkipTest(this.skipTest, this);
        const origVotingPeriod = await this.luciDaoGovernor.votingPeriod();
        expect(await this.luciDaoGovernor.version()).to.eq("1");
        const proposalDescription = "Proposal #5: change governance implementation";
        const changeImplCalldata = this.proxyAdmin.interface.encodeFunctionData("upgrade",
            [this.luciDaoGovernor.address,
            this.luciDaoGovernorUpgraded.address]);

        await enactProposal(this.luciDaoGovernor,
            [this.proxyAdmin.address],
            [0],
            [changeImplCalldata],
            proposalDescription,
            Votes.For);

        expect(await this.luciDaoGovernor.version()).to.eq("v2");
        expect(await this.luciDaoGovernor.votingPeriod()).to.eq(origVotingPeriod);
    });

    it("should allow to make proposals after governance implementation change", async function () {
        checkSkipTest(this.skipTest, this);
        const proposalDescription = "Proposal #7: grant funds";
        const approveCalldata = this.luciDaoGovernanceReserve.interface.encodeFunctionData("approveToken", [this.luciDaoToken.address, this.grantAmount, this.white1.address]);
        await enactProposal(this.luciDaoGovernor, [this.luciDaoGovernanceReserve.address], [0], [approveCalldata], proposalDescription, Votes.For);

        expect(await this.luciDaoToken.allowance(this.luciDaoGovernanceReserve.address, this.white1.address)).to.eq(this.grantAmount);
    });
}