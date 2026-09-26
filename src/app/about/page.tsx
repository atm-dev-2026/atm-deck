import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/current-user";
import { AboutContent } from "@/components/AboutContent";

const SECTION_KEYS = ["boards", "myTasks", "chat", "notifications", "access", "settings"] as const;

export default async function AboutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("About");

  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AboutContent title={t("title")} subtitle={t("subtitle")} sections={sections} footer={t("footer")} />
    </div>
  );
}
