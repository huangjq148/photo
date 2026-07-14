import { toErrorResponse } from "@/lib/api/errors";

export type BatchFailure = {
  id: string;
  code: string;
  message: string;
};

export type BatchMutationResult = {
  succeededIds: string[];
  failed: BatchFailure[];
};

export function buildBatchResult(
  inputIds: readonly string[],
  failures: ReadonlyMap<string, unknown>
): BatchMutationResult {
  const seen = new Set<string>();
  const succeededIds: string[] = [];
  const failed: BatchFailure[] = [];

  for (const id of inputIds) {
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    const failure = failures.get(id);

    if (failure !== undefined) {
      const error = toErrorResponse(failure);
      failed.push({
        id,
        code: error.code,
        message: error.error,
      });
      continue;
    }

    succeededIds.push(id);
  }

  return { succeededIds, failed };
}
