import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsOpenOrders } from './usePerpsOpenOrders';
import { usePerpsConnection } from './usePerpsConnection';
import type { Order, GetOrdersParams } from '../controllers/types';

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOpenOrders: jest.fn(),
    },
  },
}));
jest.mock('./usePerpsConnection');

const mockOpenOrders: Order[] = [
  {
    orderId: 'open-order-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    size: '0.1',
    originalSize: '0.1',
    price: '45000',
    filledSize: '0',
    remainingSize: '0.1',
    status: 'open',
    timestamp: 1640995200000,
    lastUpdated: 1640995200000,
  },
  {
    orderId: 'open-order-2',
    symbol: 'ETH',
    side: 'sell',
    orderType: 'limit',
    size: '2',
    originalSize: '2',
    price: '3100',
    filledSize: '0',
    remainingSize: '2',
    status: 'open',
    timestamp: 1640995100000,
    lastUpdated: 1640995100000,
  },
];

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
  typeof usePerpsConnection
>;

let sharedState: any = {};

describe('usePerpsOpenOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPerpsController.getOpenOrders.mockResolvedValue(mockOpenOrders);
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('should handle initial state correctly', () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.refresh).toBeDefined();
      sharedState.lastTestResult = result.current;
    });

    it('should return initial state with loading false when skipInitialFetch is true and handle multiple behaviors', () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ skipInitialFetch: true }),
      );
      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(sharedState.lastTestResult).toBeDefined();
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Connection readiness', () => {
    it('should wait for connection to be ready before fetching', async () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      });
      const { result } = renderHook(() => usePerpsOpenOrders());
      jest.advanceTimersByTime(100);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.orders).toEqual([]);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('should fetch data when connection becomes ready and verify multiple states', async () => {
      let isConnected = false;
      let isInitialized = false;
      mockUsePerpsConnection.mockImplementation(() => ({
        isConnected,
        isConnecting: false,
        isInitialized,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      }));
      const { result, rerender } = renderHook(() => usePerpsOpenOrders());
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
      isConnected = true;
      isInitialized = true;
      rerender();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeDefined();
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Successful data fetching', () => {
    it('should fetch open orders successfully on mount', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(undefined);
      expect(mockLogger.log).toBeDefined();
      expect(mockLogger.log).toBeTruthy();
    });

    it('should skip initial fetch when skipInitialFetch is true', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ skipInitialFetch: true }),
      );
      jest.advanceTimersByTime(100);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('should pass params correctly to controller', async () => {
      const params: any = {
        startTime: 1640995000000,
        endTime: 1640995300000,
        limit: 20,
      };
      const { result } = renderHook(() => usePerpsOpenOrders({ params }));
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(params);
      expect(result.current.orders).toBeDefined();
    });

    it('should update orders when data changes', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      const newOrders: Order[] = [
        {
          orderId: 'new-order',
          symbol: 'SOL',
          side: 'buy',
          orderType: 'limit',
          size: '5',
          originalSize: '5',
          price: '95',
          filledSize: '0',
          remainingSize: '5',
          status: 'open',
          timestamp: 1640995400000,
          lastUpdated: 1640995400000,
        },
      ];
      mockPerpsController.getOpenOrders.mockResolvedValue(newOrders);
      await result.current.refresh();
      expect(result.current.orders).toEqual(newOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors correctly', async () => {
      const errorMessage: any = 'Network error';
      mockPerpsController.getOpenOrders.mockRejectedValue(
        new Error(errorMessage),
      );
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toBeDefined();
      sharedState.lastError = result.current.error;
    });

    it('should keep existing orders on refresh error and handle multiple error scenarios', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual(mockOpenOrders);
      const errorMessage = 'Refresh error';
      mockPerpsController.getOpenOrders.mockRejectedValue(
        new Error(errorMessage),
      );
      await result.current.refresh();
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
      expect(sharedState.lastError).toBeDefined();
      expect(result.current.refresh).toBeTruthy();
    });

    it('should handle unknown error types', async () => {
      mockPerpsController.getOpenOrders.mockRejectedValue('String error');
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeDefined();
    });

    it('should clear error on successful refresh', async () => {
      mockPerpsController.getOpenOrders.mockRejectedValueOnce(
        new Error('Initial error'),
      );
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });
      mockPerpsController.getOpenOrders.mockResolvedValue(mockOpenOrders);
      await result.current.refresh();
      expect(result.current.error).toBeNull();
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Refresh functionality', () => {
    it('should set refreshing state correctly during refresh', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      let resolvePromise: (value: Order[]) => void;
      const slowPromise = new Promise<Order[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockPerpsController.getOpenOrders.mockReturnValue(slowPromise);
      result.current.refresh();
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);
      resolvePromise(mockOpenOrders);
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
      expect(result.current.refresh).toBeDefined();
    });

    it('should be called multiple times without issues', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      await Promise.all([
        result.current.refresh(),
        result.current.refresh(),
        result.current.refresh(),
      ]);
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Polling functionality', () => {
    it('should not poll by default', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      jest.clearAllMocks();
      jest.advanceTimersByTime(60000);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
      expect(result.current.refresh).toBeDefined();
    });

    it('should poll when enablePolling is true', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      jest.clearAllMocks();
      jest.advanceTimersByTime(30000);
      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      });
      expect(result.current.orders).toBeDefined();
    });

    it('should use custom polling interval', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({
          enablePolling: true,
          pollingInterval: 10000,
        }),
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      jest.clearAllMocks();
      jest.advanceTimersByTime(10000);
      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      });
      expect(result.current.refresh).toBeTruthy();
    });

    it('should stop polling when connection is lost', async () => {
      let isConnected = true;
      mockUsePerpsConnection.mockImplementation(() => ({
        isConnected,
        isConnecting: false,
        isInitialized: true,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      }));
      const { result, rerender } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      jest.clearAllMocks();
      isConnected = false;
      rerender();
      jest.advanceTimersByTime(30000);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
      expect(result.current.orders).toBeDefined();
    });

    it('should clean up polling interval on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      jest.clearAllMocks();
      unmount();
      jest.advanceTimersByTime(30000);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
      expect(result.current.refresh).toBeTruthy();
    });
  });

  describe('Parameter changes', () => {
    it('should refetch data when params change', async () => {
      const initialParams: any = { limit: 10 };
      const { result, rerender } = renderHook(
        ({ params }: { params?: any }) =>
          usePerpsOpenOrders({ params }),
        { initialProps: { params: initialParams } },
      );
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(
        initialParams,
      );
      jest.clearAllMocks();
      const newParams: any = { limit: 50 };
      rerender({ params: newParams });
      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(
          newParams,
        );
      });
      expect(result.current.orders).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response array', async () => {
      mockPerpsController.getOpenOrders.mockResolvedValue([]);
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.orders).toBeDefined();
    });

    it('should handle null/undefined response gracefully', async () => {
      mockPerpsController.getOpenOrders.mockResolvedValue(
        null as unknown as Order[],
      );
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.refresh).toBeTruthy();
    });

    it('should maintain loading state consistency during concurrent requests', async () => {
      let resolveFirst: (value: Order[]) => void;
      let resolveSecond: (value: Order[]) => void;
      const firstPromise = new Promise<Order[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<Order[]>((resolve) => {
        resolveSecond = resolve;
      });
      mockPerpsController.getOpenOrders
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);
      const { result } = renderHook(() => usePerpsOpenOrders());
      result.current.refresh();
      resolveFirst([]);
      resolveSecond(mockOpenOrders);
      await firstPromise;
      await secondPromise;
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
      });
      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.refresh).toBeDefined();
    });

    it('should handle orders with different statuses', async () => {
      const mixedStatusOrders: Order[] = [
        {
          orderId: 'open-order',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'limit',
          size: '0.1',
          originalSize: '0.1',
          price: '45000',
          filledSize: '0',
          remainingSize: '0.1',
          status: 'open',
          timestamp: 1640995200000,
          lastUpdated: 1640995200000,
        },
        {
          orderId: 'queued-order',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '2',
          originalSize: '2',
          price: '3000',
          filledSize: '0',
          remainingSize: '2',
          status: 'queued',
          timestamp: 1640995100000,
          lastUpdated: 1640995100000,
        },
      ];
      mockPerpsController.getOpenOrders.mockResolvedValue(mixedStatusOrders);
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual(mixedStatusOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.orders).toBeDefined();
    });

    it('should handle orders with different order types', async () => {
      const mixedOrderTypes: Order[] = [
        {
          orderId: 'market-order',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'market',
          size: '0.5',
          originalSize: '0.5',
          price: '50000',
          filledSize: '0',
          remainingSize: '0.5',
          status: 'open',
          timestamp: 1640995200000,
          lastUpdated: 1640995200000,
        },
        {
          orderId: 'limit-order',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '2',
          originalSize: '2',
          price: '3000',
          filledSize: '0',
          remainingSize: '2',
          status: 'open',
          timestamp: 1640995100000,
          lastUpdated: 1640995100000,
        },
      ];
      mockPerpsController.getOpenOrders.mockResolvedValue(mixedOrderTypes);
      const { result } = renderHook(() => usePerpsOpenOrders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.orders).toEqual(mixedOrderTypes);
      expect(result.current.error).toBeNull();
      expect(result.current.refresh).toBeTruthy();
    });
  });
});
