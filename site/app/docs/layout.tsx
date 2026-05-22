import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { DocsTransientScrollbars } from '@/components/docs-transient-scrollbars';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      <DocsTransientScrollbars />
      {children}
    </DocsLayout>
  );
}
