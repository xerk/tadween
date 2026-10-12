'use client';

import React, {
  FC,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import EventEmitter from 'events';
import clsx from 'clsx';
import { VideoFrame } from '@gitroom/react/helpers/video.frame';
import dynamic from 'next/dynamic';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { AiImage } from '@gitroom/frontend/components/launches/ai.image';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ThirdPartyMedia } from '@gitroom/frontend/components/third-parties/third-party.media';
import { ReactSortable } from 'react-sortablejs';
import { MediaComponentInner } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { AiVideo } from '@gitroom/frontend/components/launches/ai.video';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseCircleIcon,
  DragHandleIcon,
  MediaSettingsIcon,
  InsertMediaIcon,
  DesignMediaIcon,
  VerticalDividerIcon,
} from '@gitroom/frontend/components/ui/icons';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { MediaLibrary } from '@gitroom/frontend/components/tadween/media/media.library';
const Polonto = dynamic(
  () => import('@gitroom/frontend/components/launches/polonto')
);
const showModalEmitter = new EventEmitter();
// on phones the media library takes the whole screen
export const mediaLibrarySize = () =>
  window.matchMedia('(max-width: 1025px)').matches
    ? '100%'
    : 'calc(100% - 80px)';
export const Pagination: FC<{
  current: number;
  totalPages: number;
  setPage: (num: number) => void;
}> = (props) => {
  const t = useT();

  const { current, totalPages, setPage } = props;

  const paginationItems = useMemo(() => {
    // Convert to 1-based for algorithm (current is 0-based)
    const c = current + 1;
    const m = totalPages;

    // If total pages <= 10, show all pages
    if (m <= 10) {
      return Array.from({ length: m }, (_, i) => i + 1);
    }

    const delta = 3;
    const left = c - delta;
    const right = c + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];
    let l: number | undefined;

    // Build the range of pages to show
    for (let i = 1; i <= m; i++) {
      if (i === 1 || i === m || (i >= left && i < right)) {
        range.push(i);
      }
    }

    // Add dots where there are gaps
    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    // Limit to maximum 10 items by trimming pages near edges if needed
    while (rangeWithDots.length > 10) {
      const currentIndex = rangeWithDots.findIndex((item) => item === c);
      if (currentIndex !== -1 && currentIndex > rangeWithDots.length / 2) {
        // Current is in second half, remove one item from start side
        rangeWithDots.splice(2, 1);
      } else {
        // Current is in first half, remove one item from end side
        rangeWithDots.splice(-3, 1);
      }
    }

    return rangeWithDots;
  }, [current, totalPages]);

  return (
    <ul className="flex flex-row flex-wrap items-center gap-1 justify-center mt-[15px]">
      <li className={clsx(current === 0 && 'opacity-20 pointer-events-none')}>
        <div
          className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 ps-2.5 text-gray-400 hover:text-white border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to previous page"
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeftIcon className="lucide lucide-chevron-left h-4 w-4" />
          <span className="mobile:hidden">{t('previous', 'Previous')}</span>
        </div>
      </li>
      {paginationItems.map((item, index) => (
        // phones show "2 / 6" instead of the page numbers
        <li key={index} className="mobile:hidden">
          {item === '...' ? (
            <span className="inline-flex items-center justify-center h-10 w-10 text-textColor select-none">
              ...
            </span>
          ) : (
            <div
              aria-current="page"
              onClick={() => setPage(item - 1)}
              className={clsx(
                'cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:bg-forth h-10 w-10 hover:text-white border-newBorder',
                current === item - 1
                  ? 'bg-forth !text-white'
                  : 'text-textColor hover:text-white'
              )}
            >
              {item}
            </div>
          )}
        </li>
      ))}
      <li className="hidden mobile:flex h-10 items-center px-[8px] text-[14px] text-textColor">
        {current + 1} / {totalPages}
      </li>
      <li
        className={clsx(
          current + 1 === totalPages && 'opacity-20 pointer-events-none'
        )}
      >
        <a
          className="text-textColor hover:text-white group cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 gap-1 pe-2.5 text-gray-400 border-[#1F1F1F] hover:bg-forth"
          aria-label="Go to next page"
          onClick={() => setPage(current + 1)}
        >
          <span className="mobile:hidden">{t('next', 'Next')}</span>
          <ChevronRightIcon className="lucide lucide-chevron-right h-4 w-4" />
        </a>
      </li>
    </ul>
  );
};
export const ShowMediaBoxModal: FC = () => {
  const modals = useModals();
  const t = useT();
  useEffect(() => {
    showModalEmitter.on('show-modal', (cCallback) => {
      modals.openModal({
        title: t('media_library', 'Media Library'),
        askClose: false,
        closeOnEscape: true,
        fullScreen: true,
        size: mediaLibrarySize(),
        height: mediaLibrarySize(),
        children: (close) => (
          <MediaBox
            setMedia={(media) => cCallback(media[0])}
            closeModal={close}
          />
        ),
      });
    });
    return () => {
      showModalEmitter.removeAllListeners('show-modal');
    };
  }, []);
  return null;
};
export const showMediaBox = (
  callback: (params: { id: string; path: string }) => void
) => {
  showModalEmitter.emit('show-modal', callback);
};
// The Tadween media library (components/tadween/media) in its two modes:
// standalone is the /media page, otherwise it's the picker, which hands back
// the selected media in the order they were picked.
export const MediaBox: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  standalone?: boolean;
  type?: 'image' | 'video';
  closeModal: () => void;
}> = ({ type, standalone, setMedia }) => {
  const modals = useModals();
  return (
    <MediaLibrary
      mode={standalone ? 'page' : 'picker'}
      type={type}
      onCancel={() => modals.closeCurrent()}
      onPick={(media) => {
        // the same fields the picker always handed to the composer
        setMedia(
          media.map((p) => ({
            id: p.id,
            name: p.name,
            originalName: p.originalName,
            path: p.path,
            thumbnail: p.thumbnail,
            alt: p.alt,
            thumbnailTimestamp: p.thumbnailTimestamp,
          }))
        );
        modals.closeCurrent();
      }}
    />
  );
};
export const MultiMediaComponent: FC<{
  label: string;
  description: string;
  mediaNotAvailable?: boolean;
  dummy: boolean;
  allData: {
    content: string;
    id?: string;
    image?: Array<{
      id: string;
      path: string;
    }>;
  }[];
  value?: Array<{
    path: string;
    id: string;
  }>;
  text: string;
  name: string;
  error?: any;
  onOpen?: () => void;
  onClose?: () => void;
  toolBar?: React.ReactNode;
  // after the tools, outside of their scroll
  toolBarEnd?: React.ReactNode;
  toolsClassName?: string;
  toolsStyle?: React.CSSProperties;
  information?: React.ReactNode;
  insertInContent?: (media: Array<{ id: string; path: string }>) => void;
  onChange: (event: {
    target: {
      name: string;
      value?: Array<{
        id: string;
        path: string;
        alt?: string;
        thumbnail?: string;
        thumbnailTimestamp?: number;
      }>;
    };
  }) => void;
}> = (props) => {
  const {
    name,
    error,
    text,
    onChange,
    value,
    allData,
    dummy,
    toolBar,
    toolBarEnd,
    toolsClassName,
    toolsStyle,
    information,
    mediaNotAvailable,
    insertInContent,
  } = props;
  const user = useUser();
  const modals = useModals();
  const t = useT();
  useEffect(() => {
    if (value) {
      setCurrentMedia(value);
    }
  }, [value]);

  const [currentMedia, setCurrentMedia] = useState(value);
  const mediaDirectory = useMediaDirectory();
  const changeMedia = useCallback(
    (
      m:
        | {
            path: string;
            id: string;
          }
        | {
            path: string;
            id: string;
          }[]
    ) => {
      const mediaArray = Array.isArray(m) ? m : [m];
      if (insertInContent) {
        insertInContent(mediaArray);
        return;
      }

      const newMedia = [...(currentMedia || []), ...mediaArray];
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia, insertInContent]
  );
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: mediaLibrarySize(),
      height: mediaLibrarySize(),
      children: (close) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
          type={insertInContent ? 'image' : undefined}
        />
      ),
    });
  }, [changeMedia, insertInContent, t]);

  const clearMedia = useCallback(
    (topIndex: number) => () => {
      const newMedia = currentMedia?.filter((f, index) => index !== topIndex);
      setCurrentMedia(newMedia);
      onChange({
        target: {
          name,
          value: newMedia,
        },
      });
    },
    [currentMedia]
  );

  const designMedia = useCallback(() => {
    if (!!user?.tier?.ai && !dummy) {
      modals.openModal({
        askClose: false,
        title: t('design_media', 'Design Media'),
        size: '80%',
        children: (close) => (
          <Polonto setMedia={changeMedia} closeModal={close} />
        ),
      });
    }
  }, [changeMedia, t]);

  return (
    <>
      <div className="b1 flex flex-col gap-[8px] mobile:gap-[16px] rounded-bl-[8px] select-none w-full">
        <div className="flex gap-[10px] px-[12px] mobile:px-0 mobile:empty:hidden">
          {!!currentMedia?.length && (
            <ReactSortable
              list={currentMedia}
              setList={(value) =>
                onChange({ target: { name: 'upload', value } })
              }
              className="flex gap-[10px] sortable-container"
              animation={200}
              swap={true}
              handle=".dragging"
            >
              {currentMedia.map((media, index) => (
                  <div key={media.id} className="cursor-pointer rounded-[5px] w-[40px] h-[40px] mobile:w-[60px] mobile:h-[60px] mobile:rounded-[8px] border-2 mobile:border-0 border-tableBorder relative flex transition-all">
                    <DragHandleIcon className="z-[20] dragging absolute pe-[1px] pb-[3px] -start-[4px] -top-[4px] cursor-move" />

                    <div className="w-full h-full relative group">
                      <div
                        onClick={async () => {
                          modals.openModal({
                            title: t('media_settings', 'Media Settings'),
                            children: (close) => (
                              <MediaComponentInner
                                media={media as any}
                                onClose={close}
                                onSelect={(value: any) => {
                                  onChange({
                                    target: {
                                      name: 'upload',
                                      value: currentMedia.map((p) => {
                                        if (p.id === media.id) {
                                          return {
                                            ...p,
                                            ...value,
                                          };
                                        }
                                        return p;
                                      }),
                                    },
                                  });
                                }}
                              />
                            ),
                          });
                        }}
                        className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] bg-black/80 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-[9]"
                      >
                        <MediaSettingsIcon className="cursor-pointer relative z-[200]" />
                      </div>
                      {hasExtension(media?.path, 'mp4') ? (
                        <VideoFrame url={mediaDirectory.set(media?.path)} />
                      ) : (
                        <img
                          className="w-full h-full object-cover rounded-[4px] mobile:rounded-[8px]"
                          src={mediaDirectory.set(media?.path)}
                        />
                      )}
                    </div>

                    <CloseCircleIcon
                      onClick={clearMedia(index)}
                      className="absolute -end-[4px] -top-[4px] mobile:-end-[8px] mobile:-top-[8px] mobile:w-[24px] mobile:h-[24px] z-[20] rounded-full bg-white"
                    />
                  </div>
              ))}
            </ReactSortable>
          )}
        </div>
        {/* on phones the info stays with the post, the tools can move to the bottom */}
        {information && (
          <div className="hidden mobile:flex justify-end">{information}</div>
        )}
        <div
          className={clsx(
            'flex gap-[8px] px-[12px] mobile:px-0 border-t border-newColColor mobile:border-t-0 w-full b1 text-textColor',
            toolsClassName
          )}
          style={toolsStyle}
        >
          <div className="flex gap-[8px] mobile:gap-[4px] mobile:flex-1 mobile:min-w-0 mobile:overflow-x-auto mobile:scrollbar-none b1">
            {!mediaNotAvailable && (
              <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
                <div
                  onClick={showModal}
                  className="cursor-pointer h-[30px] mobile:h-[40px] mobile:min-w-[40px] rounded-[6px] mobile:rounded-[8px] justify-center items-center flex bg-newColColor mobile:bg-newSettings px-[8px]"
                >
                  <div className="flex gap-[8px] items-center">
                    <div>
                      <InsertMediaIcon className="mobile:w-[20px] mobile:h-[20px]" />
                    </div>
                    <div className="text-[10px] font-[600] maxMedia:hidden block">
                      {t('insert_media', 'Insert Media')}
                    </div>
                  </div>
                </div>
                <div
                  onClick={designMedia}
                  className="cursor-pointer h-[30px] rounded-[6px] justify-center items-center flex bg-newColColor px-[8px] mobile:hidden"
                >
                  <div className="flex gap-[5px] items-center">
                    <div>
                      <DesignMediaIcon />
                    </div>
                    <div className="text-[10px] font-[600] iconBreak:hidden block">
                      {t('design_media', 'Design Media')}
                    </div>
                  </div>
                </div>

                {!insertInContent && (
                  <ThirdPartyMedia allData={allData} onChange={changeMedia} />
                )}

                {!!user?.tier?.ai && (
                  <>
                    <AiImage value={text} onChange={changeMedia} />
                    {!insertInContent && (
                      <AiVideo value={text} onChange={changeMedia} />
                    )}
                  </>
                )}
              </div>
            )}
            {!mediaNotAvailable && (
              <div
                className={clsx(
                  'text-newColColor h-full flex items-center mobile:shrink-0 mobile:px-[4px]',
                  !toolBar && 'mobile:hidden'
                )}
              >
                <VerticalDividerIcon />
              </div>
            )}
            {!!toolBar && (
              <div className="flex py-[10px] mobile:py-0 mobile:shrink-0 b2 items-center gap-[4px]">
                {toolBar}
              </div>
            )}
            {!!toolBar && (
              <div className="hidden mobile:block sticky end-0 shrink-0 w-[40px] pointer-events-none bg-gradient-to-l rtl:bg-gradient-to-r from-newBgColorInner" />
            )}
          </div>
          {toolBarEnd}
          {information && (
            <div className="flex-1 justify-end flex py-[10px] mobile:hidden b2 items-center gap-[4px]">
              {information}
            </div>
          )}
        </div>
      </div>
      <div className="text-[12px] text-red-400">{error}</div>
    </>
  );
};
export const MediaComponent: FC<{
  label: string;
  description: string;
  value?: {
    path: string;
    id: string;
  };
  name: string;
  onChange: (event: {
    target: {
      name: string;
      value?: {
        id: string;
        path: string;
      };
    };
  }) => void;
  type?: 'image' | 'video';
  width?: number;
  height?: number;
}> = (props) => {
  const t = useT();

  const { name, type, label, description, onChange, value, width, height } =
    props;
  const { getValues } = useSettings();
  const user = useUser();
  useEffect(() => {
    const settings = getValues()[props.name];
    if (settings) {
      setCurrentMedia(settings);
    }
  }, []);
  const [currentMedia, setCurrentMedia] = useState(value);
  const modals = useModals();
  const mediaDirectory = useMediaDirectory();

  const showDesignModal = useCallback(() => {
    modals.openModal({
      title: t('media_editor', 'Media Editor'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close) => (
        <Polonto
          width={width}
          height={height}
          setMedia={changeMedia}
          closeModal={close}
        />
      ),
    });
  }, [t]);
  const changeMedia = useCallback((m: { path: string; id: string }[]) => {
    setCurrentMedia(m[0]);
    onChange({
      target: {
        name,
        value: m[0],
      },
    });
  }, []);
  const showModal = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: mediaLibrarySize(),
      height: mediaLibrarySize(),
      children: (close) => (
        <MediaBox setMedia={changeMedia} closeModal={close} type={type} />
      ),
    });
  }, [t]);
  const clearMedia = useCallback(() => {
    setCurrentMedia(undefined);
    onChange({
      target: {
        name,
        value: undefined,
      },
    });
  }, [value]);
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="text-[14px]">{label}</div>
      <div className="text-[12px]">{description}</div>
      {!!currentMedia && (
        <div className="my-[20px] cursor-pointer w-[200px] h-[200px] border-2 border-tableBorder">
          <img
            className="w-full h-full object-cover"
            src={currentMedia.path}
            onClick={() => window.open(mediaDirectory.set(currentMedia.path))}
          />
        </div>
      )}
      <div className="flex gap-[5px]">
        <Button onClick={showModal}>{t('select', 'Select')}</Button>
        <Button
          onClick={showDesignModal}
          className="!bg-customColor45 mobile:hidden"
        >
          {t('editor', 'Editor')}
        </Button>
        <Button secondary={true} onClick={clearMedia}>
          {t('clear', 'Clear')}
        </Button>
      </div>
    </div>
  );
};
