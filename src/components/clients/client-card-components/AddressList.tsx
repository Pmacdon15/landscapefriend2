import type { Address, OptimisticAction } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";
import { AddressItem } from "./AddressItem";

interface AddressListProps {
  addresses: Address[];
  members: { id: string; name: string }[];
  setOptimistic: (action: OptimisticAction) => void;
  onViewPhoto: (siteMap: SiteMap) => void;
}

export function AddressList({
  addresses,
  members,
  setOptimistic,
  onViewPhoto,
}: AddressListProps) {
  if (addresses.length === 0) return null;

  return (
    <div className="mt-2 space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        Addresses & Schedules
      </h4>
      {addresses.map((address) => (
        <AddressItem
          key={address.id}
          address={address}
          members={members}
          setOptimistic={setOptimistic}
          onViewPhoto={onViewPhoto}
        />
      ))}
    </div>
  );
}
