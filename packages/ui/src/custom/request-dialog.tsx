import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

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

const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const RequestDialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <Content setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

const Content = ({ setOpen }: { setOpen: (open: boolean) => void }) => {
  const trpc = useTRPC();
  const sendNotification = useMutation(
    trpc.notification.send.mutationOptions()
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    sendNotification.mutate(
      {
        projectType: "AGENCY",
        priority: "URGENT",
        name: values.subject,
        description: values.message,
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
          <code className="text-muted-foreground text-sm">
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
