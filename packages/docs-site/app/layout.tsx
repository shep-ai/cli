import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: {
    default: 'Shep — Autonomous AI SDLC Platform',
    template: '%s — Shep Docs',
  },
  description:
    'Run multiple AI agents in parallel. Each in its own worktree. Manage features, branches, and PRs from a dashboard or the terminal.',
  openGraph: {
    title: 'Shep — Autonomous AI SDLC Platform',
    description: 'Run multiple AI agents in parallel. Each in its own worktree.',
    siteName: 'Shep Docs',
  },
};

const navbar = (
  <Navbar
    logo={<span style={{ fontWeight: 800, fontSize: '1.2em' }}>Shep</span>}
    projectLink="https://github.com/shep-ai/shep"
  />
);

const footer = <Footer>MIT {new Date().getFullYear()} &copy; Shep AI</Footer>;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/shep-ai/shep/tree/main/packages/docs-site"
          footer={footer}
          editLink="Edit this page on GitHub"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
