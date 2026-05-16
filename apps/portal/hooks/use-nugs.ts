import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

export const useNugsVerifyEmail = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "verify-email",
    parseAsBoolean.withDefault(false)
  );
  const [email, setEmail] = useQueryState("email", parseAsString);

  return { isOpen, setIsOpen, email, setEmail };
};
