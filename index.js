require('dotenv').config;
const ccxt = require('ccxt');
const axios = require('axios');

const tick = async() => {
    const {asset,base,spread,allocation} = config;
    const market = `${asset}/${base}`;

    const orders = await binanceClient.fetchOpenOrders(market);

    orders.forEach(async order => {
        await binanceClient.cancelOrder(order.id);
    });

    const results = await Promise.all([
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),// pass url to get prices bitcoin vs usd
        axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd') // pass url to get prices tether vs usd
    ]);

    const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd;

    const sellPrice = marketPrice * (1+spread);
    const buyPrice = marketPrice *(1-spread);
    const balances = await binanceClient.fetchBalance();
    const assetBalance = balances.free[asset];
    const baseBalance = balances.free[base];
    const sellVolume = assetBalance * allocation;
    const buyVolume = (baseBalance * allocation) / marketPrice;

    await binanceClient.createLimitSellOrder(market,sellVolume,sellPrice);
    await binanceClient.createLimitBuyOrder(market,buyVolume,buyPrice);

    console.log(`
        New tick for ${market}
        Created limit sell order for ${sellVolume}@${sellPrice}
        Created limit buy order for ${buyVolume}@${buyPrice}
    `);

}

const run = () => {
    const config = {
        asset :'BTC',    // what we gonna trade
        base : 'USDT',   // tether becuase we cannot set base as fiat currency
        allocation : 0.1, // percentage 
        spread : 0.2, // in percentage to set limit eg. for 10 we set upper limit to 12 and lower limit to 8 that we use for but and sell
        tickInterval : 2000 // after every 2 second trading bot will checck our position

    };
    const binanceClient = new ccxt.binance({
        apiKey: process.env.API_KEY,
        secret:process.env.API_SECRET
    });
    tick(config,binanceClient);

    setInterval(tick,config.tickInterval,config,binanceClient);
};