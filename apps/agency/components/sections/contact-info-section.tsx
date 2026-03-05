"use client";

import { Mail, MapPin, Phone } from "lucide-react";

import { company } from "@workspace/ui/lib/company";

import { GridCell } from "@/components/grid-cell";

function telUrl(phone: string) {
  return `tel:${phone.replace(/\D/g, "")}`;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: "Email",
    value: company.email,
    href: `mailto:${company.email}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: company.phone,
    href: telUrl(company.phone),
  },
  {
    icon: MapPin,
    label: "Location",
    value: company.location,
  },
];

export function ContactInfoSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      {CONTACT_ITEMS.map((item, i) => (
        <GridCell key={item.label} delay={i * 0.1}>
          <a
            href={item.href}
            target={item.label === "Location" ? "_blank" : undefined}
            rel={item.label === "Location" ? "noopener noreferrer" : undefined}
            className="-m-8 flex items-start gap-4 p-8 transition-colors duration-200 hover:bg-white/[0.02] md:-m-10 md:p-10"
          >
            <div className="border-border flex h-10 w-10 shrink-0 items-center justify-center border">
              <item.icon className="text-primary/70 h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground mb-1 font-mono text-xs tracking-[0.15em] uppercase">
                {item.label}
              </p>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          </a>
        </GridCell>
      ))}
    </div>
  );
}
