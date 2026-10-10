import { create } from 'zustand';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { useShallow } from 'zustand/react/shallow';
import React, {
  createContext,
  FC,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';
import { Button } from '@gitroom/react/form/button';
import { useHotkeys } from 'react-hotkeys-hook';
import clsx from 'clsx';
import { EventEmitter } from 'events';

interface OpenModalInterface {
  title?: any;
  closeOnClickOutside?: boolean;
  removeLayout?: boolean;
  fullScreen?: boolean;
  // with removeLayout: a sheet on the inline-end side, the page stays visible
  // (not blurred) behind a light scrim that closes it (through askClose)
  // unless closeOnClickOutside is false; phones get the full screen
  drawer?: boolean;
  top?: string | number;
  closeOnEscape?: boolean;
  withCloseButton?: boolean;
  destructive?: boolean;
  // a function decides on every close, e.g. ask only when there are unsaved changes
  askClose?: boolean | (() => boolean);
  onClose?: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  classNames?: {
    modal?: string;
  };
  size?: string | number;
  maxSize?: string | number;
  height?: string | number;
  id?: string;
}

interface ModalManagerStoreInterface {
  closeById(id: string): void;
  openModal(params: OpenModalInterface): void;
  closeAll(): void;
}

interface State extends ModalManagerStoreInterface {
  modalManager: Array<{ id: string } & OpenModalInterface>;
}

const useModalStore = create<State>((set) => ({
  modalManager: [],
  openModal: (params) => {
    const newId = params.id || makeId(20);
    set((state) => ({
      modalManager: [
        ...state.modalManager,
        ...(!state.modalManager.some((p) => p.id === newId)
          ? [{ id: newId, ...params }]
          : []),
      ],
    }));
  },
  closeById: (id) =>
    set((state) => ({
      modalManager: state.modalManager.filter((modal) => modal.id !== id),
    })),
  closeAll: () => set({ modalManager: [] }),
}));

const CurrentModalContext = createContext({ id: '' });

// what a drawer tells its content: it is in a drawer, whether it is the top
// layer (a dialog opened above it gets the keyboard), and the id its title
// should carry so the dialog is named by it
const ModalDrawerContext = createContext<{
  isLast: boolean;
  titleId: string;
} | null>(null);
export const useModalDrawer = () => useContext(ModalDrawerContext);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// A side sheet: role="dialog" + aria-modal, focus moves in on open and back
// on close, Tab cycles inside it, the scrim closes it (through askClose), and
// Escape in a text field first leaves the field so the next Escape closes.
// Styles: app/tadween/drawer.scss.
const ModalDrawer: FC<{
  zIndex: number;
  isLast: boolean;
  onClose?: () => void;
  children: ReactNode;
}> = ({ zIndex, isLast, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus({ preventScroll: true });
    }
    return () => {
      if (previous && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  // back on top (a dialog above it closed): focus comes back in, and Tab
  // from outside the panel (the page behind) lands on its first control
  useEffect(() => {
    if (!isLast) {
      return;
    }

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus({ preventScroll: true });
    }

    const onTab = (e: KeyboardEvent) => {
      // a sheet or popup of its own (portalled to <body>) keeps its focus
      if (
        e.key !== 'Tab' ||
        !panelRef.current ||
        panelRef.current.contains(document.activeElement) ||
        document.activeElement?.closest('[role="dialog"]')
      ) {
        return;
      }
      e.preventDefault();
      panelRef.current.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [isLast]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const panel = panelRef.current;
      if (!isLast || !panel) {
        return;
      }

      // ProseMirror marks every Escape as handled (it selects the parent
      // node), so a rich-text editor is left whatever it did with the key
      const target = e.target as HTMLElement;
      if (
        e.key === 'Escape' &&
        (target.isContentEditable ||
          (!e.defaultPrevented && target.matches('input, textarea, select')))
      ) {
        target.blur();
        panel.focus({ preventScroll: true });
        return;
      }

      // a sheet inside the panel (phones) keeps Tab in itself
      if (
        e.key !== 'Tab' ||
        e.defaultPrevented ||
        target.closest('[role="dialog"]') !== panel
      ) {
        return;
      }

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((p) => p.offsetParent !== null);
      if (!items.length) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [isLast]
  );

  const context = useMemo(() => ({ isLast, titleId }), [isLast, titleId]);

  return (
    <div style={{ zIndex }} className="tdw-drawer text-newTextColor">
      <div className="tdw-drawer-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="tdw-drawer-panel"
      >
        <ModalDrawerContext.Provider value={context}>
          {children}
        </ModalDrawerContext.Provider>
      </div>
    </div>
  );
};

interface ModalManagerInterface extends ModalManagerStoreInterface {
  closeCurrent(): void;
}

export const useModals = () => {
  const { closeAll, openModal, closeById } = useModalStore(
    useShallow((state) => ({
      openModal: state.openModal,
      closeById: state.closeById,
      closeAll: state.closeAll,
    }))
  );

  const modalContext = useContext(CurrentModalContext);

  return {
    openModal,
    closeAll,
    closeById,
    closeCurrent: () => {
      if (modalContext.id) {
        closeById(modalContext.id);
      }
    },
  } satisfies ModalManagerInterface;
};

export const Component: FC<{
  closeModal: (id: string) => void;
  zIndex: number;
  isLast: boolean;
  modal: { id: string } & OpenModalInterface;
}> = memo(({ isLast, modal, closeModal, zIndex }) => {
  const decision = useDecisionModal();
  const closeModalFunction = useCallback(async () => {
    if (
      typeof modal.askClose === 'function' ? modal.askClose() : modal.askClose
    ) {
      const open = await decision.open();
      if (!open) {
        return;
      }
    }
    modal?.onClose?.();
    closeModal(modal.id);
  }, [modal.id, closeModal]);

  const RenderComponent = useMemo(() => {
    return typeof modal.children === 'function'
      ? modal.children(closeModalFunction)
      : modal.children;
  }, [modal, closeModalFunction]);

  useHotkeys(
    'Escape',
    () => {
      if (isLast) {
        closeModalFunction();
      }
    },
    [isLast, closeModalFunction]
  );

  if (modal.removeLayout && modal.drawer) {
    return (
      <ModalDrawer
        zIndex={zIndex}
        isLast={isLast}
        onClose={
          modal.closeOnClickOutside === false ? undefined : closeModalFunction
        }
      >
        {typeof modal.children === 'function'
          ? modal.children(closeModalFunction)
          : modal.children}
      </ModalDrawer>
    );
  }

  if (modal.removeLayout) {
    return (
      <div
        style={{ zIndex }}
        className={clsx(
          !modal.fullScreen
            ? 'pb-[50px] min-w-full min-h-full'
            : 'w-full h-full mobile:block',
          'fixed flex left-0 top-0 bg-popup transition-all animate-fadeIn overflow-y-auto text-newTextColor',
          !isLast && '!overflow-hidden'
        )}
      >
        <div
          className={clsx(
            modal.fullScreen && 'flex mobile:min-h-full',
            'relative flex-1 mobile:min-w-0'
          )}
        >
          <div
            className={clsx(
              modal.fullScreen
                ? 'flex flex-1 mobile:min-w-0'
                : 'absolute top-0 left-0 min-w-full min-h-full'
            )}
          >
            <div
              className={clsx(
                modal.fullScreen
                  ? 'w-full h-full flex-1 mobile:min-w-0 mobile:h-auto'
                  : 'mx-auto py-[48px] mobile:max-w-[100vw] mobile:py-[16px]'
              )}
              {...(modal.size && { style: { width: modal.size } })}
            >
              {typeof modal.children === 'function'
                ? modal.children(closeModalFunction)
                : modal.children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CurrentModalContext.Provider value={{ id: modal.id }}>
      <div
        onClick={closeModalFunction}
        style={{ zIndex }}
        className={clsx(
          'fixed flex left-0 top-0 min-w-full min-h-full bg-popup transition-all animate-fadeIn overflow-y-auto text-newTextColor',
          !modal.fullScreen && 'pb-[50px]'
        )}
      >
        <div className="relative flex-1">
          <div
            style={
              modal.top
                ? { paddingTop: modal.top, paddingBottom: modal.top }
                : {}
            }
            className={clsx(
              'absolute min-w-full mobile:w-full',
              !modal.fullScreen
                ? modal.top
                  ? ''
                  : 'min-h-full pt-[100px] pb-[100px] mobile:pt-[24px] mobile:pb-[24px] mobile:px-[8px]'
                : 'h-screen mobile:h-dvh',
              modal.size && modal.height
                ? 'flex justify-center items-center'
                : 'top-0 left-0'
            )}
          >
            <div
              className={clsx(
                !modal.removeLayout &&
                  'gap-[40px] p-[32px] mobile:gap-[24px] mobile:p-[16px]',
                'bg-newBgColorInner mx-auto flex flex-col w-fit rounded-[24px] mobile:rounded-[16px] relative mobile:!max-w-full',
                modal.destructive && 'border-2 border-red-700',
                modal.size ? '' : 'min-w-[600px] mobile:min-w-0 mobile:w-full',
                modal.fullScreen && 'h-full'
              )}
              {...((!!modal.size || !!modal.height || !!modal.maxSize) && {
                style: {
                  ...(modal.size ? { width: modal.size } : {}),
                  ...(modal.height ? { height: modal.height } : {}),
                  ...(modal.maxSize ? { maxWidth: modal.maxSize } : {}),
                },
              })}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center">
                <div className="text-[24px] mobile:text-[20px] mobile:pe-[28px] font-[600] flex-1">
                  {modal.title}
                </div>
                {typeof modal.withCloseButton === 'undefined' ||
                modal.withCloseButton ? (
                  <div className="cursor-pointer">
                    <button
                      className="outline-none absolute end-[20px] top-[20px] mobile:end-[12px] mobile:top-[12px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
                      type="button"
                      onClick={closeModalFunction}
                    >
                      <svg
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                      >
                        <path
                          d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>
              <div
                className={clsx(
                  'whitespace-pre-line',
                  !!modal.height && !!modal.size && 'flex flex-1 flex-col'
                )}
              >
                {RenderComponent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CurrentModalContext.Provider>
  );
});

export const ModalManagerInner: FC = () => {
  const { closeModal, modalManager } = useModalStore(
    useShallow((state) => ({
      closeModal: state.closeById,
      modalManager: state.modalManager,
    }))
  );

  useEffect(() => {
    // a drawer keeps the page readable behind it, only the scrim dims it
    const blur = modalManager.some((p) => !p.drawer);
    if (modalManager.length > 0) {
      document.querySelector('body')?.classList.add('overflow-hidden');
    } else {
      document.querySelector('body')?.classList.remove('overflow-hidden');
    }
    Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
      blur
        ? p.classList.add('blur-xs', 'pointer-events-none')
        : p.classList.remove('blur-xs', 'pointer-events-none')
    );
  }, [modalManager]);

  if (modalManager.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`body, html { overflow: hidden !important; }`}</style>
      {modalManager.map((modal, index) => (
        <Component
          isLast={modalManager.length - 1 === index}
          key={modal.id}
          modal={modal}
          zIndex={200 + index}
          closeModal={closeModal}
        />
      ))}
    </>
  );
};
export const ModalManager: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div>
      <ModalManagerEmitter />
      <ModalManagerInner />
      <div className="transition-all w-full">{children}</div>
    </div>
  );
};

const emitter = new EventEmitter();
export const showModalEmitter = (params: ModalManagerInterface) => {
  emitter.emit('show', params);
};

export const ModalManagerEmitter: FC = () => {
  const { showModal } = useModalStore(
    useShallow((state) => ({
      showModal: state.openModal,
    }))
  );

  useEffect(() => {
    emitter.on('show', (params: OpenModalInterface) => {
      showModal(params);
    });

    return () => {
      emitter.removeAllListeners('show');
    };
  }, []);
  return null;
};

export const DecisionModal: FC<{
  description: string;
  approveLabel: string;
  cancelLabel: string;
  onlyApprove: boolean;
  destructive?: boolean;
  resolution: (value: boolean) => void;
}> = ({
  description,
  cancelLabel,
  approveLabel,
  resolution,
  onlyApprove,
  destructive,
}) => {
  const { closeCurrent } = useModals();
  return (
    <div className="flex flex-col">
      <div className="max-w-[600px]">{description}</div>
      <div className="flex gap-[12px] mt-[16px]">
        <Button
          className={destructive ? '!bg-red-800' : undefined}
          onClick={() => {
            resolution(true);
            closeCurrent();
          }}
        >
          {approveLabel}
        </Button>
        {!onlyApprove && (
          <Button
            onClick={() => {
              resolution(false);
              closeCurrent();
            }}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export const decisionModalEmitter = new EventEmitter();

export const areYouSure = ({
  title = 'Are you sure?',
  description = 'Are you sure you want to close this modal?' as any,
  approveLabel = 'Yes',
  cancelLabel = 'No',
  destructive = false,
} = {}): Promise<boolean> => {
  return new Promise<boolean>((newRes) => {
    decisionModalEmitter.emit('open', {
      title,
      description,
      approveLabel,
      cancelLabel,
      destructive,
      newRes,
    });
  });
};

export const DecisionEverywhere: FC = () => {
  const decision = useDecisionModal();
  useEffect(() => {
    decisionModalEmitter.on('open', decision.open);
  }, []);
  return null;
};

export const useDecisionModal = () => {
  const modals = useModals();
  const open = useCallback(
    ({
      title = 'Are you sure?',
      description = 'Are you sure you want to close this modal?' as any,
      onlyApprove = false,
      approveLabel = 'Yes',
      cancelLabel = 'No',
      destructive = false,
      newRes = undefined as any,
    } = {}) => {
      return new Promise<boolean>((res) => {
        modals.openModal({
          title,
          askClose: false,
          destructive,
          onClose: () => res(false),
          children: (
            <DecisionModal
              onlyApprove={onlyApprove}
              destructive={destructive}
              resolution={(value) => (newRes ? newRes(value) : res(value))}
              description={description}
              approveLabel={approveLabel}
              cancelLabel={cancelLabel}
            />
          ),
        });
      });
    },
    [modals]
  );

  return { open };
};
