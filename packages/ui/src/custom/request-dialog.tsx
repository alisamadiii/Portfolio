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
import { Field, FieldError } from "@workspace/ui/components/field";
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
      <DialogTrigger asChild>{children}</DialogTrigger>
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
    trpc.notification.send.mutationOptions()
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
          We&apos;re here to help! Please fill out the form below to contact our
          support team.
        </DialogDescription>
      </DialogHeader>
      {sendNotification.isSuccess ? (
        <div className="mt-4 flex flex-col items-center">
          <HandCheck className="size-16" />
          <h2 className="text-2xl font-bold">Message sent successfully</h2>
          <p className="text-muted-foreground text-sm">
            We will get back to you shortly via email.
          </p>
          <code className="text-muted-foreground mt-4 text-sm select-all">
            #{sendNotification.data?.id}
          </code>
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
              <Field>
                <Input
                  {...field}
                  placeholder="Service Change Request"
                  label="Subject"
                  aria-invalid={!!form.formState.errors.subject}
                />
                <FieldError errors={[form.formState.errors.subject]} />
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
              <Field>
                <Textarea
                  {...field}
                  placeholder="Message"
                  aria-invalid={!!form.formState.errors.message}
                />
                <FieldError errors={[form.formState.errors.message]} />
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
