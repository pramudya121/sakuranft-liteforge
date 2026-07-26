
## 1. Kenapa wallet tidak menampilkan "Confirmed"?

Kode frontend sudah benar — semua transaksi (`mintNFT`, `listNFT`, `buyNFT`, `swap`, `addLiquidity`, dll) memanggil `await tx.wait()` sehingga secara teknis transaksi memang di-mine di chain **LitVM LiteForge (4441)**. Yang bermasalah bukan kontraknya, tapi cara MetaMask/Rabby menampilkan status.

**Penyebab utama** (biasanya salah satu dari ini):

1. **Chain kustom tidak punya block-explorer terverifikasi di wallet.** MetaMask menandai tx sebagai "Confirmed" hanya setelah receipt dikembalikan oleh RPC *dan* nonce naik. Pada RPC Caldera, kadang polling nonce lambat sehingga wallet stuck di "Pending" walau di explorer sudah sukses.
2. **RPC tunggal, tanpa fallback.** Kalau `liteforge.rpc.caldera.xyz` sibuk, wallet retry gagal → status tidak update.
3. **Kita tidak memicu re-broadcast/receipt di wallet.** Setelah tx confirmed dari sisi ethers, wallet tidak diberi tahu ulang.
4. **Chain belum di-`wallet_addEthereumChain`-kan dengan `blockExplorerUrls` yang benar** — banyak versi MetaMask menahan label "Confirmed" tanpa explorer.

**Yang akan diperbaiki (frontend saja, tanpa contract baru):**

- Panggil `wallet_addEthereumChain` saat connect dengan `blockExplorerUrls: [CHAIN.explorer]` + `iconUrls`.
- Setelah `tx.wait()`, tampilkan toast dengan tombol "View on Explorer" (`${explorer}/tx/${hash}`) sehingga user tetap punya proof of confirmation walau MetaMask lambat.
- Tambah fallback RPC list (Caldera + backup) di `readProvider`.
- Tunggu ≥1 block confirmation eksplisit: `tx.wait(1)` bukan `tx.wait()`.
- Simpan riwayat tx (hash, status, jenis) ke Supabase `tx_history` supaya UI "Activity" menampilkan status Confirmed mandiri, tidak bergantung pada wallet.

## 2. Audit: kontrak yang sudah ter-integrasi ke frontend

| Contract | Address | ABI di FE | Dipakai di route |
|---|---|---|---|
| NFT Collection | `0x1FbC…Cb00` | ✅ | mint, marketplace, profile |
| Marketplace | `0x5b5d…9328` | ✅ | marketplace.$id, index |
| Offer | `0x6B3c…98d1` | ✅ | marketplace.$id (make/accept) |
| DEX Router | `0xd289…86B4` | ✅ | dex.swap, dex.liquidity |
| DEX Factory | `0x5687…A873` | ✅ | dex.liquidity (getPair) |
| WETH (zkLTC wrap) | `0x4Fd3…c304` | ✅ | dex.swap |

**Kesimpulan:** semua kontrak yang ada di `contracts.ts` sudah tersambung. Tidak ada contract "yatim". Masalah bukan di integrasi, tapi UX konfirmasi.

## 3. Roadmap on-chain berikutnya — prioritas

### A. Segera (perbaikan UX transaksi)
1. Fallback RPC + `wallet_addEthereumChain` lengkap.
2. Toast dengan link explorer di setiap `tx.wait()`.
3. Tabel `tx_history` di Supabase + halaman `/activity` real-time.
4. Global `<TxTracker>` context untuk queue tx pending → confirmed.

### B. Contract baru yang berdampak tinggi

| # | Contract | Fungsi utama di FE |
|---|---|---|
| 1 | **Auction House** | English & Dutch auction untuk NFT — `createAuction`, `bid`, `settle`, `cancel`. Route baru `/auction`, `/auction/$id`. |
| 2 | **Royalty Registry (EIP-2981 adapter)** | `royaltyInfo(tokenId, salePrice)` supaya marketplace & offer bayar royalty ke creator otomatis. |
| 3 | **Collection Factory (ERC-721A)** | User bisa deploy koleksi sendiri: `deployCollection(name, symbol, baseURI, maxSupply, mintPrice, royaltyBps)`. Route `/create-collection`. |
| 4 | **Launchpad / Mint Drop** | `createDrop`, `mintPublic`, `mintAllowlist` (Merkle), phase-based pricing. Route `/launchpad`, `/launchpad/$id`. |
| 5 | **Staking (NFT → reward token)** | `stake(tokenId)`, `unstake`, `claim`. Route `/stake`. |
| 6 | **Governance token + Voting** | ERC20Votes + Governor, untuk proposal fee marketplace, dsb. Route `/dao`. |
| 7 | **Bulk Buy / Sweep** | `sweepFloor(listingIds[])` — beli banyak listing sekaligus. Tombol "Sweep" di marketplace. |
| 8 | **Escrow Bundle Sale** | Jual beberapa NFT dalam satu bundle. |
| 9 | **Rental (ERC-4907)** | Sewa NFT: `setUser(tokenId, user, expires)`. Route `/rent`. |
| 10 | **LP Farming (MasterChef-lite)** | Stake LP token dari DEX → earn reward. Route `/farm`. |

### C. Route baru yang mengikuti contract di atas

```text
src/routes/
  auction.index.tsx           /auction
  auction.$id.tsx             /auction/$id
  create-collection.tsx       /create-collection
  launchpad.index.tsx         /launchpad
  launchpad.$id.tsx           /launchpad/$id
  stake.tsx                   /stake
  farm.tsx                    /farm
  dao.index.tsx               /dao
  dao.$proposalId.tsx         /dao/$proposalId
  rent.tsx                    /rent
```

## 4. Checklist fitur wajib di dalam setiap contract baru

**Semua contract wajib punya:**
- `Ownable` / `AccessControl` (role admin, pauser, treasurer)
- `Pausable` (emergency stop)
- `ReentrancyGuard` di setiap payable / transfer function
- Event yang cukup detail untuk indexing (indexed sender, target, amount)
- `feeRecipient` + `feeBps` yang bisa di-update owner (max cap di constructor)
- `sweepStuckToken` untuk recovery token nyasar
- Version constant `VERSION()` untuk upgrade tracking
- Standard interface (`supportsInterface` bila ERC-721/1155)

**Per-contract:**

*Auction House* — reserve price, min bid increment, anti-sniping (perpanjang 5 menit jika bid di 5 menit terakhir), EIP-2981 royalty payout, WETH bid.

*Royalty Registry* — override per-collection, fallback default 5%, EIP-2981 `royaltyInfo`.

*Collection Factory* — CREATE2 untuk address predictable, event `CollectionDeployed(creator, addr, name)`.

*Launchpad* — phase struct {startTime, endTime, price, maxPerWallet, merkleRoot}, refund kalau gagal reach softcap.

*Staking* — reward per second, lock period optional, boost per rarity.

*Governance* — quorum %, voting delay, voting period, timelock (Governor Bravo style).

*Sweep* — batch call yang atomically buy N listings, refund kelebihan ETH.

*Rental* — ERC-4907 `userOf`, `userExpires`; marketplace harus cek `ownerOf` bukan `userOf` saat listing.

*Farming* — deposit/withdraw LP, harvest, pending reward view, boost NFT slot optional.

## 5. Urutan eksekusi yang disarankan

1. **Fix UX konfirmasi tx** (paling penting, itu keluhan langsung user) — 1 sesi.
2. **Royalty Registry + integrasi ke Marketplace/Offer** — dasar untuk semua contract lain.
3. **Collection Factory** — unlock user-generated content.
4. **Launchpad** — monetization / traffic driver.
5. **Auction House + Sweep** — power features.
6. **Staking → Farming → DAO** — ekosistem token.
7. **Rental** — fitur diferensiasi terakhir.

Konfirmasi mau mulai dari **Fix UX konfirmasi tx (#1)** dulu, atau langsung ke contract baru tertentu?
