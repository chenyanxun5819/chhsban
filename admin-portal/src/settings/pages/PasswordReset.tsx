import React from "react";
import { PasswordResetList } from "@/settings/components/PasswordResetList";
import { SettingsPage } from "@/settings/components/SettingsPage";

/** 申請人密碼重設（原 tution-portal /admin/password-reset） */
const PasswordReset: React.FC = () => (
  <SettingsPage title="申請人密碼重設">
    <PasswordResetList />
  </SettingsPage>
);

export default PasswordReset;
