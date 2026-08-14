"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { Config } from "@workspace/cms-core/types/config";

interface ConfigContextType {
  config: Config | null;
  setConfig: (config: Config | null) => void;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};

export const ConfigProvider = ({
  value,
  children,
}: {
  value: Config | null;
  children: React.ReactNode;
}) => {
  const [config, setConfig] = useState<Config | null>(value);

  const contextValue = useMemo(() => ({ config, setConfig }), [config]);

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};
