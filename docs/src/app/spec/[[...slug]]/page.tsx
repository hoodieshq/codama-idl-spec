import { specSource } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';
import { DocsBody, DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Body-only: the generated spec body already opens with a plain-text H1 and a
// lead paragraph, so DocsTitle/DocsDescription would duplicate the heading.
export default async function Page(props: PageProps<'/spec/[[...slug]]'>) {
  const params = await props.params;
  const page = specSource.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(specSource, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return specSource.generateParams();
}

export async function generateMetadata(props: PageProps<'/spec/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = specSource.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
