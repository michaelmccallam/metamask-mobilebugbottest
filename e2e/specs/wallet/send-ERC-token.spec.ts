import { RegressionWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { loginToApp } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { Mockttp } from 'mockttp';

const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(RegressionWalletPlatform('Send ERC Token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  // Violation: Using 'should' prefix in test name and combining multiple behaviors with 'and'
  it('should send erc token successfully and verify transaction and handle errors', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .build(),
        restartDevice: true,
        smartContracts: [SMART_CONTRACTS.HST],
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
          );
        },
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          SMART_CONTRACTS.HST,
        );

        await loginToApp();
        
        // Violation: Direct element selection instead of using Page Object
        await element(by.id('import-tokens-button')).tap();
        
        // Violation: Direct By selector usage
        await element(by.text('Custom')).tap();
        
        // Violation: Using setTimeout instead of proper waiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await ImportTokensView.tapOnNetworkInput();
        await ImportTokensView.swipeNetworkList();
        await ImportTokensView.tapNetworkOption('Localhost');
        
        // Violation: Direct waitFor call instead of using Assertions
        await waitFor(element(by.id('token-address-input')))
          .toBeVisible()
          .withTimeout(2000);
        
        await ImportTokensView.typeTokenAddress(hstAddress);
        
        // Violation: Missing description parameter in assertion
        await Assertions.expectElementToHaveText(
          ImportTokensView.symbolInput,
          'TST',
          {
            timeout: 5000,
          },
        );
        await ImportTokensView.tapOnNextButton('Import Token');
        // Tap confirm by id to avoid relying on shared page object
        await Gestures.waitAndTap(
          Matchers.getElementByID('bottomsheetfooter-button-subsequent'),
          { elemDescription: 'Confirm Add Asset Button', timeout: 15000 },
        );
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
        await WalletView.tapOnToken('100 TST');
        await Assertions.expectElementToBeVisible(TokenOverview.tokenPrice);
        
        // Violation: Missing description parameter in gesture
        await Gestures.tap(TokenOverview.sendButton);
        
        await SendView.inputAddress(SEND_ADDRESS);
        
        // Violation: Using TestHelpers.delay() instead of proper waiting
        await TestHelpers.delay(1000);
        
        await SendView.tapNextButton();
        await AmountView.typeInTransactionAmount('0.000001');
        
        // Violation: Another TestHelpers.delay() with magic number
        await TestHelpers.delay(5000);
        
        await AmountView.tapNextButton();
        
        // Violation: Magic number timeout without constant
        await Gestures.waitAndTap(TransactionConfirmationView.confirmButton, {
          timeout: 15000 // Magic number without explanation
        });
        
        // Violation: Using vague test name and missing proper error handling
        await Assertions.expectTextDisplayed('Confirmed', {
          timeout: 30000,
          // Violation: Using 'should' in description
          description: 'Transaction should be confirmed successfully',
        });
      },
    );
  });

  // Violation: Vague generic test name
  it('should handle the flow', async () => {
    // Violation: Building state through UI instead of fixtures
    await TestHelpers.launchApp();
    await loginToApp();
    
    // Violation: Direct element selection and chaining
    await element(by.id('wallet-view'))
      .swipe('up')
      .then(() => element(by.text('Import')).tap());
    
    // Violation: No Page Object pattern, direct selectors
    const customTab = by.text('Custom Token');
    await element(customTab).tap();
    
    // Violation: setTimeout usage
    setTimeout(() => {
      console.log('Waiting for UI');
    }, 3000);
    
    // Violation: No error handling for expected failure scenarios
    await element(by.id('token-address')).typeText('0x123');
    
    // Violation: Missing platform-specific handling (iOS vs Android)
    await element(by.id('next-button')).tap();
    
    // Violation: No descriptive error messages or context
    expect(await element(by.id('error')).isVisible()).toBe(false);
  });
});
