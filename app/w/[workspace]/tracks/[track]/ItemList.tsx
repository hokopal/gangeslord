'use client';

import { ArrowDown, ArrowUp, GripVertical, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { TypeIcon } from '@/components/assets/labels';
import type { AssetType } from '@/lib/assets';
import { errorMessage } from '@/lib/messages';
import { moveId } from '@/lib/ordering';
import { moveItemAction, removeItemAction } from '../actions';

export type ListItem = { id: string; title: string; type: AssetType; ready: boolean };

/**
 * The ordered items of a track. Drag a row by its handle, or use the arrow buttons, to
 * reorder; the new order is shown at once and saved in the background.
 */
export function ItemList({
  items,
  workspaceSlug,
  trackId,
  selectedId,
  editable,
}: {
  items: ListItem[];
  workspaceSlug: string;
  trackId: string;
  selectedId: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [pending, startTransition] = useTransition();

  // The server is the source of truth: adopt its list whenever it sends a new one.
  const [serverItems, setServerItems] = useState(items);
  if (items !== serverItems) {
    setServerItems(items);
    setOrder(items);
  }

  function move(id: string, toIndex: number) {
    const from = order.findIndex((i) => i.id === id);
    if (from === -1 || toIndex === from || toIndex < 0 || toIndex >= order.length) return;
    const ids = moveId(order.map((i) => i.id), id, toIndex);
    const previous = order;
    setOrder(ids.map((x) => order.find((i) => i.id === x)!));
    setProblem('');
    startTransition(async () => {
      const error = await moveItemAction(workspaceSlug, trackId, id, toIndex);
      if (error) {
        setOrder(previous);
        setProblem(errorMessage(error));
      } else {
        router.refresh();
      }
    });
  }

  const base = `/w/${workspaceSlug}/tracks/${trackId}`;

  return (
    <>
      {problem ? (
        <p className="notice notice-error" role="alert">
          {problem}
        </p>
      ) : null}
      <ol className="item-list" aria-busy={pending}>
        {order.map((item, index) => (
          <li
            key={item.id}
            className="item"
            data-selected={item.id === selectedId}
            data-dragging={item.id === dragId}
            data-over={item.id === overId && item.id !== dragId}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              setOverId(item.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragId) move(dragId, index);
              setDragId(null);
              setOverId(null);
            }}
          >
            {editable ? (
              <span
                className="drag-handle"
                draggable
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', item.id);
                  setDragId(item.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <GripVertical aria-hidden="true" />
              </span>
            ) : null}
            <Link href={`${base}?item=${item.id}`} className="item-main">
              <span className="thumb" style={{ width: 28, height: 28 }}>
                <TypeIcon type={item.type} />
              </span>
              <span className="truncate">{item.title}</span>
              {item.ready ? null : <span className="badge badge-warn">Not ready</span>}
            </Link>
            {editable ? (
              <span className="item-actions">
                <button type="button" className="icon-button" aria-label={`Move ${item.title} up`} disabled={index === 0 || pending} onClick={() => move(item.id, index - 1)}>
                  <ArrowUp width={14} height={14} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" aria-label={`Move ${item.title} down`} disabled={index === order.length - 1 || pending} onClick={() => move(item.id, index + 1)}>
                  <ArrowDown width={14} height={14} aria-hidden="true" />
                </button>
                <Link href={`${base}?item=${item.id}`} className="icon-button" aria-label={`Edit ${item.title}`}>
                  <Pencil width={14} height={14} aria-hidden="true" />
                </Link>
                <form action={removeItemAction} style={{ display: 'contents' }}>
                  <input type="hidden" name="workspace" value={workspaceSlug} />
                  <input type="hidden" name="track" value={trackId} />
                  <input type="hidden" name="item" value={item.id} />
                  <button type="submit" className="icon-button" aria-label={`Remove ${item.title} from this track`}>
                    <X width={14} height={14} aria-hidden="true" />
                  </button>
                </form>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}
