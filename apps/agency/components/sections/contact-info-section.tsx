"use client";

import { Mail, MapPin, Phone } from "lucide-react";

import { GridCell } from "@/components/grid-cell";

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@alisamadii.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (555) 123-4567",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "San Francisco, CA",
  },
];

export function ContactInfoSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      {CONTACT_ITEMS.map((item, i) => (
        <GridCell key={item.label} delay={i * 0.1}>
          <div className="flex items-start gap-4">
            <div className="border-border flex h-10 w-10 shrink-0 items-center justify-center border">
              <item.icon className="text-primary/70 h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground mb-1 font-mono text-xs tracking-[0.15em] uppercase">
                {item.label}
              </p>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          </div>
        </GridCell>
      ))}
    </div>
  );
}
