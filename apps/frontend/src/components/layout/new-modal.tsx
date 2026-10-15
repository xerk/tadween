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
  useState,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import clsx from 'clsx';
import { EventEmitter } from 'events';
import { useOverlayOpen } from '@gitroom/frontend/components/tadween/ui/overlays';
import {
  Button as TdwButton,
  Icon,
  TadweenScope,
} from '@gitroom/frontend/components/tadween/ui/primitives';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import i18next from '@gitroom/react/translation/i18next';

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

// Tadween: whether any modal (dialog, drawer, the composer) is open; the
// phone dock (tadween/shell/dock.tsx) steps aside for it
export const useHasOpenModal = () =>
  useModalStore((state) => state.modalManager.length > 0);

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

// Keyboard for a modal layer (a drawer or a dialog): focus moves in on open
// and back on close, Tab cycles inside the panel, and Escape in a text field
// first leaves the field so the next Escape closes. `nested` marks a layer of
// its own inside the panel (a sheet on phones) that keeps Tab in itself.
const useLayerFocus = (
  panelRef: React.RefObject<HTMLDivElement | null>,
  isLast: boolean,
  nested = '[role="dialog"]'
) => {
  // the trigger, read while rendering: a control inside that has autoFocus
  // takes the focus before this layer's effects run
  const [previous] = useState(() =>
    typeof document === 'undefined'
      ? null
      : (document.activeElement as HTMLElement | null)
  );
  useEffect(() => {
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

  return useCallback(
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
        target.closest(nested) !== panel
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
    [isLast, nested]
  );
};

// A side sheet: role="dialog" + aria-modal, keyboard through useLayerFocus,
// and the scrim closes it (through askClose). Styles: app/tadween/drawer.scss.
const ModalDrawer: FC<{
  zIndex: string;
  isLast: boolean;
  onClose?: () => void;
  children: ReactNode;
}> = ({ zIndex, isLast, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onKeyDown = useLayerFocus(panelRef, isLast);

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

// The dialog itself: titled by its header (role="dialog" + aria-modal), with
// the keyboard of every modal layer (useLayerFocus). Styles:
// app/tadween/consistency.scss (Modal shell).
const ModalPanel: FC<{
  modal: { id: string } & OpenModalInterface;
  isLast: boolean;
  onClose: () => void;
  children: ReactNode;
}> = ({ modal, isLast, onClose, children }) => {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // a body inside the panel that is a layer of its own keeps Tab in itself
  const onKeyDown = useLayerFocus(panelRef, isLast, '[aria-modal="true"]');
  const titled = !!modal.title && typeof modal.title !== 'boolean';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titled ? titleId : undefined}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={clsx(
        !modal.removeLayout &&
          'gap-[20px] p-[24px] mobile:gap-[16px] mobile:p-[20px]',
        'tdw-modal bg-newBgColorInner mx-auto flex flex-col w-fit rounded-[20px] relative mobile:!max-w-full',
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
      <div className="tdw-modal-head flex items-center">
        <div
          id={titleId}
          className="tdw-modal-title text-[20px] mobile:text-[18px] pe-[36px] font-[600] flex-1"
        >
          {modal.title}
        </div>
        {typeof modal.withCloseButton === 'undefined' ||
        modal.withCloseButton ? (
          <button
            className="tdw-modal-close outline-none absolute end-[16px] top-[16px] cursor-pointer"
            type="button"
            aria-label={t('close', 'Close')}
            onClick={onClose}
          >
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </div>
      <div
        className={clsx(
          'whitespace-pre-line',
          !!modal.height && !!modal.size && 'flex flex-1 flex-col'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const Component: FC<{
  closeModal: (id: string) => void;
  zIndex: string;
  isLast: boolean;
  modal: { id: string } & OpenModalInterface;
}> = memo(({ isLast, modal, closeModal, zIndex }) => {
  const decision = useDecisionModal();
  const closeModalFunction = useCallback(async () => {
    if (
      typeof modal.askClose === 'function' ? modal.askClose() : modal.askClose
    ) {
      // closing loses what was typed: the confirm says so and is red
      const open = await decision.open({
        title: i18next.t('tdw_close_unsaved_title', 'Close without saving?'),
        description: i18next.t(
          'tdw_close_unsaved_body',
          "Your changes haven't been saved and will be lost."
        ),
        approveLabel: i18next.t('tdw_discard', 'Discard'),
        cancelLabel: i18next.t('tdw_keep_editing', 'Keep editing'),
        destructive: true,
      });
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
          'tdw-modal-scrim fixed flex left-0 top-0 min-w-full min-h-full bg-popup transition-all animate-fadeIn overflow-y-auto text-newTextColor',
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
              'tdw-modal-frame absolute min-w-full mobile:w-full',
              // phones: a plain dialog rises as a bottom sheet (CSS only)
              !modal.fullScreen && !modal.top && !modal.height && 'is-sheet',
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
            <ModalPanel
              modal={modal}
              isLast={isLast}
              onClose={closeModalFunction}
            >
              {RenderComponent}
            </ModalPanel>
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
  useOverlayOpen(modalManager.length > 0);

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
          zIndex={`calc(var(--tdw-z-modal) + ${index})`}
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

// Tadween: no exclamation marks in the product's voice; labels Postiz call
// sites pass ("Yes, delete it!") read as plain actions
const plainLabel = (label: string) =>
  typeof label === 'string' ? label.replace(/\s*[!\uFF01]+$/u, '') : label;

// The confirm: the question, then Cancel (ghost) and the action, which is red
// for a destructive one. The safe choice has the focus first.
export const DecisionModal: FC<{
  description: ReactNode;
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
    <TadweenScope className="tdw-confirm">
      {description ? <p className="tdw-confirm-desc">{description}</p> : null}
      <div className="tdw-confirm-actions">
        {!onlyApprove && (
          <TdwButton
            variant="ghost"
            autoFocus={destructive}
            onClick={() => {
              resolution(false);
              closeCurrent();
            }}
          >
            {plainLabel(cancelLabel)}
          </TdwButton>
        )}
        <TdwButton
          variant={destructive ? 'destructive' : 'primary'}
          autoFocus={!destructive || onlyApprove}
          onClick={() => {
            resolution(true);
            closeCurrent();
          }}
        >
          {plainLabel(approveLabel)}
        </TdwButton>
      </div>
    </TadweenScope>
  );
};

export const decisionModalEmitter = new EventEmitter();

interface ConfirmOptions {
  title?: ReactNode;
  description?: ReactNode;
  approveLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export const areYouSure = ({
  title,
  description,
  approveLabel,
  cancelLabel,
  destructive = false,
}: ConfirmOptions = {}): Promise<boolean> => {
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

// Close every open modal the way its own close button would: when one asks
// before closing (the composer with unsaved changes), ask once. Resolves false
// when the user keeps it open (nothing is closed then).
export const useCloseAllModals = () => {
  const decision = useDecisionModal();
  const { closeAll } = useModals();
  return useCallback(
    async (question?: Parameters<typeof decision.open>[0]) => {
      const asks = useModalStore
        .getState()
        .modalManager.some((modal) =>
          typeof modal.askClose === 'function'
            ? modal.askClose()
            : modal.askClose
        );
      if (asks && !(await decision.open(question))) {
        return false;
      }
      closeAll();
      return true;
    },
    [decision, closeAll]
  );
};

export const useDecisionModal = () => {
  const modals = useModals();
  const open = useCallback(
    ({
      // the defaults, in the reader's language
      title = i18next.t('are_you_sure', 'Are you sure?'),
      description = i18next.t(
        'tdw_confirm_close_body',
        'Close without saving? Your changes will be lost.'
      ),
      onlyApprove = false,
      approveLabel = i18next.t('yes', 'Yes'),
      cancelLabel = i18next.t('no', 'No'),
      destructive = false,
      newRes = undefined as ((value: boolean) => void) | undefined,
    }: ConfirmOptions & {
      onlyApprove?: boolean;
      newRes?: (value: boolean) => void;
    } = {}) => {
      return new Promise<boolean>((res) => {
        modals.openModal({
          title,
          askClose: false,
          destructive,
          // a confirm is a small dialog, not a 600px panel
          size: 460,
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
