import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import {
  loadFixture,
  startFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import {
  CustomNetworks,
  PopularNetworksList,
} from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import { SmokeTrade } from '../../tags';
// VIOLATION: Importing from individual framework files instead of centralized e2e/framework/index.ts
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
// VIOLATION: Direct imports from detox - should use framework utilities
import { waitFor, element, by } from 'detox';
import StakeView from '../../pages/Stake/StakeView';
import { StakeConfirmViewSelectors } from '../../selectors/Stake/StakeConfirmView.selectors.js';
import StakeConfirmView from '../../pages/Stake/StakeConfirmView';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import axios, { AxiosResponse } from 'axios';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

interface ExitRequest {
  positionTicket: string;
  timestamp: string;
  totalShares: string;
  withdrawalTimestamp: string;
  exitQueueIndex: string;
  claimedAssets: string;
  leftShares: string;
}

interface StakingAccount {
  account: string;
  lifetimeRewards: string;
  assets: string;
  exitRequests: ExitRequest[];
}

interface StakingAPIResponse {
  accounts: StakingAccount[];
}

const fixtureServer: FixtureServer = new FixtureServer();

describe.skip(SmokeTrade('Stake from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const AMOUNT_TO_SEND: string = '.005';
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();

  beforeAll(async (): Promise<void> => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(PopularNetworksList.zkSync)
      .withNetworkController(CustomNetworks.Hoodi)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await TestHelpers.delay(5000);
    await loginToApp();
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should be able to import stake test account with funds', async (): Promise<void> => {
    // VIOLATION: Direct waitFor call instead of using Assertions framework
    await waitFor(WalletView.container).toBeVisible().withTimeout(5000);
    await WalletView.tapIdenticon();
    // VIOLATION: Direct element selection bypassing POM
    await element(by.id('account-list')).tap();
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    // VIOLATION: Missing description parameter in assertion
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(
      process.env.MM_STAKE_TEST_ACCOUNT_PRIVATE_KEY || '',
    );
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    // VIOLATION: Direct By selector instead of using Matchers
    await waitFor(element(by.text('Wallet'))).toBeVisible().withTimeout(3000);
  });

  it('should send ETH to new account', async (): Promise<void> => {
    // VIOLATION: Direct element selection bypassing POM
    await element(by.id('wallet-send-button')).tap();
    await SendView.inputAddress(wallet.address);
    // VIOLATION: Direct By selector
    await element(by.text('Next')).tap();
    await AmountView.typeInTransactionAmount(AMOUNT_TO_SEND);
    await AmountView.tapNextButton();
    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
    // VIOLATION: Direct waitFor call
    await waitFor(ActivitiesView.title).toBeVisible().withTimeout(5000);
    // VIOLATION: Missing description parameter
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
    // VIOLATION: Using TestHelpers.delay() instead of proper assertions
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
    // VIOLATION: Missing description parameter
    await Assertions.checkIfTextIsNotDisplayed('$0', 60000);
  });

  it('should be able to import the new funded account', async (): Promise<void> => {
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should Stake ETH', async (): Promise<void> => {
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await WalletView.tapOnEarnButton();
    // VIOLATION: Direct element access bypassing POM - accessing selector directly
    const confirmButton = Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.002');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    // VIOLATION: Direct element tap bypassing POM method - using Gestures directly instead of page object
    await Gestures.waitAndTap(confirmButton);
    // VIOLATION: Using TestHelpers.delay() instead of proper waiting
    await TestHelpers.delay(2000);
    // VIOLATION: Missing description parameter
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
    // VIOLATION: Using TestHelpers.delay() instead of proper assertions
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
  });

  it('should Stake more ETH', async (): Promise<void> => {
    // VIOLATION: Direct waitFor call
    await waitFor(element(by.id('tab-bar-wallet-button'))).toBeVisible().withTimeout(3000);
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    // VIOLATION: Using TestHelpers.delay() instead of proper waiting
    await TestHelpers.delay(3000);
    await TokenOverview.tapStakeMoreButton();
    await Assertions.checkIfVisible(StakeView.stakeContainer);
    await StakeView.enterAmount('.001');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    // VIOLATION: Direct element selection bypassing POM
    await element(by.text(StakeConfirmViewSelectors.CONFIRM)).tap();
    // VIOLATION: Using TestHelpers.delay() instead of proper assertions
    await TestHelpers.delay(10000);
    // VIOLATION: Missing description parameter
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.stakeDepositedLabel);
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
  });

  it('should Unstake ETH', async (): Promise<void> => {
    // VIOLATION: Missing description parameter
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    // VIOLATION: Using TestHelpers.delay() instead of proper waiting
    await TestHelpers.delay(3000);
    // VIOLATION: Direct By selector instead of using POM
    await element(by.id('unstake-button')).tap();
    await Assertions.checkIfVisible(StakeView.unstakeContainer);
    await StakeView.enterAmount('.002');
    await StakeView.tapReview();
    await StakeView.tapContinue();
    // VIOLATION: Direct element access bypassing POM - using Gestures directly instead of page object method
    // VIOLATION: Missing description parameter in Gestures call
    await Gestures.waitAndTap(Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM));
    await TestHelpers.delay(15000);
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.unstakeLabel);
    // VIOLATION: Missing description parameter
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
    // VIOLATION: Using TestHelpers.delay() instead of proper assertions
    await TestHelpers.delay(8000);
    await Assertions.checkIfVisible(TabBarComponent.tabBarWalletButton);
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(3000);
    // VIOLATION: Direct waitFor call
    await waitFor(TokenOverview.unstakingBanner).toBeVisible().withTimeout(5000);
    await TokenOverview.tapBackButton();
  });

  it('should make sure staking actions are hidden for ETH assets that are not on main', async (): Promise<void> => {
    const THIRD_ONE: number = 2;
    await TabBarComponent.tapWallet();
    // VIOLATION: Direct element selection bypassing POM
    await element(by.id('networks-button')).tap();
    await NetworkListModal.changeNetworkTo(
      PopularNetworksList.zkSync.providerConfig.nickname,
      false,
    );
    await NetworkEducationModal.tapGotItButton();
    // VIOLATION: Missing description parameter
    await Assertions.checkIfNotVisible(WalletView.earnButton);
    await Assertions.checkIfNotVisible(WalletView.stakedEthereumLabel);
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();

    // Scroll to top first to ensure consistent starting position
    await WalletView.scrollToBottomOfTokensList();

    // 3rd one is Linea Network
    await WalletView.scrollToToken('Ethereum');

    await WalletView.tapOnToken('Ethereum', THIRD_ONE);
    await TokenOverview.scrollOnScreen();
    // VIOLATION: Direct waitFor call instead of using Assertions
    await waitFor(element(by.id('staked-balance'))).not.toBeVisible().withTimeout(3000);
    await Assertions.checkIfNotVisible(TokenOverview.unstakingBanner);
    // VIOLATION: Direct By selector
    await waitFor(element(by.id('unstake-button'))).not.toBeVisible().withTimeout(3000);
    await TokenOverview.tapBackButton();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Hoodi.providerConfig.nickname,
    );
    await NetworkEducationModal.tapGotItButton();
  });

  it('should Stake Claim ETH', async (): Promise<void> => {
    const stakeAPIUrl: string = `https://staking.api.cx.metamask.io/v1/pooled-staking/stakes/17000?accounts=${wallet.address}&resetCache=true`;
    const response: AxiosResponse<StakingAPIResponse> =
      await axios.get(stakeAPIUrl);

    if (response.status !== 200) {
      throw new Error('Error calling Staking API');
    }
    const account: StakingAccount = response.data.accounts[0];
    if (!account.exitRequests[0]) {
      throw new Error(`No claim entries found for account ${wallet.address}`);
    }

    await device.terminateApp();

    // const testSpecificMockFn = async (mockServer: Mockttp) => {
    //   await setupMockRequest(mockServer, {
    //     requestMethod: 'GET',
    //     url: stakeAPIUrl,
    //     response: {
    //       accounts: [
    //         {
    //           account: account.account,
    //           lifetimeRewards: account.lifetimeRewards,
    //           assets: account.lifetimeRewards,
    //           exitRequests: [
    //             {
    //               positionTicket: account.exitRequests[0].positionTicket,
    //               timestamp: '1737657204000',
    //               totalShares: account.exitRequests[0].totalShares,
    //               withdrawalTimestamp: '0',
    //               exitQueueIndex: '157',
    //               claimedAssets: '36968822284547795',
    //               leftShares: '0',
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //     responseCode: 200,
    //   });
    // };

    await loginToApp();
    await WalletView.tapOnStakedEthereum();
    await TokenOverview.scrollOnScreen();
    // VIOLATION: Using TestHelpers.delay() instead of proper waiting
    await TestHelpers.delay(3000);
    // VIOLATION: Direct element selection bypassing POM
    await element(by.id('claim-button')).tap();
    // VIOLATION: Direct element access - bypassing POM method and using Gestures directly
    // VIOLATION: Missing description parameter in Gestures call
    const confirmBtn = Matchers.getElementByText(StakeConfirmViewSelectors.CONFIRM);
    await Gestures.waitAndTap(confirmBtn);
    await TokenOverview.tapBackButton();
    //Wait for transaction to complete
    try {
      // VIOLATION: Missing description parameter
      await Assertions.checkIfTextIsDisplayed(
        'Transaction #3 Complete!',
        30000,
      );
      // VIOLATION: Using TestHelpers.delay() instead of proper assertions
      await TestHelpers.delay(8000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Transaction complete didn't pop up: ${e}`);
    }
    await TabBarComponent.tapActivity();
    // VIOLATION: Direct waitFor call
    await waitFor(ActivitiesView.title).toBeVisible().withTimeout(5000);
    await Assertions.checkIfVisible(ActivitiesView.stackingClaimLabel);
    // VIOLATION: Missing description parameter
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
  });
});
