import { TemplatesClient } from "@/components/projects/TemplatesClient";
import { listTemplates } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return <TemplatesClient templates={templates} />;
}
