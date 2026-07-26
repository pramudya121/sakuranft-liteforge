import { createMiddleware } from "@tanstack/react-start";
import { getWalletHeader } from "./wallet-header";

// Client-side function middleware that attaches the connected wallet address
// as `x-wallet-address` on every serverFn RPC. Server functions that perform
// privileged inserts read this header to identify the caller.
export const attachWalletHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const wallet = getWalletHeader();
    return next({
      headers: wallet ? { "x-wallet-address": wallet } : {},
    });
  },
);
