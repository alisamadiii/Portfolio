import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

import { Button } from "../components/button";
import { cn } from "../lib/utils";

export const ConfirmDialog = ({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children}
    </AlertDialog>
  );
};

const Trigger = ({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  return (
    <AlertDialogTrigger asChild={asChild} onClick={(e) => e.stopPropagation()}>
      {children}
    </AlertDialogTrigger>
  );
};

const Content = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertDialogContent
      className="[&:has([data-error])]:animate-shake md:max-w-96"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </AlertDialogContent>
  );
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertDialogFooter className="flex sm:flex-col">
      {children}
    </AlertDialogFooter>
  );
};

const Cancel = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertDialogCancel className="h-12 text-base">{children}</AlertDialogCancel>
  );
};

interface ActionProps extends React.ComponentProps<typeof Button> {
  className?: string;
}

const Action = ({ children, className, ...props }: ActionProps) => {
  return (
    <Button className={cn("h-12 text-base", className)} {...props}>
      {children}
    </Button>
  );
};

const Header = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertDialogHeader className="items-center">{children}</AlertDialogHeader>
  );
};

const Title = ({ children }: { children: React.ReactNode }) => {
  return <AlertDialogTitle>{children}</AlertDialogTitle>;
};

const Description = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertDialogDescription className="text-center">
      {children}
    </AlertDialogDescription>
  );
};

export const Error = ({ error }: { error: string }) => {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          data-error
          className="text-destructive flex items-center gap-1 overflow-hidden text-xs will-change-transform"
        >
          <AlertCircle className="shrink-0" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
};

ConfirmDialog.Trigger = Trigger;
ConfirmDialog.Content = Content;
ConfirmDialog.Footer = Footer;
ConfirmDialog.Cancel = Cancel;
ConfirmDialog.Action = Action;
ConfirmDialog.Header = Header;
ConfirmDialog.Title = Title;
ConfirmDialog.Description = Description;
ConfirmDialog.Error = Error;

export const ReadyConfirmDialog = ({
  children,
  title,
  description,
  action,
  isOpen,
  onOpenChange,
}: {
  children?: React.ReactNode;
  title: string;
  description: string;
  action: {
    label: string;
    onClick: () => void;
    isPending?: boolean;
    isError?: boolean;
    isSuccess?: boolean;
    error?: string;
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <ConfirmDialog open={isOpen} onOpenChange={onOpenChange}>
      <ConfirmDialog.Trigger>{children}</ConfirmDialog.Trigger>
      <ConfirmDialog.Content>
        <ConfirmDialog.Header>
          <ConfirmDialog.Title>{title}</ConfirmDialog.Title>
        </ConfirmDialog.Header>
        <ConfirmDialog.Description>{description}</ConfirmDialog.Description>
        <ConfirmDialog.Footer>
          <ConfirmDialog.Action
            onClick={action.onClick}
            isLoading={action.isPending}
          >
            {action.label}
          </ConfirmDialog.Action>
          <ConfirmDialog.Cancel>Cancel</ConfirmDialog.Cancel>
        </ConfirmDialog.Footer>
        <ConfirmDialog.Error error={action.error ?? ""} />
      </ConfirmDialog.Content>
    </ConfirmDialog>
  );
};
