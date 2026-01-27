import { useMutation } from "@tanstack/react-query";

import { generatePublicUrl } from "@workspace/storage/action";

export const useGeneratePublicUrlMutation = () => {
  return useMutation({
    mutationFn: async ({
      url,
      expiresIn = 60,
    }: {
      url: string;
      expiresIn?: number;
    }) => {
      try {
        const result = await generatePublicUrl({ url, expiresIn });

        if (result.error) {
          throw new Error(result.error);
        }

        return result.data;
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to generate public URL"
        );
      }
    },
  });
};
