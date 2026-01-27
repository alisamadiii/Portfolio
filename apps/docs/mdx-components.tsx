import { Banner } from "fumadocs-ui/components/banner";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    img: (props) => (
      <ImageZoom
        className="rounded-xl outline-2 -outline-offset-2 outline-black/10"
        {...(props as any)}
      />
    ),
    Step,
    Steps,
    Banner,
    ...components,
  };
}
