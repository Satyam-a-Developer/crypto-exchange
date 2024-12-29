"use client";
import React, { useEffect, useRef, memo, useState } from "react";

interface CryptoData {
  market: string;
  last_price: number;
  bid: number;
  ask: number;
}

function App() {
  const [data, setData] = useState<CryptoData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredData, setFilteredData] = useState<CryptoData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("POLYXUSDT");
  const [show, setShow] = useState<boolean>(false);
  const container = useRef<HTMLDivElement>(null);
  const tvWidget = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "width": "930",
        "height": "610",
        "symbol": "NASDAQ:AAPL",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "hide_top_toolbar": true,
        "hide_legend": true,
        "save_image": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
      }`;

    if (container.current) {
      container.current.appendChild(script);
    } else {
      console.error("Container ref is not attached to a DOM element.");
    }

    const fetchData = async () => {
      try {
        const response = await fetch("https://api.coindcx.com/exchange/ticker");
        const result = await response.json();
        setData(result);
        filterData(result, searchQuery);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [searchQuery]);

  const filterData = (data: CryptoData[], query: string) => {
    if (query === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter(
        (item) =>
          item.market.toLowerCase().includes(query) ||
          (item.last_price &&
            item.last_price.toString().toLowerCase().includes(query))
      );
      setFilteredData(filtered);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterData(data, query);
  };

  const handleSymbolClick = (symbol: string) => {
    const formattedSymbol = `${symbol}USDT`;
    if (tvWidget.current) {
      tvWidget.current.setSymbol(formattedSymbol, null, () =>
        console.log(`Symbol changed to ${formattedSymbol}`)
      );
    }
    setSelectedSymbol(formattedSymbol);
  };

  return (
    <main>
      <div className="head">
        <h1>Crypto Trading App</h1>
        {selectedSymbol && (
          <h2>Current symbol you are viewing: {selectedSymbol}</h2>
        )}
      </div>
      <div className="container">
        <div className="coindata">
          <input
            type="text"
            placeholder="Search cryptocurrency..."
            value={searchQuery}
            onChange={handleSearch}
          />
          <div className="data">
            <ul>
              {filteredData.map((item, index) => (
                <li key={index} onClick={() => handleSymbolClick(item.market)}>
                  <h4>{item.market}</h4>
                  <h5>
                    $
                    {item.last_price !== undefined
                      ? parseFloat(item.last_price.toString()).toFixed(3)
                      : "N/A"}
                  </h5>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="tradingview-widget-container" ref={container}>
          <div className="tradingview-widget-container__widget"></div>
          {show && (
            <div className="buy-sell-tab">
              <label>
                Buying {selectedSymbol} amount
                <input type="number" placeholder="Enter amount" />
              </label>
              <label>
                Sell {selectedSymbol} amount
                <input type="number" placeholder="Enter price" />
              </label>
              <button className="confirm">Confirm</button>
            </div>
          )}
          <div className="container-buy-sell-value">
            <div className="buy-value"></div>
            <div className="sell-value"></div>
          </div>
        </div>
        <div className="bidsandask">
          <div className="header">
            <h1>Bids & Ask</h1>
          </div>
          <div className="buy-sell-btn">
            <button className="buy-btn" onClick={() => setShow(true)}>
              Buy
            </button>
            <button className="sell-btn" onClick={() => setShow(false)}>
              Sell
            </button>
          </div>
          <div className="biddata">
            {filteredData.map((item, index) => (
              <li key={index}>
                <h3>{parseFloat(item.bid.toString()).toFixed(2)}</h3>
                <h2>${parseFloat(item.ask.toString()).toFixed(3)}</h2>
              </li>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default memo(App);
