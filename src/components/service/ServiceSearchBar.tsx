"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useServiceSearchQuery } from "@/hooks/use-service-search";
import {
  handleServiceSearch,
  handleServiceSelect,
} from "@/lib/service-search-utils";
import type { ServiceSearchBarProps } from "@/types/types";
import { Button } from "../ui/button";

export function ServiceSearchBar({
  items,
  optimisticValue,
  setOptimistic,
  date,
  userId,
}: ServiceSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(optimisticValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { data: defaultData } = useServiceSearchQuery(date, userId ?? "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.client.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      item.address.street.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <div className="relative w-full max-w-md z-40" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={isFocused ? inputValue : optimisticValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleServiceSearch({
                query: inputValue,
                defaultData,
                setOptimistic,
                setInputValue,
                setIsFocused,
                searchParams,
                router,
              });
            }
          }}
          placeholder="Search this route..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {(isFocused ? inputValue : optimisticValue) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-8 w-8"
            onClick={() => {
              setInputValue("");
              setIsFocused(true);
              handleServiceSearch({
                query: "",
                defaultData,
                setOptimistic,
                setInputValue,
                setIsFocused,
                searchParams,
                router,
              });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isFocused && inputValue.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-[300px] overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="p-1">
              {filteredItems.map((item) => (
                <button
                  type="button"
                  key={item.address.id}
                  onClick={() =>
                    handleServiceSelect({
                      item,
                      items,
                      setOptimistic,
                      setInputValue,
                      setIsFocused,
                      searchParams,
                      router,
                    })
                  }
                  className="w-full text-left flex flex-col p-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  <span className="font-medium text-sm">
                    {item.client.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.address.street}, {item.address.city}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No clients found on this route.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
