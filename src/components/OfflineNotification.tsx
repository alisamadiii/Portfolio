import React from "react";

type Props = {};

export default function OfflineNotification({}: Props) {
  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-center justify-center w-full h-full text-xl bg-white/50 backdrop-blur-3xl">
      <p>You are offline. Please check your internet connection.</p>
    </div>
  );
}
