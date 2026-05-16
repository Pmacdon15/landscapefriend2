"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { startTransition, useEffect, useRef, useState } from "react";
import type { CutListItem } from "@/types/types";
import { Button } from "../ui/button";

interface ServiceSearchBarProps {
  items: CutListItem[];
  setOptimisticCuts: (action: CutListItem[]) => void;
  initialValue?: string;
}

export function ServiceSearchBar({
  items,
  setOptimisticCuts,
  initialValue = "",
}: ServiceSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectResult = (item: CutListItem) => {
    startTransition(() => {
      const filteredCuts = items.filter((c) => c.client.id === item.client.id);
      setOptimisticCuts(filteredCuts);

      const params = new URLSearchParams(searchParams);
      params.delete("search"); 
      params.set("clientId", item.client.id);
      router.push(`/clients-service?${params.toString()}`);
    });
  };

  const handleGlobalSearch = (query: string) => {
    startTransition(() => {
      const normalizedQuery = query.toLowerCase().trim();
      const filteredCuts = items.filter(
        (item) =>
          item.client.name.toLowerCase().includes(normalizedQuery) ||
          item.address.street.toLowerCase().includes(normalizedQuery)
      );
      setOptimisticCuts(filteredCuts);

      const params = new URLSearchParams(searchParams);
      params.delete("clientId");
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      router.push(`/clients-service?${params.toString()}`);
    });
  };

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

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  const filteredItems = items.filter(
    (item) =>
      item.client.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      item.address.street.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const handleSelect = (item: CutListItem) => {
    handleSelectResult(item);
    setInputValue(item.client.name);
    setIsFocused(false);
  };

  const handleSubmitSearch = (query: string) => {
    if (filteredItems.length > 0 && query.trim().length > 0) {
      const bestMatch = filteredItems[0];
      handleSelect(bestMatch);
    } else {
      handleGlobalSearch(query);
      setIsFocused(false);
    }
  };

  return (
    <div className="relative w-full max-w-md z-50" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmitSearch(inputValue);
            }
          }}
          placeholder="Search this route..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-8 w-8"
            onClick={() => {
              setInputValue("");
              handleGlobalSearch("");
              setIsFocused(false);
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
                  onClick={() => handleSelect(item)}
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