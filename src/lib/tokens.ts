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
  { symbol: "zkLTC",   name: "zk Litecoin",   address: "native",          decimals: 18, cmcId: 2,    logo: logo(2)    },
  { symbol: "WETH",    name: "Wrapped Ether", address: CONTRACTS.weth,    decimals: 18, cmcId: 2396, logo: logo(2396) },
  { symbol: "USDT",    name: "Tether USD",    address: "",                decimals: 6,  cmcId: 825,  logo: logo(825)  },
  { symbol: "USDC",    name: "USD Coin",      address: "",                decimals: 6,  cmcId: 3408, logo: logo(3408) },
  { symbol: "DAI",     name: "Dai",           address: "",                decimals: 18, cmcId: 4943, logo: logo(4943) },
  { symbol: "WBTC",    name: "Wrapped BTC",   address: "",                decimals: 8,  cmcId: 3717, logo: logo(3717) },
  { symbol: "LINK",    name: "Chainlink",     address: "",                decimals: 18, cmcId: 1975, logo: logo(1975) },
  { symbol: "UNI",     name: "Uniswap",       address: "",                decimals: 18, cmcId: 7083, logo: logo(7083) },
];

export const tokenLogo = (cmcId: number) => logo(cmcId);
