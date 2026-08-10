import Feather from "@expo/vector-icons/Feather";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { Consumer } from "@/types/consumer";
import type { AppColors } from "@/types/theme";
import { consumerStyles as styles } from "./consumerStyles";

type DeleteConsumerModalProps = {
  consumer: Consumer | null;
  colors: AppColors;
  onCancel: () => void;
  onConfirm: (consumerId: number) => void;
};

export const DeleteConsumerModal = ({
  consumer,
  colors,
  onCancel,
  onConfirm,
}: DeleteConsumerModalProps) => (
  <Modal
    visible={consumer !== null}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalBox,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.modalIconWrap}>
          <Feather name="trash-2" size={22} color="#DC2626" />
        </View>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>
          Delete Consumer?
        </Text>
        <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
          All meals, expenses, and deposits for{" "}
          <Text
            style={[styles.modalConsumerName, { color: colors.foreground }]}
          >
            {consumer?.name}
          </Text>{" "}
          will be permanently deleted.
        </Text>
        <View style={styles.modalBtns}>
          <TouchableOpacity
            style={[
              styles.modalBtnCancel,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.modalBtnCancelText, { color: colors.foreground }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalBtnDelete}
            onPress={() => {
              if (consumer) onConfirm(consumer.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.modalBtnDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
