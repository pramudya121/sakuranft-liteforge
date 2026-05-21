// Fetch on-chain price history for an NFT from Sold + Listed events
import { Contract, formatEther } from "ethers";
import { CONTRACTS, MARKETPLACE_ABI } from "./contracts";
import { readProvider } from "./ethers";

export type PriceHistoryPoint = {
  blockNumber: number;
  timestamp: number;
  priceEth: number;
  kind: "sale" | "listing";
  tx: string;
  from?: string;
  to?: string;
};

export async function fetchNFTPriceHistory(tokenId: bigint): Promise<PriceHistoryPoint[]> {
  try {
    const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const block = await readProvider.getBlockNumber();
    const from = Math.max(0, block - 200000);

    // Get all Listed events for this NFT, then map their listingId -> price
    const listed = await mp.queryFilter(mp.filters.Listed(), from).catch(() => []);
    const tokenListings = listed.filter((e: any) => e.args.tokenId === tokenId);
    const sold = await mp.queryFilter(mp.filters.Sold(), from).catch(() => []);

    const listingPrices = new Map<string, bigint>();
    for (const l of tokenListings) {
      listingPrices.set(((l as any).args.listingId as bigint).toString(), (l as any).args.price as bigint);
    }

    const points: PriceHistoryPoint[] = [];
    for (const l of tokenListings) {
      const e: any = l;
      const blk = await readProvider.getBlock(e.blockNumber).catch(() => null);
      points.push({
        blockNumber: e.blockNumber,
        timestamp: blk?.timestamp ?? Date.now() / 1000,
        priceEth: +formatEther(e.args.price),
        kind: "listing",
        tx: e.transactionHash,
        from: e.args.seller,
      });
    }
    for (const s of sold) {
      const e: any = s;
      const lid = (e.args.listingId as bigint).toString();
      const price = listingPrices.get(lid);
      if (!price) continue; // unrelated sale
      const blk = await readProvider.getBlock(e.blockNumber).catch(() => null);
      points.push({
        blockNumber: e.blockNumber,
        timestamp: blk?.timestamp ?? Date.now() / 1000,
        priceEth: +formatEther(e.args.price),
        kind: "sale",
        tx: e.transactionHash,
        to: e.args.buyer,
      });
    }
    return points.sort((a, b) => a.blockNumber - b.blockNumber);
  } catch {
    return [];
  }
}
