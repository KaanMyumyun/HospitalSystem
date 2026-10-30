import { loadUsers } from '../api'
import { usePagedList } from './usePagedList'

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
