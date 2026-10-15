import { FC, useCallback } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { SignaturesSettings } from '@gitroom/frontend/components/tadween/settings/signatures.settings';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
// The editor (post or comment) the cursor was last in: the signature goes to
// the toolbar's own editor, at the cursor when that is where the user was
// writing, at the end otherwise (a never-focused editor's cursor is its start).
let focusedEditor: any = null;
export const rememberFocusedEditor = (editor: any) => {
  focusedEditor = editor;
};

// Signatures are saved as HTML paragraphs; an older plain-text one becomes
// paragraphs too, so it always starts on its own line
const asParagraphs = (value: string) =>
  /^\s*</.test(value)
    ? value
    : value
        .split('\n')
        .map(
          (line) =>
            `<p>${line
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</p>`
        )
        .join('');

export const SignatureBox: FC<{
  editor: any;
}> = ({ editor }) => {
  const modals = useModals();
  const t = useT();
  const appendValue = (val: string) => {
    editor
      ?.chain()
      .focus(focusedEditor === editor ? undefined : 'end')
      .insertContent(asParagraphs(val))
      .run();
  };

  const addSignature = useCallback(() => {
    modals.openModal({
      title: t('tdw_insert_signature', 'Insert a signature'),
      withCloseButton: true,
      children: (close) => (
        <SignatureModal appendSignature={appendValue} close={close} />
      ),
    });
  }, [appendValue, t]);

  return (
    <>
      <div
        onClick={addSignature}
        data-tooltip-id="tooltip"
        data-tooltip-content={t('tdw_insert_signature', 'Insert a signature')}
        className="select-none cursor-pointer rounded-[6px] mobile:rounded-[8px] w-[30px] h-[30px] mobile:w-[40px] mobile:h-[40px] bg-newColColor mobile:bg-newSettings flex justify-center items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          className="mobile:w-[20px] mobile:h-[20px]"
          viewBox="0 0 16 16"
          fill="none"
        >
          <g clipPath="url(#clip0_2352_53073)">
            <path
              d="M1.61528 13.4634C4.98807 11.1708 6.12853 2.72516 2.42576 2.54001C-0.271332 2.40515 1.52719 6.99029 4.04454 11.4405C4.43518 12.1311 5.08312 12.0221 5.35096 11.8873C6.23825 11.4405 6.49355 9.29898 6.95238 8.8935C7.41122 8.48802 7.98909 8.45521 8.49293 9.16322C9.12361 10.0494 9.65463 9.91856 10.0456 9.70264C10.6103 9.39078 11.3197 8.22463 12.1949 9.16322C12.7765 9.78692 12.5068 10.4612 14.9173 10.1915"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M7.16602 12.917H13.8327"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_2352_53073">
              <rect width="16" height="16" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
    </>
  );
};
export const SignatureModal: FC<{
  close: () => void;
  appendSignature: (sign: string) => void;
}> = (props) => {
  const { appendSignature, close } = props;
  // using a signature is the end of this dialog, back to the post. Tadween:
  // the list of Settings → Signatures, where a row is used, edited or deleted
  return (
    <SignaturesSettings
      onUse={(sign) => {
        appendSignature(sign);
        close();
      }}
    />
  );
};
