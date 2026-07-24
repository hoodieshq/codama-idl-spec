import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { recipesSource } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/recipes'>) {
  return (
    <DocsLayout tree={recipesSource.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
