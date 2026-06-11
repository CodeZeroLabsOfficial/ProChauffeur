"use client";

import { useEffect, useState } from "react";

import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { hasPasswordProvider } from "@/lib/firebase/account-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeEmailSheet } from "@/app/dashboard/settings/account/change-email-sheet";
import { ChangePasswordSheet } from "@/app/dashboard/settings/account/change-password-sheet";

function displayEmail(email: string | null | undefined): string {
  const trimmed = email?.trim();
  return trimmed || "Not set";
}

function LoginDetailRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onChange}>
        Change
      </Button>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { user: authUser } = useFirebaseAuth();
  const [email, setEmail] = useState(authUser.email ?? "");
  const [emailSheetOpen, setEmailSheetOpen] = useState(false);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);

  useEffect(() => {
    setEmail(authUser.email ?? "");
  }, [authUser.email]);

  const passwordLoginAvailable = hasPasswordProvider(authUser);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Login details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginDetailRow
            label="Email"
            value={displayEmail(email)}
            onChange={() => setEmailSheetOpen(true)}
          />
          <LoginDetailRow
            label="Password"
            value={passwordLoginAvailable ? "••••••••" : "Not set up"}
            onChange={() => setPasswordSheetOpen(true)}
          />
        </CardContent>
      </Card>

      <ChangeEmailSheet
        email={email}
        open={emailSheetOpen}
        onOpenChange={setEmailSheetOpen}
        onEmailChanged={setEmail}
      />
      <ChangePasswordSheet
        email={email}
        open={passwordSheetOpen}
        onOpenChange={setPasswordSheetOpen}
        passwordLoginAvailable={passwordLoginAvailable}
      />
    </>
  );
}
