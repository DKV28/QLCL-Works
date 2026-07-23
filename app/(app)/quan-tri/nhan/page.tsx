import { TagsClient } from "@/components/admin/TagsClient";
import { listTags } from "@/lib/data/tags";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await listTags();
  return <TagsClient tags={tags} />;
}
