const ORIGIN='https://www.colelearninglabs.com';
const RELEASE='20261117-foundations-course';
/** A generated course file's public address: no .html and no /index. */
export const coursePageRoute=file=>'/'+file.replace(/\/index\.html$/u,'').replace(/\.html$/u,'');
export const esc=value=>String(value??'').replace(/[&<>"']/gu,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function coursePage({title,description,pathname,body,footerNote}){
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#102c46">
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${ORIGIN}${pathname}">
  <meta property="og:image" content="${ORIGIN}/assets/cole-learning-labs-social.png">
  <meta name="twitter:card" content="summary_large_image">
  <title>${esc(title)} · Cole Learning Labs</title>
  <link rel="canonical" href="${ORIGIN}${pathname}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/src/styles.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/school.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/foundations-course.css?release=${RELEASE}">
  <link rel="stylesheet" href="/src/accessibility.css?release=${RELEASE}">
</head>
<body class="fc-page">
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header school-header fc-header"><a class="brand" href="/"><img src="/assets/cole-learning-labs-logo.webp" alt="Cole Learning Labs" width="336" height="140"></a><nav aria-label="Site menu"><a href="/courses">Courses</a><a href="/teach">For teachers</a><a href="/#labs">Interactive labs</a><a href="/networking">Networking pathway</a><a href="/district-review">School review</a></nav></header>
  <main id="main" class="wrap fc-main" tabindex="-1">${body}</main>
  <footer class="wrap fc-footer">${footerNote}<p>Student work is submitted and graded through the school’s approved system. <a href="/district-review">Review the site’s data practices</a>.</p></footer>
</body>
</html>
`;
}
