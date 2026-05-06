const SITE = "https://hustlaiapp.in";

const body = `User-agent: *
Disallow: /admin
Disallow: /admin-dashboard
Disallow: /imskygupta-admin
Disallow: /dashboard
Disallow: /workspaces
Disallow: /workspaces-legacy
Disallow: /work
Disallow: /canvas
Disallow: /knowledge-hub
Disallow: /hustlebot
Disallow: /profile
Disallow: /payment
Disallow: /payment-status
Disallow: /onboarding
Disallow: /settings
Disallow: /portal/
Disallow: /p/
Disallow: /_preview/
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

Deno.serve(() =>
  new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  })
);