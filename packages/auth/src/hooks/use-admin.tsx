import { useMutation } from "@tanstack/react-query";

import { queryClient, useTRPC } from "@workspace/trpc/client";

import { authClient } from "../auth-client";

const useCreateUser = () => {
  const trpc = useTRPC();
  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      role,
    }: {
      email: string;
      password: string;
      name: string;
      role: "user" | "admin";
    }) => {
      const { data: newUser, error } = await authClient.admin.createUser({
        email, // required
        password, // required
        name, // required
        role,
      });

      if (error) {
        throw new Error(error.message);
      }

      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.admin.users.getAll.pathKey(),
      });
    },
  });
};

const useUpdateAdminUser = () => {
  const trpc = useTRPC();
  return useMutation(
    trpc.admin.users.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.admin.users.getAll.pathKey(),
        });
      },
    })
  );
};

export { useCreateUser, useUpdateAdminUser };
