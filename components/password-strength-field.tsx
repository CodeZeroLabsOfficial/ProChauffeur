"use client";

import { useId, useMemo, useState } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  passwordRequirementResults,
  passwordStrengthBarClass,
  passwordStrengthLabel,
  passwordStrengthScore
} from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

export function PasswordStrengthField({
  password,
  onPasswordChange,
  confirm,
  onConfirmChange,
  disabled,
  passwordLabel = "Password",
  confirmLabel = "Confirm password",
  passwordPlaceholder = "Create a password",
  confirmPlaceholder = "Confirm password"
}: {
  password: string;
  onPasswordChange: (value: string) => void;
  confirm: string;
  onConfirmChange: (value: string) => void;
  disabled?: boolean;
  passwordLabel?: string;
  confirmLabel?: string;
  passwordPlaceholder?: string;
  confirmPlaceholder?: string;
}) {
  const passwordId = useId();
  const confirmId = useId();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const strength = useMemo(() => passwordRequirementResults(password), [password]);
  const score = passwordStrengthScore(password);
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={passwordId}>{passwordLabel}</Label>
        <InputGroup>
          <InputGroupInput
            id={passwordId}
            type={passwordVisible ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            disabled={disabled}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={passwordPlaceholder}
          />
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => setPasswordVisible((v) => !v)}
              className="text-muted-foreground hover:bg-transparent">
              {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              <span className="sr-only">
                {passwordVisible ? "Hide password" : "Show password"}
              </span>
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="flex h-1 w-full gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-500 ease-out",
              index < score ? passwordStrengthBarClass(score) : "bg-border"
            )}
          />
        ))}
      </div>

      <p className="text-foreground text-sm font-medium">
        {passwordStrengthLabel(score)}. Must contain:
      </p>
      <ul className="space-y-1.5">
        {strength.map((req) => (
          <li key={req.id} className="flex items-center gap-2">
            {req.met ? (
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
            ) : (
              <XIcon className="text-muted-foreground size-4" />
            )}
            <span
              className={cn(
                "text-xs",
                req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}>
              {req.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <Label htmlFor={confirmId}>{confirmLabel}</Label>
        <InputGroup>
          <InputGroupInput
            id={confirmId}
            type={confirmVisible ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            disabled={disabled}
            aria-invalid={confirmMismatch || undefined}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder={confirmPlaceholder}
          />
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => setConfirmVisible((v) => !v)}
              className="text-muted-foreground hover:bg-transparent">
              {confirmVisible ? <EyeOffIcon /> : <EyeIcon />}
              <span className="sr-only">
                {confirmVisible ? "Hide password" : "Show password"}
              </span>
            </Button>
          </InputGroupAddon>
        </InputGroup>
        {confirmMismatch ? (
          <p className="text-destructive text-xs" role="alert">
            Passwords do not match.
          </p>
        ) : null}
      </div>
    </div>
  );
}
