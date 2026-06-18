import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidateProperties, PAGE_SIZE, QUERY_KEYS, STALE_TIME } from "@/lib/query";
import { useRole } from "@/hooks";
import {
  createKeyHolder,
  createProperty,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyByIdForAgent,
  fetchTenantHolderForProperty,
  updateKeyHolder,
  updateProperty,
} from "@/lib/services";
import { normalizeAustralianPhone } from "@/lib/utils/phone";
import {
  DbProperty,
  DbPropertyInsert,
  DbPropertyUpdate,
  PropertyStatus,
} from "@/types";
export function useInfiniteProperties({
  search = "",
  status,
}: { search?: string; status?: PropertyStatus } = {}) {
  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.properties.infinite(search, status ?? ""),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchProperties({
        search,
        status,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: DbProperty[], allPages: DbProperty[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    select: (data) => ({
      ...data,
      properties: data.pages.flat() as DbProperty[],
    }),
  });
  return {
    ...query,
    properties: query.data?.properties ?? [],
  };
}
export function useProperty(id: string) {
  const { isAdmin } = useRole();
  return useQuery({
    queryKey: QUERY_KEYS.properties.detail(id),
    queryFn: () =>
      isAdmin ? fetchPropertyById(id) : fetchPropertyByIdForAgent(id),
    enabled: !!id,
    staleTime: STALE_TIME.short,
  });
}
export function usePropertyTenant(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: ["propertyTenant", propertyId],
    queryFn: () => fetchTenantHolderForProperty(propertyId),
    enabled: !!propertyId && enabled,
    staleTime: STALE_TIME.short,
  });
}
export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DbPropertyInsert) => createProperty(input),
    onSuccess: () => {
      invalidateProperties(queryClient);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
export function useUpdateProperty(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DbPropertyUpdate) => updateProperty(propertyId, patch),
    onSuccess: () => invalidateProperties(queryClient, propertyId),
  });
}
/**
 * Combined edit mutation used by `PropertyEditSheet`. Patches the property
 * row + the joined landlord key-holder in one logical operation:
 *
 *  - If the property already has a landlord holder -> patch it.
 *  - If not and a name/phone was provided          -> create a holder and link it.
 *  - If the user cleared both fields               -> leave the existing link alone.
 */
export type UpdatePropertyDetailsInput = {
  patch: DbPropertyUpdate;
  landlord: {
    holderId: string | null;
    name: string;
    phone: string;
  };
};
export function useUpdatePropertyDetails(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patch, landlord }: UpdatePropertyDetailsInput) => {
      const trimmedName = landlord.name.trim();
      // Normalise to E.164 (+614...) before persisting.
      const normalisedPhone = landlord.phone.trim()
        ? normalizeAustralianPhone(landlord.phone.trim())
        : null;
      const fullPatch: DbPropertyUpdate = { ...patch };
      if (landlord.holderId) {
        await updateKeyHolder(landlord.holderId, {
          full_name: trimmedName || null,
          phone: normalisedPhone,
        });
      } else if (trimmedName || normalisedPhone) {
        const holder = await createKeyHolder({
          holder_type: "landlord",
          full_name: trimmedName || null,
          phone: normalisedPhone,
        });
        fullPatch.landlord_holder_id = holder.id;
      }
      return updateProperty(propertyId, fullPatch);
    },
    onSuccess: () => invalidateProperties(queryClient, propertyId),
  });
}
