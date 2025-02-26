"use client";

import React, { useEffect, useRef, memo, useState, useCallback, useMemo } from "react";
import { debounce } from "lodash";

interface CryptoData {
  market: string;
  last_price: number;
  bid: number;
  ask: number;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  timestamp: string;
}

const CoinItem = memo(({ item, onClick, isSelected }: { item: CryptoData; onClick: (symbol: string) => void; isSelected: boolean }) => (
  <li className={`coindata-item ${isSelected ? "active" : ""}`} onClick={() => onClick(item.market)}>
    <div>
      <span className="coindata-item-name">{item.market}</span>
      <span className="coindata-item-bid">Bid: ${Number(item.bid || 0).toFixed(2)}</span>
    </div>
    <div>
      <span className="coindata-item-price">${!isNaN(Number(item.last_price)) ? Number(item.last_price).toFixed(2) : "0.00"}</span>
      <span className={`coindata-item-ask ${Number(item.ask || 0) < Number(item.bid || 0) ? "negative" : ""}`}>
        Ask: ${Number(item.ask || 0).toFixed(2)}
      </span>
    </div>
  </li>
));
CoinItem.displayName = 'CoinItem';

const TransactionItem = memo(({ transaction }: { transaction: Transaction }) => (
  <div className="transaction-item">
    <span className={`transaction-item-type ${transaction.type}`}>{transaction.type.toUpperCase()} {transaction.symbol}</span>
    <span className="transaction-item-details">{new Date(transaction.timestamp).toLocaleTimeString()}</span>
    <span className="transaction-item-amount">{transaction.amount} @ ${transaction.price.toFixed(2)}</span>
  </div>
));
TransactionItem.displayName = 'TransactionItem';

function App() {
  const [data, setData] = useState<CryptoData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredData, setFilteredData] = useState<CryptoData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [showTradingPanel, setShowTradingPanel] = useState<boolean>(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
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

  const filterData = useCallback((data: CryptoData[], query: string) => {
    const usdtPairs = data.filter(item => item.market.endsWith("USDT"));
    if (!query.trim()) return usdtPairs.slice(0, 100);
    return usdtPairs.filter(item => item.market.toLowerCase().includes(query.toLowerCase()) || item.last_price.toString().includes(query)).slice(0, 50);
  }, []);

  const debouncedSearch = useCallback(debounce((query: string) => setFilteredData(filterData(data, query)), 300), [data, filterData]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleSymbolClick = useCallback((symbol: string) => {
    if (!symbol.endsWith("USDT")) return;
    setSelectedSymbol(symbol);
    setAmount("");
    setPrice("");
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
        setError("Failed to load cryptocurrency data. Please try again.");
        setIsLoading(false);
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [isClient, filterData, searchQuery]);

  return (
    <main className="main-container">
      <header className="header">
        <h1 className="header-title">CryptoTrader Pro</h1>
      </header>
      <div className="content-container">
        <div className="coindata">
          <input type="text" className="search-input" placeholder="Search..." value={searchQuery} onChange={handleSearch} />
          <ul className="coindata-list">
            {isLoading ? <div>Loading...</div> : filteredData.map((item, index) => <CoinItem key={index} item={item} onClick={handleSymbolClick} isSelected={selectedSymbol === item.market} />)}
          </ul>
        </div>
      </div>
    </main>
  );
}

export default memo(App);
