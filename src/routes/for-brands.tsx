import { createFileRoute, Link } from "@tanstack/react-router";

import { AboutCta, AboutPage } from "@/components/AboutPage";

export const Route = createFileRoute("/for-brands")({
  head: () => ({
    meta: [
      { title: "For brands — pay only for verified views | Cloutbase" },
      {
        name: "description",
        content:
          "Fund a campaign from ₦50,000 and vetted Nigerian clippers turn your video into native posts across TikTok, Instagram and YouTube. You pay only for verified views.",
      },
      { property: "og:title", content: "For brands — pay only for verified views | Cloutbase" },
      {
        property: "og:description",
        content:
          "Fund a campaign, vetted clippers spread your video, and you pay only for verified views. You can never overspend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForBrands,
});

function ForBrands() {
  return (
    <AboutPage
      eyebrow="For brands"
      title="Turn a budget into millions of real views."
      intro="You fund a campaign. Vetted clippers turn your video into native posts across TikTok, Instagram and YouTube. You pay only for verified views."
      points={[
        "Minimum budget ₦50,000 — you can never overspend it.",
        "Every clipper's payout is capped, so the pool is the ceiling.",
        "Verified views only, counted after a clip has stayed live 5 days.",
        "You are solely liable for your own message and claims.",
      ]}
      steps={[
        {
          title: "Drop your video and budget",
          body: "Paste a source link, set a budget and a deadline, and add the caption, hashtags, brand tag and CTA link clippers must use.",
        },
        {
          title: "We review, then it goes live",
          body: "Once funded, our team reviews the campaign and publishes it to the clipper corps. You can't self-publish — that keeps quality up.",
        },
        {
          title: "Watch the views land",
          body: "Your analytics page shows verified views delivered, platform breakdown and every clip link, tappable for spot-checks.",
        },
      ]}
      ctaLabel="Start a campaign"
      cta={
        <Link to="/signup/$type" params={{ type: "business" }}>
          <AboutCta>Start a campaign →</AboutCta>
        </Link>
      }
    />
  );
}
