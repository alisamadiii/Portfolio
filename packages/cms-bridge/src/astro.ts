/**
 * Astro integration. Injects a ~200 B inline check on every page; the actual
 * bridge is a lazy Vite chunk fetched only when `?cms-preview=…` is present
 * (or a prior boot in this tab stored the mode in sessionStorage) — zero cost
 * for normal visitors.
 */

// Minimal structural type so `astro` isn't a hard dependency.
interface AstroIntegrationLike {
  name: string;
  hooks: {
    "astro:config:setup"?: (options: {
      injectScript: (stage: "page", content: string) => void;
    }) => void;
  };
}

const LOADER = [
  `(function(){`,
  `var p=new URLSearchParams(location.search).has("cms-preview");`,
  `var s=null;try{s=sessionStorage.getItem("cms-bridge-mode")}catch(e){}`,
  `if(p||s){import("@alisamadiillc/cms-bridge/client").then(function(m){m.boot()})}`,
  `})();`,
].join("");

export default function cmsBridge(): AstroIntegrationLike {
  return {
    name: "@alisamadiillc/cms-bridge",
    hooks: {
      "astro:config:setup"({ injectScript }) {
        injectScript("page", LOADER);
      },
    },
  };
}
