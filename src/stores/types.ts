export type StoreSetter<TStore> = (
  partial:
    | Partial<TStore>
    | ((state: TStore) => Partial<TStore>),
) => void;

export type StoreGetter<TStore> = () => TStore;

export type StorePublicActions<TAction> = Pick<TAction, keyof TAction>;
