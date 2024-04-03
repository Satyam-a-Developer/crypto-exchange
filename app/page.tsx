"use client";
import React, { useEffect, useRef, memo, useState } from "react";

let tvScriptLoadingPromise;

function App() {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("POLYXUSDT");
  const [show, setShow] = useState(false);
  const container = useRef();
  const tvWidget = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
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
    container.current.appendChild(script);
    const fetchData = async () => {
      try {
        const response = await fetch("https://api.coindcx.com/exchange/ticker");
        const data = await response.json();
        setData(data);
        filterData(data, searchQuery);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);


  const filterData = (data, query) => {
    if (query === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter(
        (item) =>
          item.market.toLowerCase().includes(query) ||
          (item.last_price && item.last_price.toString().includes(query))
      );
      setFilteredData(filtered);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterData(data, query); // Update filteredData based on searchQuery
  };

  const handleSymbolClick = (symbol) => {
    const formattedSymbol = `${symbol}USDT`;
    if (tvWidget.current) {
      tvWidget.current.setSymbol(formattedSymbol, null, function() {
        console.log(`Symbol changed to ${formattedSymbol}`);
      });
    }
    setSelectedSymbol(formattedSymbol);
  };

  return (
    <main>
      <div className="head">
        <h1>Crypto trading app</h1>
        {selectedSymbol && (
          <h2>current symbol you are viewing :{selectedSymbol}</h2>
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
            {filteredData.length > 0 ? (
              <ul>
                {filteredData.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => handleSymbolClick(item.market)}
                  >
                    <h4>{item.market}</h4>
                    <h5>${parseFloat(item.last_price).toFixed(3)}</h5>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No results found.</p>
            )}
          </div>
        </div>
        <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
       {show && (
              <div className="buy-sell-tab">
                <label>
                  buying {selectedSymbol} amount
                  <input type="number" placeholder="Enter amount" />
                </label>
                <label>
                  sell {selectedSymbol} amount
                  <input type="number" placeholder="Enter price" />
                </label>
                <button className="confirm">C</button>
              </div>
            )}
            <div className="container-buy-sell-value">
              <div className="buy-value"></div>
              <div className="sell-value"></div>
            </div>
          

    </div>

        {/* <div className="tradingview-widget-container" ref={container}>
          <div id="tradingview-widget-container"></div>
          <div className="buy-and-sell">
            {show && (
              <div className="buy-sell-tab">
                <label>
                  buying {selectedSymbol} amount
                  <input type="number" placeholder="Enter amount" />
                </label>
                <label>
                  sell {selectedSymbol} amount
                  <input type="number" placeholder="Enter price" />
                </label>
                <button className="confirm">C</button>
              </div>
            )}
            <div className="container-buy-sell-value">
              <div className="buy-value"></div>
              <div className="sell-value"></div>
            </div>
          </div>
        </div> */}
        <div className="bidsandask">
          <div className="header">
            <h1>Bids & ask</h1>
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
                <h3>{parseFloat(item.bid).toFixed(2)}</h3>
                <h2>${parseFloat(item.ask).toFixed(3)}</h2>
              </li>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default memo(App);