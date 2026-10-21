import { loadUsers } from '../api'
import { usePagedList } from './usePagedList'

// One page of users, searched on the server as the admin types.
export function useUsersPage(enabled: boolean, searchQuery: string, onError: (message: string) => void) {
  const { result, isLoading, setPage, reload } = usePagedList(
    enabled,
    searchQuery,
    loadUsers,
    onError,
    'Failed to load users',
  )
  return { usersPage: result, isLoading, setPage, reload }
}
