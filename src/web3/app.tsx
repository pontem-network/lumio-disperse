import React from "react";
import { erc20Abi, extractChain, formatUnits, getChainContractAddress, parseUnits } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
// import Blockies from 'react-blockies';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import EthIcon from "@/assets/icons/eth.svg?react";
import type { Address } from "viem";
import disperseAbi from "./disperse-abi";
import { chains, type ChainIds } from "./config";
import { siteConfig } from "@/config/site";
import { NetworkSwitcher } from './network-switcher'

const formSchema = z.object({
  type: z.enum(["native", "erc20"]),
  token: z.string().optional(),
  recipients: z.string().refine((val) => {
    return parseInput(val.split("\n")).every((parts) => {
      return parts.length === 2 && parts[0].trim() && !isNaN(parseFloat(parts[1].trim()));
    });
  }, "Each line must be in the format: address, balance"),
});

export const MAX_ALLOWANCE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

interface useApproveAllowanceProps {
  accountAddress?: Address;
  spenderAddress?: Address;
  sellTokenAddress: Address;
}

// Allowance
// https://0x.org/docs/0x-swap-api/advanced-topics/how-to-set-your-token-allowances
const useApproveAllowance = ({
  accountAddress,
  spenderAddress,
  sellTokenAddress,
}: useApproveAllowanceProps) => {
  // 1. Read from erc20, does spender (0x Exchange Proxy) have allowance?
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: sellTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: !!accountAddress && !!spenderAddress ? [accountAddress, spenderAddress] : undefined,
  });

  // 2. (only if no allowance): write to erc20, approve 0x Exchange Proxy to spend max integer
  const {  isPending: isApprovePending, data: allowanceApproveResult, writeContractAsync, error } = useWriteContract();
  const approveAsync = async (maxAllowance: bigint = MAX_ALLOWANCE) => {
    if (!spenderAddress) return;
    const tx = await writeContractAsync({
      address: sellTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, maxAllowance],
    });
    console.log('approveAsync tx', tx);
    toast.success("Approve successful. <a href='https://etherscan.io/tx/" + tx + "' target='_blank'>View on Etherscan</a>");
    await refetchAllowance();
  };

  return {
    allowance,
    isApprovePending,
    approveAllowanceAsync: approveAsync,
    refetchAllowance,
  };
};

interface UseDisperseProps {
  address?: Address;
  token: Address;
  recipients: Address[];
  values: bigint[];
}

const useDisperse = ({ address, token, recipients, values }: UseDisperseProps) => {
  const { data: disperseResult, writeContractAsync, error: disperseError } = useWriteContract();

  const disperseTokenAsync = async () => {
    if (!address) return;
    const tx = await writeContractAsync({
      address,
      abi: disperseAbi,
      functionName: "disperseToken",
      args: [token, recipients, values],
    });
    console.log('disperseTokenAsync tx', tx);
    toast.success("Disperse successful. <a href='https://etherscan.io/tx/" + tx + "' target='_blank'>View on Etherscan</a>");
  };

  const disperseEtherAsync = async () => {  
    if (!address) return;
    const tx = await writeContractAsync({
      address,
      abi: disperseAbi,
      functionName: "disperseEther",
      args: [recipients, values],
      value: values.reduce((a, b): bigint => a + b, 0n)
    })
    console.log('disperseEtherAsync tx', tx);
    toast.success("Disperse successful. <a href='https://etherscan.io/tx/" + tx + "' target='_blank'>View on Etherscan</a>");
  };

  return {
    disperseResult,
    disperseError,
    disperseTokenAsync,
    disperseEtherAsync,
  };
}

function parseInput(inputStrings: string[]): [Address, string][] {
    // Initialize an empty array to store the parsed output
    const parsedOutput: [Address, string][] = [];

    // Define a regular expression pattern to match the different formats
    const pattern = /([0-9a-fA-Fx]+)[\s,=]?([\d\.]+)/g;

    // Iterate over each input string
    inputStrings.forEach((inputStr) => {
        // Find all matches in the input string based on the defined pattern
        const matches = inputStr.matchAll(pattern);

        // Iterate over each match
        for (const match of matches) {
            // Extract address and amount from the match
            const address = match[1];
            const amount = match[2];

            // Append the parsed address and amount to the output array
            parsedOutput.push([address as Address, amount]);
        }
    });

    // Return the parsed output as a 2D array
    return parsedOutput;
}

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export default function App() {
  const account = useAccount();
  const { open } = useWeb3Modal();
  const address = account.address
    ? shortenAddress(account.address)
    : "";
  const accountText = address ? `Account (${address})` : "Account";
  const chainName = account.chain?.name ? account.chain.name : "Unknown";

  const disperceAddress = account.chain?.contracts.disperse?.address;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "native",
      token: "",
      recipients: "",
    },
  });

  const type = form.watch("type");
  const token = form.watch("token") as Address;
  const rawBody = form.watch("recipients");
  const rawRecipients = rawBody ? parseInput(rawBody.split("\n")) : [];

  const {
    data: balance,
    isError,
    isLoading,
    error: balanceError,
  } = useBalance({
    address: account.address,
    token: type === "erc20" && token ? (token as Address) : undefined,
  });

  React.useEffect(() => {
    if (balanceError?.message) {
      toast.error('Error getting balance for: ' + shortenAddress((balanceError as any)?.contractAddress))
    }
  }, [balanceError])

  const decimals = balance?.decimals ?? 18;
  const formattedBalance = balance?.value ? formatUnits(balance?.value, balance.decimals) : "0";
  // TODO: calc sum of transfers
  const maxAllowance = balance?.value ? balance?.value : undefined;
  const formattedMaxAllowance = maxAllowance
    ? formatUnits(maxAllowance, decimals)
    : "0";

  const recipients = [] as Address[];
  const values = [] as bigint[];

  rawRecipients.forEach(([recipient, value]) => {
    recipients.push(recipient)
    values.push(value ? parseUnits(value, decimals) : 0n)
  });

  const total = values.reduce((acc, val) => acc + val, 0n);
  const formattedTotal = total ? formatUnits(total, decimals) : "0";
  
  const { disperseResult, disperseEtherAsync, disperseTokenAsync } = useDisperse({ 
    address: disperceAddress!, 
    token, 
    recipients, 
    values,
  });

  const { allowance, isApprovePending, approveAllowanceAsync } = useApproveAllowance({
    accountAddress: account.address,
    spenderAddress: disperceAddress,
    sellTokenAddress: token,
  });


  const formSubmit = form.handleSubmit((data) => {
    // TODO: Handle form submission
    // may be reset form
    // form.reset();
    return false;
  });


  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <a href="/" className="hidden items-center space-x-2 md:flex">
            <EthIcon className="w-[32px] text-sm font-normal" />
            <span className="hidden font-bold sm:inline-block">
              {siteConfig.name}
            </span>
          </a>
          <div className="flex items-center space-x-4">
            <NetworkSwitcher/>
            <Button size="sm" rounded="full" className="gap-2 border-2 border-primary" onClick={() => open()}>
              {account.status === "connected" ? accountText : "Connect"}
              {/* <Blockies seed={account.address} size={8} scale={4} className="rounded-full" /> */}
            </Button>
          </div>
        </div>
      </header>
      <section className="space-y-6 py-6 sm:py-12 lg:py-12">
        <div className="container flex max-w-5xl  mt-[100px] flex-col items-center gap-5 text-center">
          <h1 className="text-balance font-heading text-4xl sm:text-5xl md:text-6xl lg:text-[66px]">
            <div className="inline-flex relative font-extrabold font-display">
              <EthIcon className="w-[75px] absolute left-0 top-0 transform -translate-y-1/2 -translate-x-1/2 text-sm font-normal" />
              <span className="absolute right-0 top-0 transform -translate-y-1/2 text-sm font-normal">
                {chainName}
              </span>
              DISPERSE
            </div>
          </h1>

          <p className="max-w-2xl text-balance leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            distribute ether or tokens to multiple addresses
          </p>
        </div>
      </section>
      <section className="space-y-6 py-2 sm:py-5 lg:py-5">
        <div className="container max-w-xl">
          <Form {...form}>
            <form onSubmit={formSubmit} className="space-y-6">
              {/* TODO: use FormField here */}
              <Tabs
                className="mb-6"
                defaultValue="native"
                onValueChange={(value) => form.setValue("type", value)}
              >
                <TabsList>
                  <TabsTrigger value="native">Native</TabsTrigger>
                  <TabsTrigger value="erc20">ERC20</TabsTrigger>
                </TabsList>
              </Tabs>
              {type === "native" && (
                <div className="text-[13px]">
                  <span>
                    Balance: {balance?.value ? formattedBalance : "0"} {balance?.symbol}
                  </span>
                </div>
              )}
              {type === "erc20" && (
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="token">Token Address</FormLabel>
                      <FormControl>
                        <Input id="token" autoComplete="off" placeholder="0x..." {...field} />
                      </FormControl>
                      <FormDescription className="text-[13px] flex justify-between">
                        <i
                          className="cursor-pointer hover:text-primary"
                          onClick={() =>
                            form.setValue("token", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359")
                          }
                        >
                          USDC: 0x3c499c...3359 (Polygon)
                        </i>
                        <span>
                          <span className="whitespace-nowrap">
                            Balance: {balance?.value ? formattedBalance : "0"} {balance?.symbol}
                          </span>, 
                          <span className="whitespace-nowrap">Allowance: {allowance ? formatUnits(allowance, balance?.decimals ?? 0) : "0"} {balance?.symbol}
                          </span>
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Addresses and Balances</FormLabel>
                    <FormControl>
                      <Textarea placeholder={`0x123... 1.0\n0x456..., 2.0\n0x789...=3.0`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {type === "erc20" && (
                <>
                  {allowance ? (
                    <div className="flex gap-2 items-center">
                      <Button type="submit" onClick={() => disperseTokenAsync()}>Disperse</Button>
                      <span className="text-[13px] text-muted-foreground">
                        Total: {formattedTotal} {balance?.symbol}
                      </span>
                      <Button type="button" onClick={() => approveAllowanceAsync(0n)}>
                        Revoke
                      </Button>
                      <span className="text-[13px] text-muted-foreground">
                        Allowance: {formatUnits(allowance, decimals)} {balance?.symbol}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <Button type="submit" disabled>Disperse</Button>
                      <span className="text-[13px] text-muted-foreground">
                        Total: {formattedTotal} {balance?.symbol}
                      </span>
                      <Button type="button" onClick={() => approveAllowanceAsync(total)}>
                        Approve
                      </Button>
                      <span className="text-[13px] text-muted-foreground">
                        To spend {formatUnits(total, decimals)} {balance?.symbol} 
                      </span>
                    </div>
                  )}
                </>
              )}
              {type === "native" && (
                <div className="flex gap-2 items-center">
                  <Button type="submit" onClick={() => disperseEtherAsync()}>Disperse</Button>
                  <span className="text-[13px] text-muted-foreground">
                    Total: {formattedTotal} {balance?.symbol}
                  </span>
                </div>
              )}
            </form>
          </Form>
        </div>
      </section>
      <section className="space-y-6 py-2 sm:py-5 lg:py-5 hidden">
        <div className="container max-w-xl">
          <h2 className="text-2xl font-bold">History</h2>
          <ul className="list-disc pl-5">
            <li>Disperse 10 ETH at 01/25 to 5 addresses</li>
            <li>Disperse 200 USDC at 02/15 to 3 addresses</li>
            <li>Disperse 1.5 BTC at 03/05 to 2 addresses</li>
          </ul>
        </div>
      </section>
    </>
  );
}
