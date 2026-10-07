'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { MediumTags } from '@gitroom/frontend/components/new-launch/providers/medium/medium.tags';
import { WebsiteDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/website.dto';

const WebsiteSettings: FC = () => {
  const form = useSettings();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Textarea label="Summary" {...form.register('summary')} />
      <MediaComponent
        label="Cover picture"
        description="Defaults to the first picture of the post"
        {...form.register('cover')}
      />
      <div>
        <MediumTags
          label="Tags (Maximum 10)"
          maxTags={10}
          {...form.register('tags', {
            value: [],
          })}
        />
      </div>
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  comments: false,
  minimumCharacters: [],
  SettingsComponent: WebsiteSettings,
  CustomPreviewComponent: undefined,
  dto: WebsiteDto,
  maximumCharacters: 100000,
  inlineImages: true,
});
