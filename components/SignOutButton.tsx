import { signOut } from "@/lib/actions";
import { LogOutIcon } from "@/components/icons";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:bg-black/5">
        <LogOutIcon className="h-3.5 w-3.5" />
        Đăng xuất
      </button>
    </form>
  );
}
