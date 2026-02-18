require("dotenv").config();
const axios = require("axios");
const { authenticator } = require("otplib");
const masterScript = require("./OpenAPIScripMaster.json");
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const PASSWORD = process.env.PASSWORD;
const CLIENT_LOCAL_IP = process.env.CLIENT_LOCAL_IP;
const CLIENT_PUBLIC_IP = process.env.CLIENT_PUBLIC_IP;
const TOTP = process.env.TOTP;
const MAC_ADDRESS = process.env.MAC_ADDRESS;
const { SmartAPI, WebSocket, WebSocketV2 } = require("smartapi-javascript");
const { response } = require("express");
const angelOne = require("./angelOneV2");
const { Server } = require("socket.io");
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (replace with specific origins in production)
    methods: ["GET", "POST"], // Allowed HTTP methods
  },
});
const port = 3002;

const smart_api = new SmartAPI({
  api_key: API_KEY,
});

app.get("/", (req, res) => {
  res.sendStatus(200).send("Connection ok established");
});

io.on("connection", async (clientSocket) => {
  console.log("client connected");
  let sessionToken = await smart_api.generateSession(
    CLIENT_ID,
    PASSWORD,
    authenticator.generate(TOTP)
  );
  //   console.log("sessionToken ", sessionToken);
  let externalSocket = new WebSocketV2({
    jwttoken: sessionToken.data.jwtToken,
    apikey: API_KEY,
    clientcode: CLIENT_ID,
    feedtype: sessionToken.data.feedToken,
  });
  //   for mode, action and exchangeTypes , can use values from constants file.

  var liveData = [];
  externalSocket.connect().then((res) => {
    let json_req = {
      correlationID: "abcde12345",
      action: 1,
      mode: 1,
      exchangeType: 1,
      tokens: [angelOne.getSymbolToken("SBIN-EQ")],
    };
    externalSocket.fetchData(json_req);
    externalSocket.on("tick", receiveTick);
    function receiveTick(data) {
      //   console.log("receiveTick:::::", data);
      liveData.push(data);
    }
    externalSocket.on("disconnect", () => {
      clientSocket.emit("disconnect");
    });
  });

  setInterval(() => {
    // console.log("liveData ", liveData);
    let ohlc;
    let open = Number(liveData[0].last_traded_price);
    let close = Number(liveData[liveData.length - 1].last_traded_price);
    let ltp = liveData.map((tick) =>
      tick.last_traded_price ? Number(tick.last_traded_price) : open
    );
    // console.log(ltp);
    // console.log(liveData);
    let high = Math.max(...ltp);
    let low = Math.min(...ltp);
    ohlc = { open: open, close: close, high: high, low: low };
    clientSocket.emit("data", {
      timeStamp: liveData[liveData.length - 1].exchange_timestamp,
      ohlc: ohlc,
      token: liveData[0].token,
    });
    liveData = [];
  }, 20 * 1000);

  clientSocket.on("message ", (data) => {
    console.log("incoming message ", data);
  });

  clientSocket.on("liveData", (data) => {
    console.log("incoming data ", data);
  });

  clientSocket.on("disconnect", () => {
    console.log("client disconnected");
    externalSocket.close();
  });
});

server.listen(port, () => {
  console.log("Server is listening on http://localhost:", port);
});
