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
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { notificationPriorityValues } from "@workspace/drizzle/schema";

const formSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  priority: z.enum(notificationPriorityValues),
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
      message: "",
      priority: "MEDIUM",
    },
  });
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    sendNotification.mutate(
      {
        projectType: "AGENCY",
        priority: values.priority,
        subject: values.subject,
        message: values.message,
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          toast.success("Message sent successfully");
          queryClient.invalidateQueries(
            trpc.notification.sentNotifications.queryOptions({
              project: "AGENCY",
            })
          );
        },
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
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Button type="submit" isLoading={sendNotification.isPending}>
          Send
        </Button>
      </form>
    </>
  );
};
