import { useMutation } from "@tanstack/react-query";

import { deleteFilesFromStorage } from "@workspace/storage/action";

export const useDeleteFilesMutation = ({
  isClientWork,
}: {
  isClientWork?: boolean;
}) => {
  return useMutation({
    mutationFn: async (urls: string[]) => {
      try {
        const result = await deleteFilesFromStorage(urls, isClientWork);

        if (result.error) {
          throw new Error(result.error);
        }

        return result;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to delete files"
        );
      }
    },
  });
};
