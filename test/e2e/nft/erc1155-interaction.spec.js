const { strict: assert } = require('assert');
const { convertToHexValue, withFixtures } = require('../helpers');
const { SMART_CONTRACTS } = require('../seeder/smart-contracts');
const FixtureBuilder = require('../fixture-builder');

describe('ERC1155 NFTs testdapp interaction', function () {
  const smartContract = SMART_CONTRACTS.ERC1155;
  const ganacheOptions = {
    accounts: [
      {
        secretKey:
          '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
        balance: convertToHexValue(25000000000000000000),
      },
    ],
  };

  it('should mint ERC1155 token', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        smartContract,
        title: this.test.title,
        failOnConsoleError: false,
      },
      async ({ driver, _, contractRegistry }) => {
        const contract = contractRegistry.getContractAddress(smartContract);
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Open Dapp and wait for deployed contract
        await driver.openNewPage(`http://127.0.0.1:8080/?contract=${contract}`);
        await driver.findClickableElement('#deployButton');

        // Mint
        await driver.fill('#batchMintTokenIds', '1, 2, 3');
        await driver.fill('#batchMintIdAmounts', '1, 1, 1000000000000000');
        await driver.clickElement('#batchMintButton');

        // Notification
        await driver.waitUntilXWindowHandles(3);
        const windowHandles = await driver.getAllWindowHandles();
        const [extension] = windowHandles;
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        // Confirm Mint
        await driver.waitForSelector({
          css: '.confirm-page-container-summary__action__name',
          text: 'Deposit',
        });
        await driver.clickElement({ text: 'Confirm', tag: 'button' });
        await driver.waitUntilXWindowHandles(2);
        await driver.switchToWindow(extension);
        await driver.clickElement('[data-testid="home__activity-tab"]');
        const transactionItem = await driver.waitForSelector({
          css: '.list-item__title',
          text: 'Deposit',
        });
        assert.equal(
          await transactionItem.isDisplayed(),
          true,
          `transaction item should be displayed in activity tab`,
        );
      },
    );
  });

  it('should batch transfers ERC1155 token', async function () {
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        smartContract,
        title: this.test.title,
        failOnConsoleError: false,
      },
      async ({ driver, _, contractRegistry }) => {
        const contract = contractRegistry.getContractAddress(smartContract);
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await driver.openNewPage(`http://127.0.0.1:8080/?contract=${contract}`);

        await driver.fill('#batchTransferTokenIds', '1, 2, 3');
        await driver.fill('#batchTransferTokenAmounts', '1, 1, 1000000000000');
        await driver.clickElement('#batchTransferFromButton');

        await driver.waitUntilXWindowHandles(3);
        const windowHandles = await driver.getAllWindowHandles();
        const [extension] = windowHandles;
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        // Confirm Transfer
        await driver.waitForSelector({
          css: '.confirm-page-container-summary__action__name',
          text: 'Deposit',
        });
        await driver.clickElement({ text: 'Confirm', tag: 'button' });
        await driver.waitUntilXWindowHandles(2);
        await driver.switchToWindow(extension);
        await driver.clickElement('[data-testid="home__activity-tab"]');
        const transactionItem = await driver.waitForSelector({
          css: '.list-item__title',
          text: 'Deposit',
        });
        assert.equal(
          await transactionItem.isDisplayed(),
          true,
          `transaction item should be displayed in activity tab`,
        );
      },
    );
  });

  it('should enable approval for a third party address to manage all ERC1155 token', async function () {
    const expectedMessageTitle =
      'Allow access to and transfer of all your NFT?';
    const expectedDescription =
      'This allows a third party to access and transfer the following NFTs without further notice until you revoke its access.';
    const expectedWarningMessage = 'Your NFT may be at risk';
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        smartContract,
        title: this.test.title,
      },
      async ({ driver, _, contractRegistry }) => {
        const contract = contractRegistry.getContractAddress(smartContract);
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Create a set approval for all erc1155 token request in test dapp
        await driver.openNewPage(`http://127.0.0.1:8080/?contract=${contract}`);
        await driver.clickElement('#setApprovalForAllERC1155Button');

        // Wait for notification popup and check the displayed message
        await driver.waitUntilXWindowHandles(3);
        let windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );
        const displayedMessageTitle = await driver.findElement(
          '[data-testid="confirm-approve-title"]',
        );
        assert.equal(
          await displayedMessageTitle.getText(),
          expectedMessageTitle,
        );
        const displayedUrl = await driver.findElement(
          '.confirm-approve-content h6',
        );
        assert.equal(await displayedUrl.getText(), 'http://127.0.0.1:8080');
        const displayedDescription = await driver.findElement(
          '.confirm-approve-content__description',
        );
        assert.equal(await displayedDescription.getText(), expectedDescription);

        // Check displayed transaction details
        await driver.clickElement({
          text: 'View full transaction details',
          css: '.confirm-approve-content__small-blue-text',
        });
        const [func, params] = await driver.findElements(
          '.confirm-approve-content__data .confirm-approve-content__small-text',
        );
        assert.equal(await func.getText(), 'Function: SetApprovalForAll');
        assert.equal(await params.getText(), 'Parameters: true');

        // Check the warning message and confirm set approval for all
        await driver.clickElement('[data-testid="page-container-footer-next"]');
        const displayedWarning = await driver.findElement(
          '.set-approval-for-all-warning__content__header',
        );
        assert.equal(await displayedWarning.getText(), expectedWarningMessage);
        await driver.clickElement({ text: 'Approve', tag: 'button' });
        await driver.waitUntilXWindowHandles(2);

        // Switch to extension and check set approval for all transaction is displayed in activity tab
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('MetaMask', windowHandles);
        await driver.clickElement('[data-testid="home__activity-tab"]');
        const setApprovalItem = await driver.findElement({
          css: '.transaction-list__completed-transactions',
          text: 'Approve Token with no spend limit',
        });
        assert.equal(await setApprovalItem.isDisplayed(), true);

        // Switch back to the dapp and verify that set approval for all action completed message is displayed
        await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);
        const setApprovalStatus = await driver.findElement({
          css: '#erc1155Status',
          text: 'Set Approval For All completed',
        });
        assert.equal(await setApprovalStatus.isDisplayed(), true);
      },
    );
  });

  it('should revoke approval for a third party address to manage all ERC1155 token', async function () {
    const expectedMessageTitle =
      'Revoke permission to access and transfer all of your NFT?';
    const expectedDescription =
      'This revokes the permission for a third party to access and transfer all of your NFT without further notice.';
    await withFixtures(
      {
        dapp: true,
        fixtures: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        ganacheOptions,
        smartContract,
        title: this.test.title,
      },
      async ({ driver, _, contractRegistry }) => {
        const contract = contractRegistry.getContractAddress(smartContract);
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Create a revoke approval for all erc1155 token request in test dapp
        await driver.openNewPage(`http://127.0.0.1:8080/?contract=${contract}`);
        await driver.clickElement('#revokeERC1155Button');

        // Wait for notification popup and check the displayed message
        await driver.waitUntilXWindowHandles(3);
        let windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle(
          'MetaMask Notification',
          windowHandles,
        );

        const displayedMessageTitle = await driver.findElement(
          '.confirm-approve-content__title',
        );
        assert.equal(
          await displayedMessageTitle.getText(),
          expectedMessageTitle,
        );
        const displayedUrl = await driver.findElement(
          '.confirm-approve-content h6',
        );
        assert.equal(await displayedUrl.getText(), 'http://127.0.0.1:8080');
        const displayedDescription = await driver.findElement(
          '.confirm-approve-content__description',
        );
        assert.equal(await displayedDescription.getText(), expectedDescription);

        // Check displayed transaction details
        await driver.clickElement({
          text: 'View full transaction details',
          css: '.confirm-approve-content__small-blue-text',
        });
        const [func, params] = await driver.findElements(
          '.confirm-approve-content__data .confirm-approve-content__small-text',
        );
        assert.equal(await func.getText(), 'Function: SetApprovalForAll');
        assert.equal(await params.getText(), 'Parameters: false');

        // Click on extension popup to confirm revoke approval for all
        await driver.clickElement('[data-testid="page-container-footer-next"]');
        await driver.waitUntilXWindowHandles(2);

        // Switch to extension and check revoke approval transaction is displayed in activity tab
        windowHandles = await driver.getAllWindowHandles();
        await driver.switchToWindowWithTitle('MetaMask', windowHandles);
        await driver.clickElement('[data-testid="home__activity-tab"]');
        const revokeApprovalItem = await driver.findElement({
          css: '.transaction-list__completed-transactions',
          text: 'Approve Token with no spend limit',
        });
        assert.equal(await revokeApprovalItem.isDisplayed(), true);

        // Switch back to the dapp and verify that revoke approval for all message is displayed
        await driver.switchToWindowWithTitle('E2E Test Dapp', windowHandles);
        const revokeApprovalStatus = await driver.findElement({
          css: '#erc1155Status',
          text: 'Revoke completed',
        });
        assert.equal(await revokeApprovalStatus.isDisplayed(), true);
      },
    );
  });
});
