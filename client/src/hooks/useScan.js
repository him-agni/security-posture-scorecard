import { useMutation } from '@tanstack/react-query';
import { scanRepo } from '../services/api';

// A scan is an action, not cached server state -> useMutation, not useQuery.
export function useScan() {
  return useMutation({
    mutationFn: (repoUrl) => scanRepo(repoUrl),
  });
}
