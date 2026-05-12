"use client";

import { Trash } from "lucide-react";
import { useState, startTransition } from "react";
import { EditClientModal } from "@/components/clients/edit-client-modal";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Client, OptimisticAction } from "@/types/types";
import { useDeleteClient } from "@/mutations/clients";

interface ClientCardHeaderProps {
  client: Client;
  members: { id: string; name: string }[];
  setOptimistic: (action: OptimisticAction) => void;
}

export function ClientCardHeader({
  client,
  members,
  setOptimistic,
}: ClientCardHeaderProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutate: deleteClient } = useDeleteClient();

  return (
    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
      <CardTitle className="text-xl font-bold flex items-center justify-between">
        <span>{client.name}</span>
        <div className="flex items-center gap-2">
          <EditClientModal
            client={client}
            members={members}
            setOptimistic={setOptimistic}
          />
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete Client</span>
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Client</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {client.name}? This will
                  permanently remove the client and all associated addresses,
                  schedules, and history. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    startTransition(() => {
                      setOptimistic({
                        type: "delete-client",
                        clientId: client.id,
                      });
                      deleteClient(client.id);
                      setIsDeleteDialogOpen(false);
                    });
                  }}
                >
                  Delete Client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardTitle>
    </CardHeader>
  );
}
