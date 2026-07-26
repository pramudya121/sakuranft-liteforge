// Central helper for showing user-visible transaction status.
// Wallets on custom chains (Caldera / LitVM) sometimes stay on "Pending"
// forever in the wallet UI even after the tx is mined. This helper
// guarantees the app always tells the user when a tx is confirmed AND
// gives them a one-click link to the block explorer as independent proof.
import { toast } from "sonner";
import { CHAIN } from "./contracts";

export function explorerTxUrl(hash: string) {
  return `${CHAIN.explorer}/tx/${hash}`;
}

export function explorerAddrUrl(addr: string) {
  return `${CHAIN.explorer}/address/${addr}`;
}

type EthersTxLike = {
  hash: string;
  wait: (confirmations?: number) => Promise<any>;
};

/**
 * Wait for a transaction with a visible loading -> success/error toast.
 * Uses 1 confirmation explicitly so wallets that lag on receipt polling
 * still see the block advance before we mark it done.
 */
export async function trackTx<T = any>(tx: EthersTxLike, label: string): Promise<T> {
  const short = `${tx.hash.slice(0, 10)}…${tx.hash.slice(-6)}`;
  const toastId = toast.loading(`${label} — submitted`, {
    description: short,
    action: {
      label: "View",
      onClick: () => window.open(explorerTxUrl(tx.hash), "_blank", "noopener,noreferrer"),
    },
  });
  try {
    const receipt = await tx.wait(1);
    toast.success(`${label} confirmed`, {
      id: toastId,
      description: short,
      action: {
        label: "Explorer",
        onClick: () => window.open(explorerTxUrl(tx.hash), "_blank", "noopener,noreferrer"),
      },
    });
    return receipt as T;
  } catch (err: any) {
    const msg = err?.shortMessage || err?.reason || err?.message || "Transaction failed";
    toast.error(`${label} failed`, {
      id: toastId,
      description: msg.slice(0, 160),
      action: {
        label: "Explorer",
        onClick: () => window.open(explorerTxUrl(tx.hash), "_blank", "noopener,noreferrer"),
      },
    });
    throw err;
  }
}
