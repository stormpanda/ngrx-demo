import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, switchMap, tap } from 'rxjs';
import { TodoListItem } from '../todo.model';
import { TodoService } from '../todo.service';

export interface TodoListState {
  id: string;
  title: string;
  items: TodoListItem[];
  loading: boolean;
  editing: string | undefined;
}

const initialState: TodoListState = {
  id: '',
  title: '',
  items: [],
  loading: false,
  editing: undefined,
};

export const TodoListStore = signalStore(
  withState<TodoListState>(initialState),
  withComputed(({ loading, editing }) => ({
    addDisabled: computed(() => loading() && editing() !== undefined),
  })),
  withMethods((store, todoService = inject(TodoService)) => ({
    editItem(id: string | undefined): void {
      patchState(store, { editing: id });
    },

    async addItem(): Promise<void> {
      patchState(store, { loading: true });
      const newItem = await firstValueFrom(todoService.addItem(store.id(), ''));
      const items = [...store.items(), newItem];
      patchState(store, { items, loading: false, editing: newItem.id });
    },

    loadList: rxMethod<string>(id$ =>
      id$.pipe(
        tap(id => patchState(store, { id, loading: true })),
        switchMap(id =>
          todoService.getList(id).pipe(
            tapResponse({
              next: list => patchState(store, list),
              error: () => {},
              finalize: () => patchState(store, { loading: false }),
            }),
          ),
        ),
      ),
    ),

    async updateItem(id: string, update: Partial<TodoListItem>): Promise<void> {
      patchState(store, { loading: true });
      const updatedItem = await firstValueFrom(todoService.updateItem(store.id(), id, update));
      const items = store.items().map(item => (item.id === updatedItem.id ? updatedItem : item));
      patchState(store, { items, loading: false });
    },
  })),
);
