import { LocalServicePage } from '@/components/site/local-page';
import { LOCAL_PAGES } from '@/content/local';

export default function Page() {
  return <LocalServicePage page={LOCAL_PAGES[3]} />;
}
