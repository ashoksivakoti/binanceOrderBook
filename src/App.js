import React, { useState, useEffect } from 'react';

const App = () => {
  const [tradingPairs, setTradingPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('');
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        if (!response.ok) {
          throw new Error('Failed to fetch trading pairs');
        }
        const data = await response.json();
        setTradingPairs(data.symbols.map((symbol) => symbol.symbol));
        setError(null);
      } catch (error) {
        console.error('Failed to fetch trading pairs:', error);
        setError('Failed to fetch trading pairs. Please try again later.');
      }
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    let socket;

    const subscribeToOrderBook = () => {
      socket = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedPair.toLowerCase()}@depth`);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.e === 'depthUpdate') {
          updateOrderBook(data);
        } else if (data.e === 'depthSnapshot') {
          handleOrderBookSnapshot(data);
        }
      };

      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Failed to establish websocket connection. Please try again later.');
      };
    };

    const updateOrderBook = (data) => {
      if (!data.b || !data.a) {
        console.error('Invalid WebSocket message:', data);
        return;
      }

      const bids = data.b.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]);
      const asks = data.a.map(([price, quantity]) => [parseFloat(price), parseFloat(quantity)]);

      setOrderBook({ bids, asks });
    };

    const handleOrderBookSnapshot = (data) => {
      if (!data.bids || !data.asks) {
        console.error('Invalid WebSocket message:', data);
        return;
      }

      const bids = data.bids.map(([price, volume]) => [parseFloat(price), parseFloat(volume)]);
      const asks = data.asks.map(([price, volume]) => [parseFloat(price), parseFloat(volume)]);

      setOrderBook({ bids, asks });
    };

    if (selectedPair) {
      subscribeToOrderBook();
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [selectedPair]);

  const handlePairChange = (event) => {
    setSelectedPair(event.target.value);
    setError(null);
  };

  
  const renderBuyOrders = () => {
    return (
      <div>
        <h3>Buy Orders</h3>
        <table className="order-book">
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {orderBook.bids.map(([price, quantity], index) => (
              <tr key={index} className="buy-order">
                <td style={{color:'green'}}>{price.toFixed(8)}</td>
                <td>{quantity.toFixed(8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSellOrders = () => {
    return (
      <div>
        <h3>Sell Orders</h3>
        <table className="order-book">
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {orderBook.asks.map(([price, quantity], index) => (
              <tr key={index} className="sell-order">
                <td>{price.toFixed(8)}</td>
                <td>{quantity.toFixed(8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Binance Order Book</h1>
      <div className='select-bar'>
      <label htmlFor="tradingPair">Select a trading pair:</label>
      <select id="tradingPair" value={selectedPair} onChange={handlePairChange}>
        <option value="">-- Select Trading Pair --</option>
        {tradingPairs.map((pair) => (
          <option key={pair} value={pair}>
            {pair}
          </option>
        ))}
      </select>
      </div>
      {error && <p className="error">{error}</p>}
      {selectedPair && (
        <div>
          <h2>Order Book for {selectedPair}</h2>
          <div className="order-book-container">
            <div className="buy-orders">
              {renderBuyOrders(orderBook.bids, 'buy')}
            </div>
            <div className="sell-orders">
              {renderSellOrders(orderBook.asks, 'sell')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;