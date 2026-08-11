import { useState } from "react";
import { View } from "react-native";

import { AddCoAdminForm } from "@/components/settings/AddCoAdminForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { LeaveAdminRoleForm } from "@/components/settings/LeaveAdminRoleForm";
import { SecurityActionList } from "@/components/settings/SecurityActionList";
import { SecurityBottomSheet } from "@/components/settings/SecurityBottomSheet";
import { SecurityHeader } from "@/components/settings/SecurityHeader";
import { TransferAdminForm } from "@/components/settings/TransferAdminForm";
import { UpdateEmailForm } from "@/components/settings/UpdateEmailForm";
import { useAuth } from "@/context/AuthContext";
import { useKeyboardSheetOffset } from "@/hooks/useKeyboardSheetOffset";
import type { SecurityModalType } from "@/types/security";

interface SecurityScreenProps {
  onBack: () => void;
}

export const SecurityScreen = ({ onBack }: SecurityScreenProps) => {
  const { role } = useAuth();
  const [activeModal, setActiveModal] = useState<SecurityModalType>(null);
  const androidKeyboardOffset = useKeyboardSheetOffset();
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
    <View className="flex-1 bg-slate-50">
      <SecurityHeader isAdmin={role === "admin"} onBack={onBack} />
      <SecurityActionList onOpen={setActiveModal} />
      <SecurityBottomSheet
        visible={activeModal !== null}
        canClose
        androidKeyboardOffset={androidKeyboardOffset}
        onClose={closeModal}
      >
        {modalContent}
      </SecurityBottomSheet>
    </View>
  );
};
