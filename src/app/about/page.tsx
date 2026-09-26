import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/current-user";
import { AboutContent } from "@/components/AboutContent";

const SECTION_KEYS = ["boards", "myTasks", "chat", "notifications", "access", "settings"] as const;
const MARQUEE_COUNT = 8;

export default async function AboutPage() {
  const user = await getSessionUser();
  const t = await getTranslations("About");

  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));
  const marquee = Array.from({ length: MARQUEE_COUNT }, (_, i) => t(`marquee.${i}`));

  return (
    <AboutContent
      signedIn={Boolean(user)}
      title={t("title")}
      subtitle={t("subtitle")}
      featuresEyebrow={t("featuresEyebrow")}
      featuresHeading={t("featuresHeading")}
      sections={sections}
      marquee={marquee}
      footer={t("footer")}
      nav={{ features: t("nav.features") }}
      cta={{ signIn: t("cta.signIn"), openApp: t("cta.openApp"), learnMore: t("cta.learnMore") }}
    />
  );
}
