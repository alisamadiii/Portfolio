import { loader } from "fumadocs-core/source";
import { docs } from "fumadocs-mdx:collections/server";

export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});
