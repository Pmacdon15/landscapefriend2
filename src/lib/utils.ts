import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGoogleMapsUrl(address: {
  street: string;
  city: string;
  state?: string | null;
  zip?: string | null;
}) {
  const query = encodeURIComponent(
    `${address.street}, ${address.city}, ${address.state || ""} ${
      address.zip || ""
    }`.trim(),
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
