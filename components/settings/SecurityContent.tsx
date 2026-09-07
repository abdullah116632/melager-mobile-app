import { useState } from "react";
import { AddCoAdminForm } from "./AddCoAdminForm";
import { DeleteMessForm } from "./DeleteMessForm";
import { LeaveAdminRoleForm } from "./LeaveAdminRoleForm";
import { SecurityActionList } from "./SecurityActionList";
import { SecurityBottomSheet } from "./SecurityBottomSheet";
import { SecurityHeader } from "./SecurityHeader";
import { TransferAdminForm } from "./TransferAdminForm";
import type { SecurityModalType } from "@/types/security";

export const SecurityContent = ({
  returnTo,
}: {
  returnTo?: "dashboard" | "manager";
}) => {
  const [activeModal, setActiveModal] = useState<SecurityModalType>(null);
  const closeModal = () => setActiveModal(null);

  const sheetContent =
    activeModal === "transferAdmin" ? (
      <TransferAdminForm onClose={closeModal} />
    ) : activeModal === "addCoAdmin" ? (
      <AddCoAdminForm onClose={closeModal} />
    ) : activeModal === "leaveAdmin" ? (
      <LeaveAdminRoleForm onClose={closeModal} />
    ) : null;

  return (
    <>
      <SecurityHeader returnTo={returnTo} />
      <SecurityActionList onOpen={setActiveModal} />
      <SecurityBottomSheet
        visible={sheetContent !== null}
        canClose
        onClose={closeModal}
      >
        {sheetContent}
      </SecurityBottomSheet>
      <DeleteMessForm
        visible={activeModal === "deleteMess"}
        onClose={closeModal}
      />
    </>
  );
};
