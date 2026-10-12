import { Metadata } from 'next';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
import { TadweenEmptyState } from '@gitroom/frontend/components/tadween/empty.state';
export const metadata: Metadata = {
  title: 'Error',
  description: '',
};
export default async function Page() {
  const t = await getT();
  return (
    <div className="flex-1 flex items-center justify-center bg-newBgColorInner">
      <TadweenEmptyState
        icon="alert"
        title={t(
          'we_are_experiencing_some_difficulty_try_to_refresh_the_page',
          'We are experiencing some difficulty, try to refresh the page'
        )}
      />
    </div>
  );
}
