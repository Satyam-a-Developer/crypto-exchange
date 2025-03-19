"use client";
import React, { useEffect, useRef, memo, useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";
import "../app/globals.css";

interface CryptoData {
  market: string;
  last_price: number;
  bid: number;
  ask: number;
}

interface Transaction {
  id: string;
  type: "buy" | "sell";
  symbol: string;
  amount: number;
  price: number;
  timestamp: string;
}

const CoinItem = memo(function CoinItem({
  item,
  onClick,
  isSelected,
}: {
  item: CryptoData;
  onClick: (symbol: string) => void;
  isSelected: boolean;
}) {
  return (
    <li className={`coindata-item ${isSelected ? "active" : ""}`} onClick={() => onClick(item.market)}>
      <div>
        <span className="coindata-item-name">{item.market}</span>
        <span className="coindata-item-bid">Bid: ${Number(item.bid || 0).toFixed(2)}</span>
      </div>
      <div>
        <span className="coindata-item-price">
          ${!isNaN(Number(item.last_price)) ? Number(item.last_price).toFixed(2) : "0.00"}
        </span>
        <span className={`coindata-item-ask ${Number(item.ask || 0) < Number(item.bid || 0) ? "negative" : ""}`}>
          Ask: ${Number(item.ask || 0).toFixed(2)}
        </span>
      </div>
    </li>
  );
});
CoinItem.displayName = "CoinItem";

const TransactionItem = memo(function TransactionItem({ transaction }: { transaction: Transaction }) {
  return (
    <div className="transaction-item">
      <span className={`transaction-item-type ${transaction.type}`}>
        {transaction.type.toUpperCase()} {transaction.symbol}
      </span>
      <span className="transaction-item-details">{new Date(transaction.timestamp).toLocaleTimeString()}</span>
      <span className="transaction-item-amount">
        {transaction.amount} @ ${transaction.price.toFixed(2)}
      </span>
    </div>
  );
});
TransactionItem.displayName = "TransactionItem";

function App() {
  const [data, setData] = useState<CryptoData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredData, setFilteredData] = useState<CryptoData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [showTradingPanel, setShowTradingPanel] = useState<boolean>(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(1000);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);

  const chartContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("https://api.coindcx.com/exchange/ticker");
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const result = await response.json();
        setData(result);
        setFilteredData(filterData(result, searchQuery));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load cryptocurrency data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [isClient, searchQuery]);

  const filterData = useCallback((data: CryptoData[], query: string) => {
    const usdtPairs = data.filter((item) => item.market.endsWith("USDT"));
    if (!query.trim()) return usdtPairs.slice(0, 100);
    return usdtPairs
      .filter(
        (item) =>
          item.market.toLowerCase().includes(query.toLowerCase()) ||
          (item.last_price && item.last_price.toString().includes(query))
      )
      .slice(0, 50);
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => setFilteredData(filterData(data, query)), 300),
    [data, filterData]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // List of known valid Binance USDT pairs (partial list, expand as needed)
  const validBinancePairs = useMemo(
    () => [
      "BTCUSDT",
      "ETHUSDT",
      "BNBUSDT",
      "XRPUSDT",
      "ADAUSDT",
      "SOLUSDT",
      "DOGEUSDT",
      "DOTUSDT",
      "MATICUSDT",
      "SHIBUSDT",
    ],
    []
  );

  const isValidSymbol = useCallback(
    (symbol: string) => {
      return validBinancePairs.includes(symbol.toUpperCase());
    },
    [validBinancePairs]
  );

  const handleSymbolClick = useCallback(
    (symbol: string) => {
      if (!symbol.endsWith("USDT")) {
        console.warn(`Symbol ${symbol} is not a USDT pair; skipping TradingView update.`);
        return;
      }

      const normalizedSymbol = symbol.toUpperCase();
      const baseSymbol = normalizedSymbol.replace("USDT", "");
      const formattedSymbol = `BINANCE:${baseSymbol}USDT`;

      // Check if the symbol is valid; fallback to BTCUSDT if not
      if (!isValidSymbol(normalizedSymbol)) {
        console.warn(`Invalid or unsupported symbol: ${normalizedSymbol}. Falling back to BTCUSDT.`);
        setSelectedSymbol("BTCUSDT");
        handleSymbolClick("BTCUSDT"); // Recursive call with fallback
        return;
      }

      setSelectedSymbol(normalizedSymbol);
      setAmount("");
      setPrice("");

      if (chartContainer.current) {
        chartContainer.current.innerHTML = "";
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
          width: "100%",
          height: "600",
          symbol: formattedSymbol,
          interval: "15",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: true,
          calendar: false,
          support_host: "https://www.tradingview.com",
          toolbar_bg: "#151924",
          withdateranges: true,
        });

        script.onerror = () => {
          console.error(`Failed to load TradingView widget for ${formattedSymbol}`);
          setSelectedSymbol("BTCUSDT");
          handleSymbolClick("BTCUSDT");
        };

        chartContainer.current.appendChild(script);
      }
    },
    [isValidSymbol]
  );

  useEffect(() => {
    if (isClient && chartContainer.current) {
      handleSymbolClick(selectedSymbol);
    }
  }, [isClient, selectedSymbol, handleSymbolClick]);

  const toggleTradingPanel = (type: "buy" | "sell") => {
    setTradeType(type);
    setShowTradingPanel(true);
  };

  const confirmTrade = useCallback(() => {
    const tradeAmount = Number(amount);
    const tradePrice = Number(price);
    const totalCost = tradeAmount * tradePrice;

    if (isNaN(tradeAmount) || isNaN(tradePrice) || tradeAmount <= 0 || tradePrice <= 0) {
      alert("Please enter valid amount and price.");
      return;
    }

    if (tradeType === "buy" && totalCost > walletBalance) {
      alert("Insufficient wallet balance for this purchase.");
      return;
    }

    if (tradeType === "buy") {
      setWalletBalance((prev) => prev - totalCost);
    } else {
      setWalletBalance((prev) => prev + totalCost);
    }

    const transaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: tradeType,
      symbol: selectedSymbol,
      amount: tradeAmount,
      price: tradePrice,
      timestamp: new Date().toISOString(),
    };

    setTransactions((prev) => [transaction, ...prev.slice(0, 49)]);
    setShowTradingPanel(false);
    setAmount("");
    setPrice("");
    alert(`${tradeType === "buy" ? "Bought" : "Sold"} ${tradeAmount} ${selectedSymbol} at $${tradePrice}`);
  }, [amount, price, tradeType, walletBalance, selectedSymbol]);

  const selectedCryptoData = useMemo(
    () => data.find((item) => item.market === selectedSymbol) || { bid: 0, ask: 0, last_price: 0 },
    [data, selectedSymbol]
  );
  const lastPrice = Number(selectedCryptoData.last_price) || 0;
  const bidPrice = Number(selectedCryptoData.bid) || 0;
  const askPrice = Number(selectedCryptoData.ask) || 0;

  const walletDisplay = useMemo(() => `$${walletBalance.toFixed(2)} USDT`, [walletBalance]);

  return (
    <main className="main-container">
      <header className="header">
        <div className="flex items-center">
          <h1 className="header-title">Crypto exchange</h1>
        </div>
        {isClient && selectedSymbol && (
          <div className="header-symbol">
            <span className="header-symbol-name">{selectedSymbol}</span>
            <span className="header-symbol-price">${lastPrice.toFixed(2)}</span>
          </div>
        )}
      </header>

      <div className="content-container">
        <div className="coindata">
          <div className="coindata-search">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Search cryptocurrency..."
                value={searchQuery}
                onChange={handleSearch}
              />
              <svg
                className="search-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
          </div>
          <div className="coindata-list">
            {!isClient || isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="loading-spinner"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 p-4 text-center">{error}</div>
            ) : (
              filteredData.map((item, index) => (
                <CoinItem
                  key={index}
                  item={item}
                  onClick={handleSymbolClick}
                  isSelected={selectedSymbol === item.market}
                />
              ))
            )}
          </div>
        </div>

        <div className="chart-container">
          {isClient && <div className="chart-wrapper" ref={chartContainer}></div>}
          {!isClient && (
            <div className="flex justify-center items-center h-full">
              <div className="loading-spinner"></div>
            </div>
          )}
          {isClient && showTradingPanel && (
            <div className="trading-panel">
              <div className="trading-panel-header">
                <h3 className="trading-panel-title">
                  {tradeType === "buy" ? "Buy" : "Sell"} {selectedSymbol}
                </h3>
                <button onClick={() => setShowTradingPanel(false)} className="trading-panel-close">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="trading-panel-label">
                    Amount ({selectedSymbol.replace("USDT", "")})
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="trading-panel-input"
                  />
                </div>
                <div>
                  <label className="trading-panel-label">Price (USDT)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={lastPrice.toString()}
                    className="trading-panel-input"
                  />
                </div>
                <div className="trading-panel-total">
                  Total:{" "}
                  <span className="trading-panel-total-value">
                    ${amount && price ? (Number(amount) * Number(price)).toFixed(2) : "0.00"} USDT
                  </span>
                </div>
                <button
                  onClick={confirmTrade}
                  disabled={!amount || !price}
                  className={`trading-panel-button ${tradeType === "buy" ? "buy" : "sell"}`}
                >
                  {tradeType === "buy" ? "Buy" : "Sell"} {selectedSymbol.replace("USDT", "")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="order-book">
          <div className="order-book-header">
            <h2 className="order-book-title">Trade {selectedSymbol}</h2>
            <div className="wallet-balance">
              <div className="wallet-balance-title">Wallet Balance</div>
              <div className="wallet-balance-value">{walletDisplay}</div>
            </div>
            <div className="order-book-buttons">
              <button onClick={() => toggleTradingPanel("buy")} className="order-book-button buy">
                Buy
              </button>
              <button onClick={() => toggleTradingPanel("sell")} className="order-book-button sell">
                Sell
              </button>
            </div>
            {isClient && (
              <div className="order-book-summary">
                <div className="order-book-summary-item">
                  <span className="order-book-summary-label">Last Price</span>
                  <span className="order-book-summary-value">${lastPrice.toFixed(2)}</span>
                </div>
                <div className="order-book-summary-item">
                  <span className="order-book-summary-label">24h Change</span>
                  <span
                    className={`order-book-summary-value ${
                      askPrice > bidPrice ? "positive" : "negative"
                    }`}
                  >
                    {bidPrice > 0 ? ((askPrice - bidPrice) / bidPrice * 100).toFixed(2) : "0.00"}%
                  </span>
                </div>
                <div className="order-book-summary-item">
                  <span className="order-book-summary-label">24h Volume</span>
                  <span className="order-book-summary-value">
                    {Math.floor(Math.random() * 10000).toLocaleString()} USDT
                  </span>
                </div>
              </div>
            )}
            {isClient && (
              <div className="transaction-history">
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="transaction-history-toggle"
                >
                  {showTransactions ? "Hide" : "Show"} Transaction History
                </button>
                {showTransactions && (
                  <div className="transaction-history-list">
                    {transactions.length === 0 ? (
                      <p className="text-center text-gray-400 p-2">No transactions yet.</p>
                    ) : (
                      transactions.map((transaction) => (
                        <TransactionItem key={transaction.id} transaction={transaction} />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {isClient && (
            <div className="order-book-content">
              <h3 className="order-book-subtitle">Order Book</h3>
              <div className="order-book-table-header">
                <span>Price (USDT)</span>
                <span>Amount</span>
                <span>Total</span>
              </div>
              <div className="order-book-table">
                {[...Array(5)].map((_, i) => {
                  const askPriceVal = askPrice * (1 + i * 0.001);
                  const randomAmount = (0.5 + i * 0.1).toFixed(4);
                  return (
                    <div key={`ask-${i}`} className="order-book-table-row ask">
                      <span>${askPriceVal.toFixed(2)}</span>
                      <span>{randomAmount}</span>
                      <span>${(askPriceVal * Number(randomAmount)).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="order-book-table-row order-book-table-current">
                  <span>${lastPrice.toFixed(2)}</span>
                  <span>{lastPrice.toFixed(8)}</span>
                  <span>${(lastPrice * 0.5).toFixed(2)}</span>
                </div>
                {[...Array(5)].map((_, i) => {
                  const bidPriceVal = bidPrice * (1 - i * 0.001);
                  const randomAmount = (0.7 + i * 0.15).toFixed(4);
                  return (
                    <div key={`bid-${i}`} className="order-book-table-row bid">
                      <span>${bidPriceVal.toFixed(2)}</span>
                      <span>{randomAmount}</span>
                      <span>${(bidPriceVal * Number(randomAmount)).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!isClient && (
            <div className="flex-1 flex justify-center items-center">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default memo(App);