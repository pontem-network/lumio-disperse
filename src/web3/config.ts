import { http, createConfig } from "wagmi";
import { defineChain, type Address, extractChain, type HttpTransport } from "viem";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import * as ChainIcons from "@thirdweb-dev/chain-icons";
import EthIcon from "@/assets/icons/eth.svg?react";
import LumiIcon from "@/assets/icons/lumi.svg?react";

import disperseAbi from "./disperse-abi";

export const walletConnectProjectId =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "021bf63fb4357f9a3e62152e93cbeffb";

export const chains = [
  defineChain({
    icon: ChainIcons.Ethereum,
    ...mainnet,
    contracts: {
      ...mainnet.contracts,
      disperse: {
        address: "0xD152f549545093347A162Dce210e7293f1452150" as Address,
        abi: disperseAbi,
      },
    },
  }),
  defineChain({
    icon: ChainIcons.Polygon,
    ...polygon,
    contracts: {
      ...polygon.contracts,
      disperse: {
        address: "0xD152f549545093347A162Dce210e7293f1452150" as Address,
        abi: disperseAbi,
      },
    },
  }),
  defineChain({
    icon: LumiIcon,
    id: 8866,
    name: "SuperLumio",
    nativeCurrency: {
      decimals: 18,
      name: "Ethereum",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: ["https://mainnet.lumio.io/"],
        webSocket: ["wss://mainnet.lumio.io/"],
      },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "https://explorer.lumio.io/" },
    },
    options: {
      editable: true,
      deletable: false,
      simulationIsAllowed: true,
    },
    contracts: {
      disperse: {
        address: "0x77659f2C1cbe91B9161880d4329521E5485C1eA3" as Address,
        abi: disperseAbi,
      },
    },
  }),
] as const;

export type Chain = typeof chains[number];
export type ChainIds = Chain["id"];

const transports = Object.fromEntries(
  chains.map((chain) => [
    chain.id,
    http(),
  ]),
) as Record<ChainIds, HttpTransport>;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    // coinbaseWallet({ appName: "Create Wagmi" }),
    // walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  transports,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
