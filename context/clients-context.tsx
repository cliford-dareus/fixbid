import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {Alert} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/context/auth-context';
import {clientsApi, type Client, type CreateClientInput} from '@/lib/data';
import {fromResult, queryKeys} from '@/lib/query-client';

type ClientsContextType = {
  clients: Client[];
  loading: boolean;
  addClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  fetchClients: () => Promise<void>;
};

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: userId ? queryKeys.clients(userId) : ['clients', 'none'],
    queryFn: () => fromResult(clientsApi.listClients(userId!)),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (clientsQuery.error) console.error(clientsQuery.error);
  }, [clientsQuery.error]);

  const clients = clientsQuery.data ?? [];

  const fetchClients = useCallback(async () => {
    if (!userId) return;
    await qc.invalidateQueries({queryKey: queryKeys.clients(userId)});
  }, [qc, userId]);

  const addClient = useCallback(
    async (input: CreateClientInput): Promise<Client> => {
      if (!userId) throw new Error('Not logged in');
      const created = await fromResult(clientsApi.createClient(userId, input));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) => [
        created,
        ...(list ?? []),
      ]);
      return created;
    },
    [qc, userId],
  );

  const updateClient = useCallback(
    async (id: string, updates: Partial<Client>) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Client[]>(queryKeys.clients(userId));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) =>
        (list ?? []).map((c) => (c.id === id ? {...c, ...updates} : c)),
      );
      try {
        await fromResult(clientsApi.updateClient(id, updates));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.clients(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update client');
        throw e;
      }
    },
    [qc, userId],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!id || !userId) return;
      const prev = qc.getQueryData<Client[]>(queryKeys.clients(userId));
      qc.setQueryData<Client[]>(queryKeys.clients(userId), (list) =>
        (list ?? []).filter((c) => c.id !== id),
      );
      try {
        await fromResult(clientsApi.deleteClient(id));
      } catch (e) {
        if (prev) qc.setQueryData(queryKeys.clients(userId), prev);
        console.error(e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete client');
        throw e;
      }
    },
    [qc, userId],
  );

  const value = useMemo(
    () => ({
      clients,
      loading: Boolean(userId) && clientsQuery.isLoading,
      addClient,
      updateClient,
      deleteClient,
      fetchClients,
    }),
    [
      clients,
      userId,
      clientsQuery.isLoading,
      addClient,
      updateClient,
      deleteClient,
      fetchClients,
    ],
  );

  return (
    <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used within ClientsProvider');
  return ctx;
}
