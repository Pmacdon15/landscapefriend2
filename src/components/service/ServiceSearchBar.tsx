"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, use, useEffect, useOptimistic, useRef, useState } from "react";
import type { CutListItem } from "@/types/types";
import { Button } from "../ui/button";

interface ServiceSearchBarProps {
  items: CutListItem[];
  setOptimisticCuts: (action: CutListItem[]) => void;
  searchPromise: Promise<string>;
  clientIdPromise: Promise<string>;
}

export function ServiceSearchBar({
  items,
  setOptimisticCuts,
  searchPromise,
  clientIdPromise,
}: ServiceSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = use(searchPromise);
  const clientId = use(clientIdPromise);

  const getInitialValue = () => {
    if (clientId) {
      const selectedItem = items.find((i) => i.client.id === clientId);
      if (selectedItem) return selectedItem.client.name;
    }
    return initialSearch;
  };

  const [optimisticValue, setOptimisticValue] = useOptimistic(
    getInitialValue(),
    (_, newValue: string) => newValue,
  );

  const [inputValue, setInputValue] = useState(optimisticValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(getInitialValue());
    }
  }, [initialSearch, clientId, items, isFocused]);

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

  const handleSelect = (item: CutListItem) => {
    startTransition(() => {
      setOptimisticValue(item.client.name);
      setInputValue(item.client.name);
      
      // Optimistically filter to only this client's addresses
      const filteredCuts = items.filter((c) => c.client.id === item.client.id);
      setOptimisticCuts(filteredCuts);

      const params = new URLSearchParams(searchParams);
      params.delete("search");
      params.set("clientId", item.client.id);
      router.push(`/clients-service?${params.toString()}`);
    });
    setIsFocused(false);
  };

  const handleSearch = (query: string) => {
    startTransition(() => {
      setOptimisticValue(query);
      setInputValue(query);
      
      const params = new URLSearchParams(searchParams);
      params.delete("clientId");
      if (query) {
        params.set("search", query);
      } else {
        params.delete("search");
      }
      router.push(`/clients-service?${params.toString()}`);
    });
    setIsFocused(false);
  };

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
              if (filteredItems.length > 0) {
                handleSelect(filteredItems[0]);
              } else {
                handleSearch(inputValue);
              }
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
              handleSearch("");
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
