'use client';

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import TaskCard, { type TaskCardTask } from './TaskCard';
import TaskColumn from './TaskColumn';

export type TaskDndTask = TaskCardTask & {
  listId: string;
  boardId: string;
  position: string;
};

type ListModel = {
  id: string;
  title: string;
  isWipLimited: boolean;
  wipLimit: number | null;
};

function sortTasks(tasks: TaskDndTask[]) {
  return tasks.slice().sort((a, b) => {
    if (a.position < b.position) return -1;
    if (a.position > b.position) return 1;
    return a.id.localeCompare(b.id);
  });
}

function SortableTask({ task, disabled, onClick }: { task: TaskDndTask; disabled: boolean; onClick?: () => void }) {
  const sortable = useSortable({
    id: task.id,
    disabled,
    data: { type: 'task', taskId: task.id, listId: task.listId },
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <TaskCard
        task={task}
        dragging={sortable.isDragging}
        onClick={onClick}
        {...sortable.attributes}
        {...sortable.listeners}
      />
    </div>
  );
}

export default function TaskDnd({
  lists,
  tasks,
  readonly,
  canWriteTask,
  onCreateTask,
  onMove,
  onSelectTask,
  renderList,
}: {
  lists: ListModel[];
  tasks: TaskDndTask[];
  readonly: boolean;
  canWriteTask: boolean;
  onCreateTask: (listId: string, title: string) => void | Promise<void>;
  onMove: (input: {
    taskId: string;
    toListId: string;
    beforeTaskId: string | null;
    afterTaskId: string | null;
  }) => void | Promise<void>;
  onSelectTask?: (taskId: string) => void;
  renderList?: (list: ListModel, taskColumn: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const draggableEnabled = !readonly && canWriteTask;

  const tasksById = new Map(tasks.map((t) => [t.id, t] as const));

  const tasksByListId = new Map<string, TaskDndTask[]>();
  for (const list of lists) {
    tasksByListId.set(list.id, []);
  }
  for (const task of tasks) {
    const arr = tasksByListId.get(task.listId);
    if (arr) arr.push(task);
  }
  for (const [listId, arr] of tasksByListId) {
    tasksByListId.set(listId, sortTasks(arr));
  }

  function getListIdForOverId(overId: string): string | null {
    if (tasksById.has(overId)) return tasksById.get(overId)!.listId;
    if (tasksByListId.has(overId)) return overId;
    return null;
  }

  function computeMove({
    activeTaskId,
    overId,
  }: {
    activeTaskId: string;
    overId: string;
  }): { toListId: string; beforeTaskId: string | null; afterTaskId: string | null } | null {
    const activeTask = tasksById.get(activeTaskId);
    if (!activeTask) return null;

    const fromListId = activeTask.listId;
    const toListId = getListIdForOverId(overId);
    if (!toListId) return null;

    const fromIds = (tasksByListId.get(fromListId) ?? []).map((t) => t.id);
    const toIds = (tasksByListId.get(toListId) ?? []).map((t) => t.id);

    const fromIndex = fromIds.indexOf(activeTaskId);
    if (fromIndex === -1) return null;

    let targetIndex: number;
    if (tasksById.has(overId)) {
      targetIndex = toIds.indexOf(overId);
      if (targetIndex === -1) return null;
    } else {
      targetIndex = toIds.length;
    }

    // Simulate the post-drop order.
    const nextFrom = fromListId === toListId ? toIds.slice() : fromIds.slice();

    if (fromListId === toListId) {
      const overIndex = tasksById.has(overId) ? nextFrom.indexOf(overId) : nextFrom.length;
      if (overIndex === -1) return null;
      const moved = arrayMove(nextFrom, fromIndex, overIndex);
      const idx = moved.indexOf(activeTaskId);
      const afterTaskId = idx > 0 ? moved[idx - 1] ?? null : null;
      const beforeTaskId = idx < moved.length - 1 ? moved[idx + 1] ?? null : null;
      return { toListId, beforeTaskId, afterTaskId };
    }

    // Cross-list: remove from source, insert into target.
    const nextTo = toIds.slice();
    const removed = nextFrom.splice(fromIndex, 1);
    const movedId = removed[0];
    if (!movedId) return null;

    const insertIndex = Math.max(0, Math.min(targetIndex, nextTo.length));
    nextTo.splice(insertIndex, 0, movedId);

    const idx = nextTo.indexOf(movedId);
    const afterTaskId = idx > 0 ? nextTo[idx - 1] ?? null : null;
    const beforeTaskId = idx < nextTo.length - 1 ? nextTo[idx + 1] ?? null : null;

    return { toListId, beforeTaskId, afterTaskId };
  }

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeTask = activeId ? tasksById.get(activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => {
        if (!draggableEnabled) return;
        setActiveId(String(e.active.id));
      }}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(e) => {
        setActiveId(null);
        if (!draggableEnabled) return;
        if (!e.over) return;

        const activeTaskId = String(e.active.id);
        const overId = String(e.over.id);
        if (activeTaskId === overId) return;

        const plan = computeMove({ activeTaskId, overId });
        if (!plan) return;
        void onMove({
          taskId: activeTaskId,
          toListId: plan.toListId,
          beforeTaskId: plan.beforeTaskId,
          afterTaskId: plan.afterTaskId,
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="task-board">
        {lists.map((list) => {
          const tasksInList = tasksByListId.get(list.id) ?? [];
          const activeCount = tasksInList.filter((t) => t.status !== 'archived').length;

          const column = (
            <TaskColumn
              list={list}
              wipCount={activeCount}
              readonly={readonly}
              canWriteTask={canWriteTask}
              onCreateTask={(title) => onCreateTask(list.id, title)}
            >
              <SortableContext items={tasksInList.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasksInList.length === 0 ? (
                  <div className="py-2 text-center text-xs text-slate-500">拖拉 task 到這裡</div>
                ) : null}
                {tasksInList.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    disabled={!draggableEnabled}
                    onClick={onSelectTask ? () => onSelectTask(task.id) : undefined}
                  />
                ))}
              </SortableContext>
            </TaskColumn>
          );

          return <div key={list.id}>{renderList ? renderList(list, column) : column}</div>;
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72">
            <TaskCard task={activeTask} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
