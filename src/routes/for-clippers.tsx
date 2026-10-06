import { createFileRoute, Link } from "@tanstack/react-router";

import { AboutCta, AboutPage } from "@/components/AboutPage";

export const Route = createFileRoute("/for-clippers")({
  head: () => ({
    meta: [
      { title: "For clippers — get paid per 1,000 verified views | Cloutbase" },
      {
        name: "description",
        content:
          "Clip for Nigerian brands and get paid per 1,000 verified views. Same rate for everyone, volume wins, rank up Rookie to Legend, paid every Friday.",
      },
      { property: "og:title", content: "For clippers — get paid per 1,000 verified views" },
      {
        property: "og:description",
        content:
          "Same rate for everyone, volume wins, rank up Rookie to Legend, paid every Friday.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForClippers,
});

function ForClippers() {
  return (
    <AboutPage
      eyebrow="For clippers"
      title="Turn your clips into real money."
      intro="You get paid per 1,000 verified views. The rate is the same for everyone — volume is what separates a Rookie from a Legend."
      points={[
        "Same ₦ per 1,000 views for every clipper, whatever your rank.",
        "Rank up Rookie → Pro → Elite → Legend on lifetime verified views.",
        "Higher ranks unlock more clips per day, early access and creator gigs.",
        "Paid every Friday, released by an admin once views are verified.",
        "Bots, bought views or multi-accounting = instant ban, no pay.",
      ]}
      steps={[
        {
          title: "Claim a slot",
          body: "Browse live campaigns, see exactly what you can earn, and join one to unlock submissions.",
        },
        {
          title: "Clip and post a lot",
          body: "Post as many clips as your rank allows. Every view stacks toward your total — keep posting past your ceiling for bonus pool and faster rank-up.",
        },
        {
          title: "Rank up and get paid",
          body: "Clips must stay live 5 days to count. Verified earnings pay out on Friday to the bank details on your profile.",
        },
      ]}
      ctaLabel="Start clipping"
      cta={
        <Link to="/signup/$type" params={{ type: "clipper" }}>
          <AboutCta>Start clipping →</AboutCta>
        </Link>
      }
    />
  );
}
