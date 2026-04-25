"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  SERVICE_CATALOG,
  STARTER_SERVICE_ID,
} from "@workspace/ui/lib/agency-utils";

import type { ProductFormValues } from "./wizard";

type StepServicesProps = {
  form: UseFormReturn<ProductFormValues>;
  onNext: () => void;
};

export const StepServices = ({ form, onNext }: StepServicesProps) => {
  const services = form.watch("services");
  const nonStarterServices = services.filter(
    (s) => s.name !== STARTER_SERVICE_ID
  );

  const removeService = (name: string) => {
    form.setValue(
      "services",
      services.filter((s) => s.name !== name)
    );
  };

  const addService = (name: string, price: number) => {
    const existing = services.find((s) => s.name === name);
    if (existing) {
      form.setValue(
        "services",
        services.map((s) => (s.name === name ? { ...s, price } : s))
      );
    } else {
      form.setValue("services", [...services, { name, price }]);
    }
  };

  const getLabel = (id: string) =>
    SERVICE_CATALOG.find((s) => s.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      {nonStarterServices.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No additional services added yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {nonStarterServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {getLabel(service.name)}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  ${(service.price / 100).toFixed(2)}/mo
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => removeService(service.name)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddServiceDialog
        existingServices={services.map((s) => s.name)}
        onAdd={addService}
      />

      {nonStarterServices.length > 0 && (
        <div className="border-t pt-3">
          <div className="text-muted-foreground mb-3 flex items-center justify-between text-sm">
            <span>Total</span>
            <span className="font-mono font-medium">
              $
              {(services.reduce((sum, s) => sum + s.price, 0) / 100).toFixed(2)}
              /mo
            </span>
          </div>
          <Button type="button" onClick={onNext} className="w-full">
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Add Service Dialog ────────────────────────────────────────────────────

type AddServiceDialogProps = {
  existingServices: string[];
  onAdd: (name: string, price: number) => void;
};

const AddServiceDialog = ({
  existingServices,
  onAdd,
}: AddServiceDialogProps) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [tab, setTab] = useState<string>("catalog");

  const availableServices = SERVICE_CATALOG.filter(
    (s) => s.id !== STARTER_SERVICE_ID && !existingServices.includes(s.id)
  );

  const selectedCatalogEntry = SERVICE_CATALOG.find((s) => s.id === selectedId);

  const reset = () => {
    setSelectedId("");
    setCustomName("");
    setPriceDollars("");
    setTab("catalog");
  };

  const canSave =
    tab === "catalog"
      ? selectedId && priceDollars && Number(priceDollars) > 0
      : customName.trim() && priceDollars && Number(priceDollars) > 0;

  const handleSave = () => {
    const cents = Math.round(Number(priceDollars) * 100);
    if (tab === "catalog" && selectedId) {
      onAdd(selectedId, cents);
    } else if (tab === "custom" && customName.trim()) {
      onAdd(customName.trim(), cents);
    }
    reset();
  };

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger>
        <Button type="button" variant="outline" className="w-full">
          + Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="animate-none!">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="catalog" className="flex-1">
                From Catalog
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="mt-4 flex flex-col gap-4">
              <Select
                value={selectedId}
                onValueChange={(id) => {
                  setSelectedId(id);
                  setPriceDollars("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCatalogEntry && (
                <>
                  <p className="text-muted-foreground text-xs">
                    {selectedCatalogEntry.description}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPriceDollars(
                        (selectedCatalogEntry.defaultPrice / 100).toFixed(2)
                      )
                    }
                    className="bg-secondary hover:bg-secondary/80 w-fit rounded-md px-2.5 py-1 text-xs font-medium"
                  >
                    ${(selectedCatalogEntry.defaultPrice / 100).toFixed(2)}/mo
                  </button>
                </>
              )}

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="h-9 w-32"
                />
                <span className="text-muted-foreground text-sm">/ mo</span>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-4 flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Service name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="h-9 w-32"
                />
                <span className="text-muted-foreground text-sm">/ mo</span>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose>
            <Button type="button" onClick={handleSave} disabled={!canSave}>
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
