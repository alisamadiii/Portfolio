/**
 * Astro integration. Injects a ~200 B inline check on every page; the actual
 * bridge is a lazy Vite chunk fetched only when `?cms-preview=…` is present
 * (or a prior boot in this tab stored the mode in sessionStorage) — zero cost
 * for normal visitors.
 *
 * `auto: true` additionally registers a build-time Vite pre-transform that
 * wires plain HTML to the CMS automatically (see docs/auto.md). The transform
 * lives in the node-only `./auto` export and is imported lazily so this
 * module stays browser-bundle-safe.
 */

// Minimal structural types so `astro` isn't a hard dependency.
interface AstroIntegrationLike {
  name: string;
  hooks: {
    "astro:config:setup"?: (options: {
      injectScript: (stage: "page", content: string) => void;
      updateConfig: (config: {
        vite: { plugins: unknown[] };
      }) => void;
      config: { root: URL };
    }) => void | Promise<void>;
  };
}

export interface CmsBridgeOptions {
  /**
   * Build-time auto-wiring: annotate plain HTML with data-cms-* attrs,
   * substitute values from the pages JSON (JSON wins), and seed missing keys
   * from markup literals. Default false — zero behavior change.
   */
  auto?: boolean;
}

const LOADER = [
  `(function(){`,
  `var p=new URLSearchParams(location.search).has("cms-preview");`,
  `var s=null;try{s=sessionStorage.getItem("cms-bridge-mode")}catch(e){}`,
  `if(p||s){import("@alisamadiillc/cms-bridge/client").then(function(m){m.boot()})}`,
  `})();`,
].join("");

export default function cmsBridge({ auto = false }: CmsBridgeOptions = {}): AstroIntegrationLike {
  return {
    name: "@alisamadiillc/cms-bridge",
    hooks: {
      async "astro:config:setup"({ injectScript, updateConfig, config }) {
        injectScript("page", LOADER);
        if (auto) {
          // Variable specifier: opaque to esbuild + the dts resolver, so the
          // node-only module never leaks into the browser bundle or types.
          const specifier = "@alisamadiillc/cms-bridge/auto";
          const { autoCmsVitePlugin } = await import(/* @vite-ignore */ specifier);
          updateConfig({
            vite: {
              plugins: [
                autoCmsVitePlugin({ root: config.root.pathname }),
              ],
            },
          });
        }
      },
    },
  };
}
