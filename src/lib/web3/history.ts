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

export type CollectionHistoryPoint = {
  date: string;          // YYYY-MM-DD
  timestamp: number;
  volume: number;        // sum of sale prices that day
  sales: number;         // number of sales that day
  floor: number;         // min listed price up to & including that day
};

export async function fetchCollectionHistory(): Promise<CollectionHistoryPoint[]> {
  try {
    const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const block = await readProvider.getBlockNumber();
    const from = Math.max(0, block - 200000);

    const [listed, sold] = await Promise.all([
      mp.queryFilter(mp.filters.Listed(), from).catch(() => []),
      mp.queryFilter(mp.filters.Sold(), from).catch(() => []),
    ]);

    const listingPrices = new Map<string, bigint>();
    for (const l of listed) listingPrices.set(((l as any).args.listingId as bigint).toString(), (l as any).args.price as bigint);

    const byDay = new Map<string, { ts: number; vol: number; sales: number; listedPrices: number[] }>();
    const touch = (ts: number) => {
      const d = new Date(ts * 1000);
      const key = d.toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, { ts, vol: 0, sales: 0, listedPrices: [] });
      return byDay.get(key)!;
    };

    for (const l of listed) {
      const e: any = l;
      const blk = await readProvider.getBlock(e.blockNumber).catch(() => null);
      const ts = blk?.timestamp ?? Date.now() / 1000;
      touch(ts).listedPrices.push(+formatEther(e.args.price));
    }
    for (const s of sold) {
      const e: any = s;
      const blk = await readProvider.getBlock(e.blockNumber).catch(() => null);
      const ts = blk?.timestamp ?? Date.now() / 1000;
      const price = +formatEther(e.args.price);
      const slot = touch(ts);
      slot.vol += price;
      slot.sales += 1;
    }

    const days = [...byDay.entries()].sort((a, b) => a[1].ts - b[1].ts);
    let runningFloor = Infinity;
    const out: CollectionHistoryPoint[] = days.map(([date, v]) => {
      if (v.listedPrices.length) runningFloor = Math.min(runningFloor, ...v.listedPrices);
      return {
        date,
        timestamp: v.ts,
        volume: +v.vol.toFixed(4),
        sales: v.sales,
        floor: runningFloor === Infinity ? 0 : +runningFloor.toFixed(4),
      };
    });
    return out;
  } catch {
    return [];
  }
}

export type RecentSale = {
  blockNumber: number;
  timestamp: number;
  tokenId: string;
  priceEth: number;
  buyer: string;
  seller: string;
  tx: string;
};

/** Detailed on-chain sales feed. Cross-references Listed → Sold by listingId to recover seller + tokenId. */
export async function fetchRecentSales(limit = 25): Promise<RecentSale[]> {
  try {
    const mp = new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, readProvider);
    const block = await readProvider.getBlockNumber();
    const from = Math.max(0, block - 200000);
    const [listed, sold] = await Promise.all([
      mp.queryFilter(mp.filters.Listed(), from).catch(() => []),
      mp.queryFilter(mp.filters.Sold(), from).catch(() => []),
    ]);
    const meta = new Map<string, { seller: string; tokenId: bigint }>();
    for (const l of listed) {
      const a: any = (l as any).args;
      meta.set((a.listingId as bigint).toString(), { seller: a.seller, tokenId: a.tokenId as bigint });
    }
    const recent = sold.slice(-limit * 2).reverse();
    const out: RecentSale[] = [];
    for (const s of recent) {
      const e: any = s;
      const lid = (e.args.listingId as bigint).toString();
      const m = meta.get(lid);
      if (!m) continue;
      const blk = await readProvider.getBlock(e.blockNumber).catch(() => null);
      out.push({
        blockNumber: e.blockNumber,
        timestamp: blk?.timestamp ?? Date.now() / 1000,
        tokenId: m.tokenId.toString(),
        priceEth: +formatEther(e.args.price),
        buyer: e.args.buyer,
        seller: m.seller,
        tx: e.transactionHash,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

