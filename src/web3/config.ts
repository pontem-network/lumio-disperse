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
