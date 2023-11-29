/* eslint-disable */

import { defineDocumentType, makeSource } from "contentlayer/source-files";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

const computedFields = {
  slug: {
    type: "string",
    resolve: (doc) => `/${doc._raw.flattenedPath}`,
  },
  slugAsParams: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/"),
  },
};

const Blog = defineDocumentType(() => ({
  name: "Blog",
  filePathPattern: "blog/**/*.mdx",
  contentType: "mdx",
  fields: {
    uniqueId: {
      type: "number",
      default: true,
    },
    isComplete: {
      type: "boolean",
      default: false,
    },
    title: {
      type: "string",
      required: true,
    },
    text_information: {
      type: "string",
      required: true,
    },
    publishAt: {
      type: "date",
      required: true,
    },
    blogImage: {
      type: "string",
      required: true,
    },
    keyboard: {
      type: "list",
      of: { type: "string" },
    },
  },
  computedFields,
}));

const Service = defineDocumentType(() => ({
  name: "Service",
  filePathPattern: "service/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
      required: true,
    },
    image: {
      type: "string",
      required: true,
    },
    keyboard: {
      type: "list",
      of: { type: "string" },
    },
    advance: {
      type: "boolean",
      default: false,
      required: true,
    },
  },
  computedFields,
}));

export default makeSource({
  contentDirPath: "./content",
  documentTypes: [Blog, Service],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: "one-dark-pro",
          keepBackground: false,
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
});
