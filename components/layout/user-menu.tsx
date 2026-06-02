"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";
import { signOut } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";
import { useSessionUser } from "@/components/providers/session-provider";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const user = useSessionUser();
  const router = useRouter();
  const name = user.displayName || user.email || "Admin";
  const email = user.email ?? "";
  const initials = generateAvatarFallback(name);
  const photoURL = user.photoURL ?? undefined;

  async function handleSignOut() {
    try {
      await signOut(firebaseAuth());
    } catch {
      // ignore — clearing the cookie is what matters for portal access
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none">
          <Avatar className="size-8">
            <AvatarImage src={photoURL} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8">
              <AvatarImage src={photoURL} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              {email ? (
                <span className="text-muted-foreground truncate text-xs">{email}</span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/profile">
            <UserIcon />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings/account">
            <ShieldIcon />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
