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
    <main className="flex flex-col items-center bg-black text-white min-h-screen overflow-hidden">
      <div className="head w-full bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl text-aqua">Crypto Trading App</h1>
        {selectedSymbol && (
          <h2 className="text-md text-white">Current symbol: {selectedSymbol}</h2>
        )}
      </div>
      <div className="container flex w-full">
        <div className="coindata flex flex-col items-center p-4 bg-gray-900 w-1/4 h-screen overflow-y-scroll">
          <input
            type="text"
            className="mb-4 p-2 text-lg rounded"
            placeholder="Search cryptocurrency..."
            value={searchQuery}
            onChange={handleSearch}
          />
          <ul className="w-full">
            {filteredData.map((item, index) => (
              <li
                key={index}
                className="flex justify-between items-center p-4 mb-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                onClick={() => handleSymbolClick(item.market)}
              >
                <h4 className="text-aqua">{item.market}</h4>
                <h5>
                  $
                  {item.last_price && !isNaN(Number(item.last_price))
                    ? Number(item.last_price).toFixed(3)
                    : "N/A"}
                </h5>
              </li>
            ))}
          </ul>
        </div>
        <div className="tradingview-widget-container w-3/4 p-4 flex flex-col items-center relative">
          <div className="tradingview-widget-container__widget" ref={container}></div>
          {show && (
            <div className="buy-sell-tab absolute top-1/4 flex justify-around items-center bg-teal-500 p-4 rounded w-full">
              <label className="text-white">
                Buying {selectedSymbol} amount
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="ml-2 p-2 rounded"
                />
              </label>
              <label className="text-white">
                Sell {selectedSymbol} amount
                <input
                  type="number"
                  placeholder="Enter price"
                  className="ml-2 p-2 rounded"
                />
              </label>
              <button className="confirm p-2 bg-blue-500 text-white rounded">
                Confirm
              </button>
            </div>
          )}
          <div className="container-buy-sell-value w-full absolute bottom-0 p-4 bg-aqua flex justify-between">
            <div className="buy-value">Buy Value</div>
            <div className="sell-value">Sell Value</div>
          </div>
        </div>
        <div className="bidsandask w-1/4 h-screen p-4 overflow-y-scroll">
          <div className="header mb-4">
            <h1 className="text-aqua">Bids & Ask</h1>
          </div>
          <div className="buy-sell-btn flex justify-center mb-4">
            <button
              className="buy-btn bg-green-500 text-white px-4 py-2 rounded mr-4"
              onClick={() => setShow(true)}
            >
              Buy
            </button>
            <button
              className="sell-btn bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => setShow(false)}
            >
              Sell
            </button>
          </div>
          <div className="biddata">
            {filteredData.map((item, index) => (
              <li
                key={index}
                className="flex justify-between items-center p-4 mb-2 bg-gray-700 rounded"
              >
                <h3>
                  {item.bid && !isNaN(Number(item.bid))
                    ? Number(item.bid).toFixed(2)
                    : "N/A"}
                </h3>
                <h2>
                  ${item.ask && !isNaN(Number(item.ask))
                    ? Number(item.ask).toFixed(3)
                    : "N/A"}
                </h2>
              </li>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default memo(App);
