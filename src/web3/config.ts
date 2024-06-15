import { http, createConfig } from "wagmi";
import { defineChain, type Address, extractChain, type HttpTransport } from "viem";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { createWeb3Modal as w3mCreateWeb3Modal } from "@web3modal/wagmi/react";
import { injected, walletConnect } from "wagmi/connectors";
import * as ChainIcons from "@thirdweb-dev/chain-icons";
import EthIcon from "@/assets/icons/eth.svg?react";
import LumiIcon from "@/assets/icons/lumi.svg?react";
import lumiIconPath from "@/assets/icons/lumi.svg";

import disperseAbi from "./disperse-abi";

export const walletConnectProjectId = "86283b367887dea6e0e54f10e387b246";

export const SUPER_LUMIO_CHAIN_ID = 8866;

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
    tokens: {
      USDT: {
        address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        decimals: 6,
      },
      USDC: {
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        decimals: 6,
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
    tokens: {
      USDT: {
        address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
        decimals: 6,
      },
      USDC: {
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
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
        http: ["https://mainnet.lumio.io"],
        webSocket: ["wss://mainnet.lumio.io"],
      },
    },
    blockExplorers: {
      default: { name: "Explorer", url: "https://explorer.lumio.io" },
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
    tokens: {
      USDT: {
        address: "0xA5fB245fb37663F3C97F3000A4eEB6497AB6e3dd",
        decimals: 6,
      },
      USDC: {
        address: "0x1C93569537a52c144b6B24640F72d74b6c1B0f3C",
        decimals: 6,
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
    walletConnect({ projectId: walletConnectProjectId }),
  ],
  transports,
});

export const createWeb3Modal = () => w3mCreateWeb3Modal({
  wagmiConfig, 
  projectId: walletConnectProjectId,
  allowUnsupportedChain: true,
  chainImages: {
    8866: lumiIconPath.src,
  },
  themeVariables: {
    '--w3m-accent': '#BF349C' // mix of #F03F77 and #8D29C1
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
