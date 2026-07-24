import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { specSource } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/spec'>) {
  return (
    <DocsLayout tree={specSource.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
