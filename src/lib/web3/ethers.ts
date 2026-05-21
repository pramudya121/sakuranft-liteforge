import { BrowserProvider, Contract, JsonRpcProvider, parseEther, formatEther, type Eip1193Provider } from "ethers";
import { CHAIN, CONTRACTS, MARKETPLACE_ABI, NFT_ABI, OFFER_ABI, ROUTER_ABI, FACTORY_ABI, ERC20_ABI, PAIR_ABI } from "./contracts";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { providers?: Eip1193Provider[]; isMetaMask?: boolean; isOkxWallet?: boolean; isBitKeep?: boolean };
    okxwallet?: Eip1193Provider;
    bitkeep?: { ethereum?: Eip1193Provider };
  }
}

export type WalletKind = "metamask" | "okx" | "bitget";

export function pickProvider(kind: WalletKind): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  if (kind === "okx") return window.okxwallet ?? null;
  if (kind === "bitget") return window.bitkeep?.ethereum ?? null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.providers?.length) {
    const mm = eth.providers.find((p: any) => p.isMetaMask && !p.isOkxWallet && !p.isBitKeep);
    if (mm) return mm;
  }
  return eth;
}

export const readProvider = new JsonRpcProvider(CHAIN.rpcUrl, { chainId: CHAIN.id, name: CHAIN.name });

export async function connectWallet(kind: WalletKind = "metamask") {
  const injected = pickProvider(kind);
  if (!injected) throw new Error(`${kind} wallet not detected. Please install it.`);
  const provider = new BrowserProvider(injected, "any");
  const accounts = await provider.send("eth_requestAccounts", []);
  await ensureChain(injected);
  const signer = await provider.getSigner();
  return { provider, signer, address: accounts[0] as string };
}

export async function ensureChain(injected: Eip1193Provider) {
  try {
    await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hexId }] });
  } catch (err: any) {
    if (err?.code === 4902 || /Unrecognized chain/i.test(err?.message ?? "")) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN.hexId,
          chainName: CHAIN.name,
          nativeCurrency: { name: CHAIN.symbol, symbol: CHAIN.symbol, decimals: CHAIN.decimals },
          rpcUrls: [CHAIN.rpcUrl],
          blockExplorerUrls: [CHAIN.explorer],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function getSigner(kind: WalletKind = "metamask") {
  const { signer } = await connectWallet(kind);
  return signer;
}

export function getContract(address: string, abi: any, signerOrProvider?: any) {
  return new Contract(address, abi, signerOrProvider ?? readProvider);
}

export const marketplaceRead = () => new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
export const nftRead = () => new Contract(CONTRACTS.nftCollection, NFT_ABI, readProvider);
export const offerRead = () => new Contract(CONTRACTS.offer, OFFER_ABI, readProvider);
export const routerRead = () => new Contract(CONTRACTS.router, ROUTER_ABI, readProvider);
export const factoryRead = () => new Contract(CONTRACTS.factory, FACTORY_ABI, readProvider);

// ---------- NFT actions ----------
export async function mintNFT(signer: any, file: File, name: string, description: string, onProgress?: (s: string) => void) {
  onProgress?.("Encoding image...");
  const dataUrl = await fileToDataUrl(file);
  const metadata = { name, description, image: dataUrl };
  const tokenUri = "data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(metadata))));
  onProgress?.("Confirm in wallet...");
  const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, signer);
  const to = await signer.getAddress();
  const tx = await nft.mintNFT(to, tokenUri);
  onProgress?.("Minting on-chain...");
  const receipt = await tx.wait();
  onProgress?.("Minted!");
  return receipt;
}

export async function listNFT(signer: any, tokenId: bigint | number, priceEth: string) {
  const nft = new Contract(CONTRACTS.nftCollection, NFT_ABI, signer);
  const approved = await nft.getApproved(tokenId);
  if (approved.toLowerCase() !== CONTRACTS.marketplace.toLowerCase()) {
    const tx0 = await nft.approve(CONTRACTS.marketplace, tokenId);
    await tx0.wait();
  }
  const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
  const tx = await mp.listNFT(CONTRACTS.nftCollection, tokenId, parseEther(priceEth));
  return tx.wait();
}

export async function buyNFT(signer: any, listingId: bigint | number, priceWei: bigint) {
  const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
  const tx = await mp.buyNFT(listingId, { value: priceWei });
  return tx.wait();
}

export async function cancelListing(signer: any, listingId: bigint | number) {
  const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
  const tx = await mp.cancelListing(listingId);
  return tx.wait();
}

export async function makeOffer(signer: any, tokenId: bigint | number, priceEth: string) {
  const c = new Contract(CONTRACTS.offer, OFFER_ABI, signer);
  const tx = await c.makeOffer(CONTRACTS.nftCollection, tokenId, { value: parseEther(priceEth) });
  return tx.wait();
}

export async function acceptOffer(signer: any, tokenId: bigint | number, offerIdx: bigint | number) {
  const c = new Contract(CONTRACTS.offer, OFFER_ABI, signer);
  const tx = await c.acceptOffer(CONTRACTS.nftCollection, tokenId, offerIdx);
  return tx.wait();
}

export async function cancelOffer(signer: any, tokenId: bigint | number, offerIdx: bigint | number) {
  const c = new Contract(CONTRACTS.offer, OFFER_ABI, signer);
  const tx = await c.cancelOffer(CONTRACTS.nftCollection, tokenId, offerIdx);
  return tx.wait();
}

// ---------- DEX ----------
export async function wrapEth(signer: any, amountEth: string) {
  const weth = new Contract(CONTRACTS.weth, ERC20_ABI, signer);
  const tx = await weth.deposit({ value: parseEther(amountEth) });
  return tx.wait();
}

export async function approveToken(signer: any, token: string, spender: string, amount: bigint) {
  const t = new Contract(token, ERC20_ABI, signer);
  const owner = await signer.getAddress();
  const current: bigint = await t.allowance(owner, spender);
  if (current >= amount) return null;
  const tx = await t.approve(spender, amount);
  return tx.wait();
}

export async function swapExactETHForTokens(signer: any, tokenOut: string, amountInEth: string, slippagePct = 1) {
  const router = new Contract(CONTRACTS.router, ROUTER_ABI, signer);
  const path = [CONTRACTS.weth, tokenOut];
  const amountIn = parseEther(amountInEth);
  const amounts = await router.getAmountsOut(amountIn, path);
  const minOut = (amounts[1] * BigInt(100 - slippagePct)) / 100n;
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await router.swapExactETHForTokens(minOut, path, to, deadline, { value: amountIn });
  return tx.wait();
}

export async function swapExactTokensForETH(signer: any, tokenIn: string, amountIn: bigint, slippagePct = 1) {
  await approveToken(signer, tokenIn, CONTRACTS.router, amountIn);
  const router = new Contract(CONTRACTS.router, ROUTER_ABI, signer);
  const path = [tokenIn, CONTRACTS.weth];
  const amounts = await router.getAmountsOut(amountIn, path);
  const minOut = (amounts[1] * BigInt(100 - slippagePct)) / 100n;
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await router.swapExactTokensForETH(amountIn, minOut, path, to, deadline);
  return tx.wait();
}

export async function addLiquidityETH(signer: any, token: string, tokenAmount: bigint, ethAmountEth: string) {
  await approveToken(signer, token, CONTRACTS.router, tokenAmount);
  const router = new Contract(CONTRACTS.router, ROUTER_ABI, signer);
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await router.addLiquidityETH(token, tokenAmount, 0n, 0n, to, deadline, { value: parseEther(ethAmountEth) });
  return tx.wait();
}

export async function removeLiquidityETH(signer: any, token: string, liquidity: bigint, pairAddr: string) {
  // approve LP token
  await approveToken(signer, pairAddr, CONTRACTS.router, liquidity);
  const router = new Contract(CONTRACTS.router, ROUTER_ABI, signer);
  const to = await signer.getAddress();
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const tx = await router.removeLiquidityETH(token, liquidity, 0n, 0n, to, deadline);
  return tx.wait();
}

// ---------- helpers ----------
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function shortAddr(a?: string) {
  if (!a) return "";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

export function decodeTokenUri(uri: string): { name?: string; description?: string; image?: string } | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const json = atob(uri.replace("data:application/json;base64,", ""));
      return JSON.parse(decodeURIComponent(escape(json)));
    }
    if (uri.startsWith("data:application/json")) {
      return JSON.parse(decodeURIComponent(uri.split(",")[1] ?? ""));
    }
    return null;
  } catch { return null; }
}

export { parseEther, formatEther };
export { PAIR_ABI, ERC20_ABI };
