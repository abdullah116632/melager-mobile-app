import { Platform, ScrollView, StatusBar, View } from "react-native";

import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { ProfileDetailsSections } from "@/components/profile/ProfileDetailsSections";
import { ProfileHeader } from "@/components/profile/ProfileHeader";

export const ProfileScreen = ({ hubMode = false }: { hubMode?: boolean }) => (
  <View
    className={`flex-1 bg-teal-700 ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
  >
    <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
    <View className="flex-1 bg-slate-50">
      <ProfileHeader />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`gap-5 pt-5 ${Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"}`}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileDetailsSections />
        <ProfileAboutSection />
        <ProfileActions showSwitchMess={!hubMode} />
      </ScrollView>
    </View>
  </View>
);
