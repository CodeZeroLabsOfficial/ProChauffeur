"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { signOut } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";
import { useSessionUser } from "@/components/providers/session-provider";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
        <button className="flex items-center gap-2 rounded-full outline-none">
          <Avatar className="size-8">
            <AvatarFallback>{generateAvatarFallback(name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name}</span>
            {user.email && <span className="text-muted-foreground text-xs">{user.email}</span>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
