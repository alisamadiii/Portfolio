"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { DataTable } from "@workspace/ui/custom/data-table";

import { queryClient, useTRPC } from "@workspace/trpc/client";

const coldEmailContent = [
  `
  Hi there,\n\n My name is Ali with AliSamadii.LLC, a web development and digital services agency based in Portland, OR.\n\n I came across your business and really love what you're doing — it's clear you're passionate about what you offer, and your work speaks for itself.\n\n That said, I noticed there may be some opportunities to take your online presence to the next level — whether that's refreshing your website design, improving load speed, mobile responsiveness, or enhancing the overall user experience to better reflect the quality of your brand. A strong online presence can make a huge difference in attracting new customers and building trust, and I'd love to help make sure your website matches the great work you're already doing.\n\n I specialize in fully managed web solutions where I handle everything from design and development to hosting, domain management, and ongoing updates — so you can focus on what you do best: running your business.\n\n I'd love to offer a free, no-obligation website review and walk you through how we can help elevate your brand online.\n\n Feel free to reach out anytime:\n agency@alisamadii.com\n (971) 382-8969\n\n Get to know my work:\n agency.alisamadii.com — services & how I help businesses\n alisamadii.com — my portfolio & projects\n\n Best,\n Ali Samadii\n AliSamadii.LLC
`,

  `
Hi there! I'm Ali with AliSamadii.LLC, a web development agency in Portland, OR. Love what you're doing — your passion really shows!

I noticed some opportunities to elevate your online presence to better match the quality of your brand. I handle everything — design, hosting, updates, and more — so you can focus on your business.

Would love to offer a free website review. Feel free to reach out anytime at agency@alisamadii.com or (971) 382-8969.

Best,

Ali Samadii
`,
];

export default function ColdEmailsPage() {
  const [email, setEmail] = useState("");

  const trpc = useTRPC();
  const sendColdEmail = useMutation(
    trpc.admin.coldEmails.send.mutationOptions()
  );
  const { data: coldEmails } = useQuery(
    trpc.admin.coldEmails.get.queryOptions()
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendColdEmail.mutate(
      { email: email },
      {
        onSuccess: () => {
          toast.success("Cold email sent successfully");
          queryClient.invalidateQueries({
            queryKey: trpc.admin.coldEmails.get.queryKey(),
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Cold Emails
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-start gap-4"
      >
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="w-full"
          required
        />
        <Button isLoading={sendColdEmail.isPending} type="submit">
          Send
        </Button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {coldEmailContent.map((content, index) => (
          <div
            key={index}
            className="bg-muted rounded-lg border p-4 transition-all duration-300 active:scale-95"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success("Copied to clipboard");
            }}
          >
            <p className="whitespace-pre-line">{content}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <DataTable
          columns={[
            {
              header: "Index",
              accessorKey: "index",
              cell: ({ row }) => {
                return <p>{row.index + 1}</p>;
              },
            },
            {
              header: "Email",
              accessorKey: "email",
            },
            {
              header: "Created At",
              accessorKey: "createdAt",
              cell: ({ row }) => {
                return (
                  <p>
                    {format(
                      row.original.createdAt || new Date(),
                      "MM/dd/yyyy hh:mm a"
                    )}
                  </p>
                );
              },
            },
          ]}
          data={coldEmails || []}
        />
      </div>
    </div>
  );
}
