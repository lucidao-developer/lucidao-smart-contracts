import { expect } from 'chai';
import { timelockMinDelayInSeconds } from '../config/config';
import { checkSkipTest } from './Utilities';

export function timelockBehavior(): void {
  it("should have expected init parameters", async function () {
    checkSkipTest(this.skipTest, this);
    expect(await this.luciDaoTimelock.getMinDelay()).to.eq(timelockMinDelayInSeconds);
  });
}