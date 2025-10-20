import { useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import { useCallback } from "react";

/**
 * Wrapper around useMutation that automatically shows toast notifications for errors
 *
 * @example
 * const createChat = useConvexMutation(api.chats.createChatWithNode);
 *
 * // Call it like normal, errors will show as toasts
 * await createChat({ title: "New Chat", visionId });
 */
export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation
) {
  const baseMutation = useMutation(mutation);

  return useCallback(
    async (args: FunctionArgs<Mutation>): Promise<FunctionReturnType<Mutation> | undefined> => {
      try {
        return await baseMutation(args);
      } catch (error) {
        // Extract error message
        let errorMessage = "An error occurred";

        if (error instanceof Error) {
          // Extract just the error message without Convex context
          // Convex errors include: [CONVEX M(function)] [Request ID: xxx] Server Error
          // followed by the actual error on the next line
          const lines = error.message.split('\n');

          // Find the line with the actual error message (skip Convex metadata)
          const actualError = lines.find(line =>
            !line.includes('[CONVEX') &&
            !line.includes('[Request ID') &&
            !line.includes('Server Error') &&
            line.trim().length > 0
          );

          if (actualError) {
            // Remove "Uncaught ErrorType:" prefix if present
            errorMessage = actualError.trim().replace(/^Uncaught \w+Error:\s*/, '');
          } else {
            // Fallback to first line
            errorMessage = lines[0].replace(/^Uncaught \w+Error:\s*/, '');
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        // Show toast with error
        toast.error(errorMessage);

        // Re-throw so calling code can handle it if needed
        throw error;
      }
    },
    [baseMutation]
  );
}

/**
 * Wrapper around useAction that automatically shows toast notifications for errors
 *
 * @example
 * const processData = useConvexAction(api.actions.processData);
 *
 * // Call it like normal, errors will show as toasts
 * await processData({ data });
 */
export function useConvexAction<Action extends FunctionReference<"action">>(
  action: Action
) {
  const baseAction = useAction(action);

  return useCallback(
    async (args: FunctionArgs<Action>): Promise<FunctionReturnType<Action> | undefined> => {
      try {
        return await baseAction(args);
      } catch (error) {
        // Extract error message
        let errorMessage = "An error occurred";

        if (error instanceof Error) {
          // Extract just the error message without Convex context
          // Convex errors include: [CONVEX M(function)] [Request ID: xxx] Server Error
          // followed by the actual error on the next line
          const lines = error.message.split('\n');

          // Find the line with the actual error message (skip Convex metadata)
          const actualError = lines.find(line =>
            !line.includes('[CONVEX') &&
            !line.includes('[Request ID') &&
            !line.includes('Server Error') &&
            line.trim().length > 0
          );

          if (actualError) {
            // Remove "Uncaught ErrorType:" prefix if present
            errorMessage = actualError.trim().replace(/^Uncaught \w+Error:\s*/, '');
          } else {
            // Fallback to first line
            errorMessage = lines[0].replace(/^Uncaught \w+Error:\s*/, '');
          }
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        // Show toast with error
        toast.error(errorMessage);

        // Re-throw so calling code can handle it if needed
        throw error;
      }
    },
    [baseAction]
  );
}
