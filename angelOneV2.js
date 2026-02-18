require('dotenv').config();
const axios = require("axios");
const { authenticator } = require("otplib");
const masterScript = require('./OpenAPIScripMaster.json');
const API_KEY = process.env.API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const PASSWORD = process.env.PASSWORD;
const CLIENT_LOCAL_IP = process.env.CLIENT_LOCAL_IP;
const CLIENT_PUBLIC_IP = process.env.CLIENT_PUBLIC_IP;
const TOTP = process.env.TOTP;
const MAC_ADDRESS = process.env.MAC_ADDRESS;
const { SmartAPI, WebSocket, WebSocketV2 } = require('smartapi-javascript');
const { response } = require('express');
const moment = require('moment');

const smart_api = new SmartAPI({
  api_key: API_KEY,
});

function getSymbolToken(symbol) {
  let temp = masterScript.find((script) => script.symbol === symbol);
  return temp?.token;
}

exports.getSymbolToken = getSymbolToken;

exports.login = async function () {
  try {
    let response = await smart_api.generateSession(CLIENT_ID, PASSWORD, authenticator.generate(TOTP));
    return response.data;
  } catch (error) {
    console.error("Error fetching token:", error);
  }
};

exports.logout = async function (token) {
  try {
    let response = await smart_api.logout(CLIENT_ID);
    console.log("response ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching token:", error);
  }
};


exports.getProfile = async function (token) {
  try {
    let response = await smart_api.getProfile();
    return response.data;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};

exports.getFunds = async function (token) {
  try {
    let response = await smart_api.getRMS();
    return response.data;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};

exports.getNSEIntradayScript = async function (token) {
  try {
    let response = await smart_api.nseIntraday();
    console.log("response ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};

exports.placeOrder = async function (token, symbol, action, quantity) {
  const orderData = {
    variety: "NORMAL",
    tradingsymbol: symbol,
    symboltoken: getSymbolToken(symbol), // Get this from Angel One API
    transactiontype: action.toUpperCase(),
    exchange: "NSE",
    ordertype: "MARKET",
    producttype: "INTRADAY",
    duration: "DAY",
    quantity: quantity.toString(),
  };

  try {
    let response = await smart_api.placeOrder();
    console.log("Order placed:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error placing order:", error.response.data);
  }
};

exports.cancelOrder = async function (token, orderid) {
  const orderData = {
    variety: "NORMAL",
    orderid: orderid
  };

  try {
    const response = await axios.post(
      "https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder",
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "CLIENT_LOCAL_IP",
          "X-ClientPublicIP": "CLIENT_PUBLIC_IP",
          "X-MACAddress": "MAC_ADDRESS",
          "X-PrivateKey": API_KEY,
        },
      }
    );
    // console.log("Order placed:", response.data);
    return response.data.data;
  } catch (error) {
    console.error("Error placing order:", error.response.data);
  }
};

function formatDate(date) {
  return moment(date).format('YYYY-MM-DD HH:mm');
}

exports.getHistory = async function ({ exchange, token, interval, fromdate, todate }) {
  try {
    let symboltoken = getSymbolToken(token);
    let response = await smart_api.getCandleData({
      exchange: exchange,
      symboltoken: symboltoken,
      interval: interval,
      fromdate: formatDate(fromdate),
      todate: formatDate(todate)
    });
    let data = response && response.data ? response.data.map((candy) => {
      return {
        token: getSymbolToken(token),
        timeStamp: Math.floor(new Date(candy[0])),
        open: candy[1],
        high: candy[2],
        low: candy[3],
        close: candy[4],
      };
    }) : 'No Candle data found';
    return data;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};