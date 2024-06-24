import React from "react";

import { FaFirefox } from "react-icons/fa";

interface Props {
  onScanClickHandler: () => void;
}

export default function ConnectWallet({ onScanClickHandler }: Props) {
  return (
    <>
      <div className="mt-2 flex flex-col gap-3">
        {["MetaMask", "Coinbase Wallet", "Other Wallets"].map(
          (value, index) => (
            <button
              key={index}
              className="flex h-16 items-center justify-between rounded-2xl bg-white px-[20px] duration-200 hover:bg-[#F0F2F5]"
              onClick={onScanClickHandler}
            >
              {value} <FaFirefox className="text-3xl" />
            </button>
          )
        )}
      </div>

      <button className="mt-4 h-[42px] w-full text-[#999999] hover:text-black">
        I don&apos;t have a wallet
      </button>
    </>
  );
}
