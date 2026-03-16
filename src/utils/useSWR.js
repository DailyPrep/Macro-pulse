// SWR hook wrapper for data fetching with stale data detection
import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url) => axios.get(url).then(res => res.data);

export function useSyncData(endpoint, options = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    endpoint,
    fetcher,
    {
      refreshInterval: 60000, // 60 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      ...options
    }
  );

  const isStale = data?.stale === true || error !== undefined;
  const hasData = data?.data !== undefined && data?.data !== null;

  return {
    data: data?.data,
    timestamp: data?.timestamp,
    isStale,
    isLoading,
    error,
    mutate
  };
}

