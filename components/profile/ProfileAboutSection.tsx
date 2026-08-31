import { ProfileRow } from "./ProfileRows";
import { ProfileSectionCard } from "./ProfileSectionCard";

export const ProfileAboutSection = () => (
  <ProfileSectionCard title="About">
    <ProfileRow icon="info" label="App" value="Melager" showDivider />
    <ProfileRow icon="code" label="Version" value="1.0.1" />
  </ProfileSectionCard>
);
