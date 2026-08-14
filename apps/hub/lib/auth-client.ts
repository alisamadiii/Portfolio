import { authClient } from "@workspace/auth/auth-client";

export const { signIn, signOut, useSession } = authClient;
export { authClient };
