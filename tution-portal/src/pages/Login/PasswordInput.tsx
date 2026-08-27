import React, { useState } from "react";
import eyeIcon from "@/assets/eye.svg";
import eyeClosedIcon from "@/assets/eye-closed.svg";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  showLabel?: string;
  hideLabel?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  showLabel = "Show password",
  hideLabel = "Hide password",
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        className="email-input"
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        tabIndex={-1}
        aria-label={visible ? hideLabel : showLabel}
        title={visible ? hideLabel : showLabel}
      >
        <img
          src={visible ? eyeClosedIcon : eyeIcon}
          alt=""
          className="password-toggle-icon"
        />
      </button>
    </div>
  );
};

export default PasswordInput;
