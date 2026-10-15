import i18next from '@gitroom/react/translation/i18next';
import { areYouSure } from '@gitroom/frontend/components/layout/new-modal';

export const deleteDialog = async (
  message: string,
  confirmButton?: string,
  title?: string,
  cancelButton?: string,
  destructive?: boolean
) => {
  return areYouSure({
    title: title || i18next.t('are_you_sure', 'Are you sure?'),
    description: message,
    // Tadween: plain verbs, not "Yes, delete it!" / "No, cancel!"
    approveLabel: confirmButton || i18next.t('delete', 'Delete'),
    cancelLabel: cancelButton || i18next.t('cancel', 'Cancel'),
    // a delete / remove confirm (the default one too) gets the destructive
    // button, in English and Arabic
    destructive:
      destructive ??
      (!confirmButton || /delete|remove|حذف|إزالة/i.test(confirmButton)),
  });
};
