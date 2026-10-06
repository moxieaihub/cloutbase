import { createFileRoute, Link } from "@tanstack/react-router";

import { AboutCta, AboutPage } from "@/components/AboutPage";

export const Route = createFileRoute("/for-creators")({
  head: () => ({
    meta: [
      { title: "For creators — grow your reach with a clipper corps | Cloutbase" },
      {
        name: "description",
        content:
          "Get approved as a Cloutbase creator and our in-house clipper corps spreads your content as watermarked clips to grow your reach and audience.",
      },
      {
        property: "og:title",
        content: "For creators — grow your reach with a clipper corps | Cloutbase",
      },
      {
        property: "og:description",
        content:
          "Our clipper corps spreads your content as watermarked clips so you grow reach and audience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForCreators,
});

function ForCreators() {
  return (
    <AboutPage
      eyebrow="For creators"
      title="Put a clipper corps behind your content."
      intro="Get approved as a Cloutbase creator and our in-house clippers spread your content as watermarked clips. This is about growth and reach — it isn't a paid gig, and it doesn't cost you a budget."
      points={[
        "Your clips carry the Cloutbase watermark so the source stays clear.",
        "Only approved in-house clippers work creator campaigns.",
        "You set the KPI and the assets; we handle distribution.",
        "You keep every follower, view and subscriber the clips bring in.",
      ]}
      steps={[
        {
          title: "Get approved",
          body: "Apply and our team reviews your channel and content fit for the clipper corps.",
        },
        {
          title: "Our clippers spread it",
          body: "Approved in-house clippers cut your video into native posts across TikTok, Instagram and YouTube.",
        },
        {
          title: "Grow",
          body: "Watch reach, followers and subscribers climb from clips you never had to make.",
        },
      ]}
      ctaLabel="Apply as a creator"
      cta={
        <Link to="/become-a-clipper">
          <AboutCta>Apply as a creator →</AboutCta>
        </Link>
      }
    />
  );
}
