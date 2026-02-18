require('dotenv').config();
const angelOne = require("./angelOneV2");
const express = require("express");
// const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const http = require("http");
let { WebSocketV2 } = require("smartapi-javascript");
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const PASSWORD = process.env.PASSWORD;
const moment = require('moment');
// let expiry = "06MAR25", exchange = 'NIFTY', lotSize = 50;
const interval = 'ONE_MINUTE';
const intervalInMilis = 60 * 60000;
const ITM = 0;
// const tillDate = new Date(moment('10-03-2025', 'DD-MM-YYYY')).setHours(15, 15, 0, 0);
const tillDate = new Date().setHours(15, 15, 0, 0);
const from = new Date(tillDate - 30 * 24 * 60 * 60 * 1000).setHours(9, 15, 0, 0);
const localFromDate = new Date(tillDate).setHours(9, 15, 0, 0);

const port = 3002;


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (replace with specific origins in production)
    methods: ["GET", "POST"], // Allowed HTTP methods
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

var token, refreshToken, feedToken, latestOrderId;

app.get("/AngelOne/login", async (req, res) => {
  let response = await angelOne.login();
  token = response.jwtToken;
  refreshToken = response.refreshToken;
  feedToken = response.feedToken;
  return res.status(200).send(response);
});

app.get("/AngelOne/logout", async (req, res) => {
  let response = "not logged in yet";
  if (token) {
    response = await angelOne.logout(token);
  }
  return res.status(200).send(response);
});

async function getJWT() {
  let response = await angelOne.login();
  token = response.jwtToken;
  refreshToken = response.refreshToken;
  feedToken = response.feedToken;
}

app.get("/AngelOne/getProfile", async (req, res) => {
  await getJWT();
  let profile = await angelOne.getProfile(token);
  console.log("profile ", profile);
  return res.status(200).send(profile);
});

app.get("/AngelOne/getFunds", async (req, res) => {
  // await getJWT();
  let funds = await angelOne.getFunds(token);
  console.log("funds ", funds);
  return res.status(200).send(funds);
});

app.get("/AngelOne/getNSEIntradayScript", async (req, res) => {
  // await getJWT();
  let nseIntraday = await angelOne.getNSEIntradayScript(token);
  console.log("nseIntraday ", nseIntraday);
  return res.status(200).send(nseIntraday);
});
app.get("/AngelOne/getSymbolToken", async (req, res) => {
  // await getJWT();
  let symbolToken = angelOne.getSymbolToken("SBIN-EQ");
  console.log("symbolToken ", symbolToken);
  return res.status(200).send(symbolToken);
});

app.get("/AngelOne/placeOrder", async (req, res) => {
  // await getJWT();
  let placeOrder = await angelOne.placeOrder(token, "SBIN-EQ", "buy", 1);
  console.log("placeOrder ", placeOrder);
  latestOrderId = placeOrder.orderid;
  return res.status(200).send(placeOrder);
});

app.get("/AngelOne/cancelOrder", async (req, res) => {
  // await getJWT();
  let cancelOrder = await angelOne.cancelOrder(token, latestOrderId);
  console.log("cancelOrder ", cancelOrder);
  return res.status(200).send(cancelOrder);
});

app.post("/AngelOne/candle", async (req, res) => {
  console.log('req ', req.body);
  console.log('fromdate ', new Date(moment(req.body.fromdate, 'YYYY-MM-DD HH:mm')));
  await getJWT();
  let candle = await angelOne.getHistory({
    exchange: req.body.exchange,
    token: req.body.token,
    interval: req.body.interval || interval,
    fromdate: new Date(moment(req.body.fromdate, 'YYYY-MM-DD HH:mm')),
    todate: new Date(moment(req.body.todate, 'YYYY-MM-DD HH:mm'))
  })
  candle = candle.map((ele, ind) => {
    return { ...ele, timeStamp: new Date(ele.timeStamp).toLocaleString() }
  });
  console.log("candle ", candle);
  return res.status(200).send(candle);
});

//backup with option only
// io.on("connection", async (clientSocket) => {
//   console.log("client connected");
//   let sessionToken = await angelOne.login();
//   console.log("sessionToken ", sessionToken);
//   let externalSocket = new WebSocketV2({
//     jwttoken: sessionToken.jwtToken,
//     apikey: API_KEY,
//     clientcode: CLIENT_ID,
//     feedtype: sessionToken.feedToken,
//   });

//   var liveData = [];
//   externalSocket.connect().then((res) => {
//     let json_req = {
//       correlationID: "abcde12345",
//       action: 1,
//       mode: 1,
//       exchangeType: 1,
//       tokens: [angelOne.getSymbolToken("Nifty 50")],
//     };
//     externalSocket.fetchData(json_req);
//     externalSocket.on("tick", receiveTick);
//     function receiveTick(data) {
//       if (data !== 'pong') {
//         liveData.push(data);
//       }
//     }
//     externalSocket.on("disconnect", () => {
//       clientSocket.emit("disconnect");
//     });
//   });

//   let data = 'No Candle data found'

//   while (data === 'No Candle data found') {
//     data = await angelOne.getHistory({
//       exchange: "NSE",
//       token: "Nifty 50",
//       interval: interval,
//       fromdate: from,
//       todate: tillDate
//     });
//     console.log('still loading history');
//   }
//   console.log('found history data', data[0]);
//   data.forEach(element => clientSocket.emit('data', element));
//   console.log('All data sended');
//   let firstTickOfTheDay = data.filter((element)=>new Date(element.timeStamp).valueOf() === localFromDate.valueOf())[0].close;
//   let candleSell = 'No Candle data found';
//   let putToken = exchange + expiry + Math.ceil((firstTickOfTheDay + ITM) / lotSize) * lotSize + 'PE';
//   while (candleSell === 'No Candle data found') {
//     candleSell = await angelOne.getHistory({
//       exchange: "NFO",
//       token: putToken,
//       interval: interval,
//       fromdate: from,
//       todate: tillDate
//     });
//     console.log('still loading history put', putToken);
//   }
//   console.log('found history data put ', candleSell[0]);

//   let candleBuy = 'No Candle data found'
//   let callToken = exchange + expiry + Math.floor((firstTickOfTheDay - ITM) / lotSize) * lotSize + 'CE';
//   while (candleBuy === 'No Candle data found') {
//     candleBuy = await angelOne.getHistory({
//       exchange: "NFO",
//       token: callToken,
//       interval: interval,
//       fromdate: from,
//       todate: tillDate
//     });
//     console.log('still loading history call', callToken);
//   }
//   console.log('found history data call ', candleBuy[0]);

//   setInterval(() => {
//     if (liveData.length > 0 && liveData[0].last_traded_price) {
//       let open = Number(liveData[0].last_traded_price);
//       let close = Number(liveData[liveData.length - 1].last_traded_price);
//       let ltp = liveData.map((tick) =>
//         tick.last_traded_price ? Number(tick.last_traded_price) : open
//       );
//       let high = Math.max(...ltp);
//       let low = Math.min(...ltp);
//       ohlc = { open: open, close: close, high: high, low: low };
//       clientSocket.emit("data", {
//         open: open / 100,
//         close: close / 100,
//         high: high / 100,
//         low: low / 100,
//         timeStamp: Number(liveData[liveData.length - 1].exchange_timeStamp),
//         token: liveData[0].token.replaceAll("\"", ''),
//       });
//       liveData = [];
//     }
//   }, 60 * 1000);

//   clientSocket.on("message ", (data) => {
//     console.log("incoming message ", data);
//   });

//   clientSocket.on("disconnect", () => {
//     console.log("client disconnected");
//     externalSocket.close();
//   });

//   let lastOrder = { type: '', orderId: '' };
//   let fetchresult = [];

//   function processBuy(data) {
//     let timeStamp, status, price, orderId;
//     let candle = candleBuy.filter((candle) => {
//       return new Date(candle.timeStamp).valueOf() === new Date(data.timeStamp).valueOf() + intervalInMilis
//     });
//     timeStamp = data.timeStamp;
//     status = candle[0]?.high ? 'completed' : 'not processed';
//     price = candle[0]?.high ? candle[0].high : 0;
//     orderId = callToken;
//     lastOrder.type = 'buy';
//     lastOrder.orderId = orderId;
//     return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
//   }

//   function processSell(data) {
//     let timeStamp, status, price, orderId;
//     let candle = candleSell.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(data.timeStamp).valueOf() + intervalInMilis);
//     timeStamp = data.timeStamp;
//     status = candle[0]?.high ? 'completed' : 'not processed';
//     price = candle[0]?.high ? candle[0].high : 0;
//     orderId = putToken;
//     lastOrder.type = 'sell';
//     lastOrder.orderId = orderId;
//     return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
//   }
//   function processExit(data) {
//     let timeStamp, status, price, orderId;
//     if (lastOrder.type === 'buy') {
//       let candle = candleBuy.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(data.timeStamp).valueOf() + intervalInMilis);
//       timeStamp = data.timeStamp;
//       status = candle[0]?.low ? 'completed' : 'not processed';
//       price = candle[0]?.low ? candle[0].low : 0;
//       orderId = callToken;
//       lastOrder.type = '';
//       lastOrder.orderId = orderId;
//     }
//     else if (lastOrder.type === 'sell') {
//       let candle = candleSell.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(data.timeStamp).valueOf() + intervalInMilis);
//       timeStamp = data.timeStamp;
//       status = candle[0]?.low ? 'completed' : 'not processed';
//       price = candle[0]?.low ? candle[0].low : 0;
//       orderId = putToken;
//       lastOrder.type = '';
//       lastOrder.orderId = orderId;
//     }
//     return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
//   }

//   clientSocket.on("fetchStatus", (data) => {
//     // console.log('fetchStatus data ', data);
//     if (data) {
//       fetchresult.push(data);
//     }
//   });

//   setInterval(() => {

//     if (fetchresult.length > 0) {
//       while (fetchresult.length > 0) {
//         let data = JSON.parse(fetchresult.shift()), result;
//         if (new Date(data.timeStamp) === new Date(candleBuy[candleBuy.length - 1].timeStamp)) {
//           clientSocket.emit('statusUpdate', JSON.stringify(null));
//         } else {
//           if (data.type === 'buy') {
//             result = processBuy(data);
//           } else if (data.type === 'sell') {
//             result = processSell(data);
//           } else {
//             result = processExit(data);
//           }
//           console.log('Sending back statusUpdate for data ', data, ' result ', result);
//           clientSocket.emit('statusUpdate', JSON.stringify(result));
//         }
//       }
//     }
//   }, 1 * 1000);

// });

// new with equity
io.on("connection", async (clientSocket) => {
  console.log("client connected");
  let sessionToken = await angelOne.login();
  console.log("sessionToken ", sessionToken);
  let externalSocket = new WebSocketV2({
    jwttoken: sessionToken.jwtToken,
    apikey: API_KEY,
    clientcode: CLIENT_ID,
    feedtype: sessionToken.feedToken,
  });

  var liveData = [];
  externalSocket.connect().then((res) => {
    let json_req = {
      correlationID: "abcde12345",
      action: 1,
      mode: 1,
      exchangeType: 1,
      tokens: [angelOne.getSymbolToken("Nifty 50")],
    };
    externalSocket.fetchData(json_req);
    externalSocket.on("tick", receiveTick);
    function receiveTick(data) {
      if (data !== 'pong') {
        liveData.push(data);
      }
    }
    externalSocket.on("disconnect", () => {
      clientSocket.emit("disconnect");
    });
  });

  let data = 'No Candle data found'

  while (data === 'No Candle data found') {
    data = await angelOne.getHistory({
      exchange: "NSE",
      token: "Nifty 50",
      interval: interval,
      fromdate: from,
      todate: tillDate
    });
    console.log('still loading history');
  }
  console.log('found history data', data[0]);
  data.forEach(element => clientSocket.emit('data', element));
  console.log('All data sended');


  setInterval(() => {
    if (liveData.length > 0 && liveData[0].last_traded_price) {
      let open = Number(liveData[0].last_traded_price);
      let close = Number(liveData[liveData.length - 1].last_traded_price);
      let ltp = liveData.map((tick) =>
        tick.last_traded_price ? Number(tick.last_traded_price) : open
      );
      let high = Math.max(...ltp);
      let low = Math.min(...ltp);
      ohlc = { open: open, close: close, high: high, low: low };
      clientSocket.emit("data", {
        open: open / 100,
        close: close / 100,
        high: high / 100,
        low: low / 100,
        timeStamp: Number(liveData[liveData.length - 1].exchange_timeStamp),
        token: liveData[0].token.replaceAll("\"", ''),
      });
      liveData = [];
    }
  }, 60 * 1000);

  clientSocket.on("message ", (data) => {
    console.log("incoming message ", data);
  });

  clientSocket.on("disconnect", () => {
    console.log("client disconnected");
    externalSocket.close();
  });

  let lastOrder = { type: '', orderId: '' };
  let fetchresult = [];

  function processBuy(incoming) {
    let timeStamp, status, price, orderId;
    let candle = data.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(incoming.timeStamp).valueOf() + intervalInMilis);
    timeStamp = incoming.timeStamp;
    status = candle[0]?.high ? 'completed' : 'not processed';
    price = candle[0]?.high ? candle[0].high : 0;
    orderId = 'callToken';
    lastOrder.type = 'buy';
    lastOrder.orderId = orderId;
    return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
  }

  function processSell(incoming) {
    let timeStamp, status, price, orderId;
    let candle = data.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(incoming.timeStamp).valueOf() + intervalInMilis);
    timeStamp = incoming.timeStamp;
    status = candle[0]?.low ? 'completed' : 'not processed';
    price = candle[0]?.low ? candle[0].low : 0;
    orderId = 'putToken';
    lastOrder.type = 'sell';
    lastOrder.orderId = orderId;
    return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
  }
  function processExit(incoming) {
    let timeStamp, status, price, orderId;
    if (lastOrder.type === 'buy') {
      let candle = data.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(incoming.timeStamp).valueOf() + intervalInMilis);
      timeStamp = incoming.timeStamp;
      status = candle[0]?.low ? 'completed' : 'not processed';
      price = candle[0]?.low ? candle[0].low : 0;
      orderId = 'callToken';
      lastOrder.type = '';
      lastOrder.orderId = orderId;
    }
    else if (lastOrder.type === 'sell') {
      let candle = data.filter((candle) => new Date(candle.timeStamp).valueOf() === new Date(incoming.timeStamp).valueOf() + intervalInMilis);
      timeStamp = incoming.timeStamp;
      status = candle[0]?.high ? 'completed' : 'not processed';
      price = candle[0]?.high ? candle[0].high : 0;
      orderId = 'putToken';
      lastOrder.type = '';
      lastOrder.orderId = orderId;
    }
    return { timeStamp: timeStamp, status: status, price: price, orderId: orderId };
  }

  clientSocket.on("fetchStatus", (data) => {
    // console.log('fetchStatus data ', data);
    if (data) {
      fetchresult.push(data);
    }
  });

  setInterval(() => {

    if (fetchresult.length > 0) {
      while (fetchresult.length > 0) {
        let incoming = JSON.parse(fetchresult.shift()), result;
        if (new Date(incoming.timeStamp) === new Date(data[data.length - 1].timeStamp)) {
          clientSocket.emit('statusUpdate', JSON.stringify(null));
        } else {
          if (incoming.type === 'buy') {
            result = processBuy(incoming);
          } else if (incoming.type === 'sell') {
            result = processSell(incoming);
          } else {
            result = processExit(incoming);
          }
          console.log('Sending back statusUpdate for data ', incoming, ' result ', result);
          clientSocket.emit('statusUpdate', JSON.stringify(result));
        }
      }
    }
  }, 1 * 1000);

});

server.listen(port, () => {
  console.log("Server is listening on http://localhost:", port);
});
