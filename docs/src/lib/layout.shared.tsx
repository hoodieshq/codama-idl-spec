import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // `title` is a ReactNode rendered in the sidebar/nav header.
      title: (
        <>
          <Image src="/codama-logo.png" alt="Codama Spec" width={24} height={24} />
          Codama Spec
        </>
      ),
    },
    links: [
      // Hidden until these sections have content - uncomment to restore.
      // { text: 'Documentation', url: '/docs' },
      // { text: 'Recipes', url: '/recipes' },
      { text: 'Spec', url: '/spec' },
    ],
  };
}
