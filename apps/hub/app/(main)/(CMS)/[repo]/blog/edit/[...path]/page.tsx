import { BlogComposer } from "@/components/blog/blog-composer";

export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const filePath = path.map(decodeURIComponent).join("/");
  return <BlogComposer mode="edit" path={filePath} />;
}
