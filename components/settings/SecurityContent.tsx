import { useState } from "react";
import { AddCoAdminForm } from "./AddCoAdminForm";
import { DeleteMessForm } from "./DeleteMessForm";
import { LeaveAdminRoleForm } from "./LeaveAdminRoleForm";
import { SecurityActionList } from "./SecurityActionList";
import { SecurityHeader } from "./SecurityHeader";
import { TransferAdminForm } from "./TransferAdminForm";
import { ViewAdminsForm } from "./ViewAdminsForm";
import type { SecurityModalType } from "@/types/security";

export const SecurityContent = ({
  returnTo,
}: {
  returnTo?: "dashboard" | "manager";
}) => {
  const [activeModal, setActiveModal] = useState<SecurityModalType>(null);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <SecurityHeader returnTo={returnTo} />
      <SecurityActionList onOpen={setActiveModal} />
      <TransferAdminForm
        visible={activeModal === "transferAdmin"}
        onClose={closeModal}
      />
      <AddCoAdminForm
        visible={activeModal === "addCoAdmin"}
        onClose={closeModal}
      />
      <LeaveAdminRoleForm
        visible={activeModal === "leaveAdmin"}
        onClose={closeModal}
      />
      <DeleteMessForm
        visible={activeModal === "deleteMess"}
        onClose={closeModal}
      />
      <ViewAdminsForm
        visible={activeModal === "viewAdmins"}
        onClose={closeModal}
      />
    </>
  );
};
