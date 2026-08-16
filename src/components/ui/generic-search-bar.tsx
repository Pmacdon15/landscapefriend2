"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

export interface GenericSearchBarProps<T> {
  /** The full, unfiltered list of items */
  items: T[];
  /** How to filter the items based on the search query */
  filterPredicate: (item: T, query: string) => boolean;
  /** How to render each item in the dropdown */
  renderItem: (item: T) => React.ReactNode;
  /** Extract a unique key for each item */
  getItemKey: (item: T) => string;
  
  /** Called when the user presses Enter or clears the search */
  onSearch: (
    query: string, 
    filteredItems: T[],
    setInputValue: (val: string) => void,
    setIsFocused: (val: boolean) => void
  ) => void;
  
  /** Called when the user clicks an item in the dropdown */
  onSelect: (
    item: T,
    setInputValue: (val: string) => void,
    setIsFocused: (val: boolean) => void
  ) => void;
  
  /** Called whenever the input value changes */
  onInputChange?: (value: string) => void;
  
  /** Advanced usage: Completely override the dropdown rendering. */
  renderDropdown?: (props: {
    filteredItems: T[];
    inputValue: string;
    setInputValue: (val: string) => void;
    setIsFocused: (val: boolean) => void;
  }) => React.ReactNode;
  
  optimisticValue?: string;
  placeholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function GenericSearchBar<T>({
  items,
  filterPredicate,
  renderItem,
  getItemKey,
  onSearch,
  onSelect,
  onInputChange,
  renderDropdown,
  optimisticValue = "",
  placeholder = "Search...",
  emptyMessage = "No results found.",
  isLoading = false,
}: GenericSearchBarProps<T>) {
  const [inputValue, setInputValue] = useState(optimisticValue);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const filteredItems = items.filter((item) => filterPredicate(item, inputValue));

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
            onInputChange?.(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch(inputValue, filteredItems, setInputValue, setIsFocused);
            }
          }}
          placeholder={placeholder}
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
              onSearch("", items, setInputValue, setIsFocused);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isFocused && inputValue.trim().length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-[300px] overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : renderDropdown ? (
            renderDropdown({ filteredItems, inputValue, setInputValue, setIsFocused })
          ) : filteredItems.length > 0 ? (
            <div className="p-1">
              {filteredItems.map((item) => (
                <button
                  type="button"
                  key={getItemKey(item)}
                  onClick={() => onSelect(item, setInputValue, setIsFocused)}
                  className="w-full text-left flex flex-col p-2 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                >
                  {renderItem(item)}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
