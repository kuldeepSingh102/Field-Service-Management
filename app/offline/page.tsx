import Link from "next/link";
import { Bolt, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-forest text-[#a6e9c7]">
          <Bolt size={25} fill="currentColor" />
        </span>
        <WifiOff size={18} className="mx-auto mt-6 text-[#a96e14]" />
        <h1 className="mt-3 font-display text-xl font-bold">You’re offline</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Reconnect to load your workspace. Field assignments and any changes
          already saved on this device are still available in the field
          workspace.
        </p>
        <Link
          href="/field"
          className="mt-5 inline-flex rounded-md bg-forest px-4 py-2.5 text-xs font-semibold text-white"
        >
          Open field workspace
        </Link>
      </div>
    </main>
  );
}
