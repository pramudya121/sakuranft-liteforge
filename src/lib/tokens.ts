// Token registry with CoinMarketCap logos (64x64). 'native' = chain coin.
import { CONTRACTS } from "./web3/contracts";

export type TokenInfo = {
  symbol: string;
  name: string;
  address: string | "native";
  decimals: number;
  cmcId: number;
  logo: string;
};

const logo = (id: number) => `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;

export const TOKENS: TokenInfo[] = [
  { symbol: "zkLTC",   name: "zk Litecoin",       address: "native",       decimals: 18, cmcId: 2,    logo: logo(2)    },
  { symbol: "wzkLTC",  name: "Wrapped zkLTC",     address: CONTRACTS.weth, decimals: 18, cmcId: 2,    logo: logo(2)    },
  { symbol: "ETH",     name: "Ethereum",          address: "",             decimals: 18, cmcId: 1027, logo: logo(1027) },
  { symbol: "BNB",     name: "Binance Coin",      address: "",             decimals: 18, cmcId: 1839, logo: logo(1839) },
  { symbol: "MON",     name: "Monad",             address: "",             decimals: 18, cmcId: 28478, logo: logo(28478) },
  { symbol: "HYPE",    name: "Hyperliquid",       address: "",             decimals: 18, cmcId: 32196, logo: logo(32196) },
  { symbol: "WDEX",    name: "WolfDex Token",     address: "",             decimals: 18, cmcId: 0,    logo: logo(7083) },
  { symbol: "LITVM",   name: "LitVM",             address: "",             decimals: 18, cmcId: 0,    logo: logo(2)    },
];

export const tokenLogo = (cmcId: number) => logo(cmcId);
