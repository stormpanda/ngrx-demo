import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, setEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, switchMap, tap } from 'rxjs';
import { TodoListItem } from '../todo.model';
import { TodoService } from '../todo.service';

export const TodoListStore = signalStore(
  withState({
    id: '',
    title: '',
    loading: false,
    editing: '',
  }),

  // this can be used with a config object to specify the entity and collection names.
  // this allows for multiple entity collections in the same store. if this is used,
  // functions like addEntity, setEntity, and setEntities will require the collection
  // second argument.
  withEntities<TodoListItem>(),

  withComputed(({ loading, editing }) => ({
    addDisabled: computed(() => loading() && !!editing()),
  })),

  withMethods((store, todoService = inject(TodoService)) => ({
    editItem(id: string | undefined): void {
      patchState(store, { editing: id });
    },

    async addItem(): Promise<void> {
      patchState(store, { loading: true });
      const newItem = await firstValueFrom(todoService.addItem(store.id(), ''));
      patchState(store, addEntity(newItem), { loading: false, editing: newItem.id });
    },

    loadList: rxMethod<string>(id$ =>
      id$.pipe(
        tap(id => patchState(store, { id, loading: true })),
        switchMap(id =>
          todoService.getList(id).pipe(
            tapResponse({
              next: ({ items, ...list }) => patchState(store, { ...list }, setEntities(items)),
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
      patchState(store, setEntity(updatedItem), { loading: false });
    },
  })),
);
