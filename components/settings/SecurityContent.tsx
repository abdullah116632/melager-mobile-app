import { useState } from "react";
import { AddCoAdminForm } from "./AddCoAdminForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { LeaveAdminRoleForm } from "./LeaveAdminRoleForm";
import { SecurityActionList } from "./SecurityActionList";
import { SecurityBottomSheet } from "./SecurityBottomSheet";
import { SecurityHeader } from "./SecurityHeader";
import { TransferAdminForm } from "./TransferAdminForm";
import { UpdateEmailForm } from "./UpdateEmailForm";
import type { SecurityModalType } from "@/types/security";

export const SecurityContent = () => {
  const [activeModal, setActiveModal] = useState<SecurityModalType>(null);
  const closeModal = () => setActiveModal(null);

  const modalContent =
    activeModal === "changePassword" ? (
      <ChangePasswordForm onClose={closeModal} />
    ) : activeModal === "updateEmail" ? (
      <UpdateEmailForm onClose={closeModal} />
    ) : activeModal === "transferAdmin" ? (
      <TransferAdminForm onClose={closeModal} />
    ) : activeModal === "addCoAdmin" ? (
      <AddCoAdminForm onClose={closeModal} />
    ) : activeModal === "leaveAdmin" ? (
      <LeaveAdminRoleForm onClose={closeModal} />
    ) : null;

  return (
    <>
      <SecurityHeader />
      <SecurityActionList onOpen={setActiveModal} />
      <SecurityBottomSheet
        visible={activeModal !== null}
        canClose
        onClose={closeModal}
      >
        {modalContent}
      </SecurityBottomSheet>
    </>
  );
};
