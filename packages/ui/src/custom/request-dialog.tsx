import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

import { HandCheck } from "../icons";

const SUBJECT_KEYWORDS = [
  "Upgrade My Plan",
  "Request a New Feature",
  "Change Subscription",
  "Bug Report",
  "Billing & Payments",
  "Website Redesign",
  "SEO & Performance",
];

const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const RequestDialog = ({
  children,
  defaultSubject,
}: {
  children: React.ReactNode;
  defaultSubject?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent>
        <Content setOpen={setOpen} defaultSubject={defaultSubject} />
      </DialogContent>
    </Dialog>
  );
};

const Content = ({
  setOpen,
  defaultSubject,
}: {
  setOpen: (open: boolean) => void;
  defaultSubject?: string;
}) => {
  const trpc = useTRPC();
  const sendNotification = useMutation(
    trpc.support.send.mutationOptions()
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: defaultSubject ?? "",
      message: "",
    },
  });
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    sendNotification.mutate(
      {
        projectType: "AGENCY",
        priority: "URGENT",
        subject: values.subject,
        message: values.message,
      },
      {
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Contact Support</DialogTitle>
        <DialogDescription>
          Use this form for general inquiries, billing questions, or account
          support. For website changes, bug reports, or feature requests, please
          use the{" "}
          <a href="/requests" className="underline font-medium">
            AI Requests
          </a>{" "}
          page instead — it&apos;s faster and handled automatically.
        </DialogDescription>
      </DialogHeader>
      {sendNotification.isSuccess ? (
        <div className="mt-4 flex flex-col items-center">
          <HandCheck className="size-16" />
          <h2 className="text-2xl font-bold">Message sent successfully</h2>
          <p className="text-muted-foreground text-sm">
            We will get back to you shortly via email.
          </p>
        </div>
      ) : (
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col items-start gap-4"
        >
          <Controller
            control={form.control}
            name="subject"
            render={({ field }) => (
              <Field aria-invalid={!!form.formState.errors.subject}>
                <FieldLabel>Subject</FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    placeholder="Service Change Request"
                    aria-invalid={!!form.formState.errors.subject}
                  />
                </FieldContent>
                <FieldError errors={form.formState.errors.subject ? [form.formState.errors.subject] : undefined} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUBJECT_KEYWORDS.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="hover:bg-accent cursor-pointer transition-colors"
                      onClick={() =>
                        form.setValue("subject", keyword, {
                          shouldValidate: true,
                        })
                      }
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="message"
            render={({ field }) => (
              <Field aria-invalid={!!form.formState.errors.message}>
                <FieldLabel>Message</FieldLabel>
                <FieldContent>
                  <Textarea
                    {...field}
                    placeholder="Message"
                    aria-invalid={!!form.formState.errors.message}
                  />
                </FieldContent>
                <FieldError errors={form.formState.errors.message ? [form.formState.errors.message] : undefined} />
              </Field>
            )}
          />
          <Button type="submit" isLoading={sendNotification.isPending}>
            Send
          </Button>
        </form>
      )}
    </>
  );
};
