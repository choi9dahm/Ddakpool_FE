"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import { FOLDER_SLOT_COLORS } from "@/lib/constants";
import { layout } from "@/lib/design-tokens";
import type { Folder } from "@/lib/types";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

interface FolderEditModalProps {
  open: boolean;
  onClose: () => void;
}

interface EditableFolder {
  id?: string;
  name: string;
  slot: number;
}

function FolderIcon({ color }: { color: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M3.33301 6.66699L3.33301 15.8337C3.33301 16.2939 3.7061 16.667 4.16634 16.667H15.833C16.2933 16.667 16.6663 16.2939 16.6663 15.8337V7.50033C16.6663 7.04009 16.2933 6.66699 15.833 6.66699H10.4163L8.74967 5.00033C8.56214 4.8128 8.30779 4.70744 8.04257 4.70744H4.16634C3.7061 4.70744 3.33301 5.08054 3.33301 5.54077V6.66699Z"
        fill={color}
      />
    </svg>
  );
}

function IconButton({
  src,
  label,
  onClick,
}: {
  src: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center opacity-70 transition-opacity hover:opacity-100 md:size-5"
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={20} height={20} />
    </button>
  );
}

export function FolderEditModal({ open, onClose }: FolderEditModalProps) {
  const queryClient = useQueryClient();
  const [folders, setFolders] = useState<EditableFolder[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [rowError, setRowError] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [error, setError] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: serverFolders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
    enabled: open,
  });

  useEffect(() => {
    if (open && serverFolders.length) {
      setFolders(
        serverFolders.map((f) => ({ id: f.id, name: f.name, slot: f.slot }))
      );
      setDeletedIds([]);
      setDirty(false);
      setError("");
      setRowError("");
      setEditingIndex(null);
      setDraftName("");
    }
  }, [open, serverFolders]);

  useEffect(() => {
    if (editingIndex !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingIndex]);

  function handleClose() {
    // 인라인 편집 중 바깥 클릭: draft가 원본과 다르면 dirty로 취급
    if (editingIndex !== null) {
      const original = folders[editingIndex]?.name ?? "";
      if (draftName.trim() !== original.trim()) {
        setDirty(true);
        setShowLeave(true);
        return;
      }
    }
    if (dirty) {
      setShowLeave(true);
      return;
    }
    onClose();
  }

  function startEditing(index: number) {
    setEditingIndex(index);
    setDraftName(folders[index].name);
    setRowError("");
    setError("");
  }

  function applyEditing() {
    if (editingIndex === null) return;
    const name = draftName.trim();
    if (name.length < 1 || name.length > 6) {
      setRowError("폴더 이름은 1~6자여야 해요.");
      return;
    }
    const duplicate = folders.some(
      (f, i) => i !== editingIndex && f.name.trim() === name
    );
    if (duplicate) {
      setRowError("이미 같은 이름의 폴더가 있어요.");
      return;
    }
    setFolders((prev) =>
      prev.map((f, i) => (i === editingIndex ? { ...f, name } : f))
    );
    setDirty(true);
    setEditingIndex(null);
    setDraftName("");
    setRowError("");
  }

  function cancelEditing() {
    setEditingIndex(null);
    setDraftName("");
    setRowError("");
  }

  function addFolder() {
    if (folders.length >= 5) return;
    if (editingIndex !== null) applyEditing();
    const usedSlots = new Set(folders.map((f) => f.slot));
    let slot = 1;
    while (usedSlots.has(slot) && slot <= 5) slot++;
    setFolders((prev) => {
      const next = [...prev, { name: "새폴더", slot }];
      setEditingIndex(next.length - 1);
      setDraftName("새폴더");
      return next;
    });
    setDirty(true);
  }

  function removeFolder(index: number) {
    const folder = folders[index];
    if (folder.id) {
      setDeletedIds((prev) => [...prev, folder.id!]);
    }
    setFolders((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
    setShowDeleteConfirm(null);
    if (editingIndex === index) cancelEditing();
  }

  async function handleSave() {
    let nextFolders = folders;
    if (editingIndex !== null) {
      const name = draftName.trim();
      if (name.length < 1 || name.length > 6) {
        setRowError("폴더 이름은 1~6자여야 해요.");
        return;
      }
      const duplicate = folders.some(
        (f, i) => i !== editingIndex && f.name.trim() === name
      );
      if (duplicate) {
        setRowError("이미 같은 이름의 폴더가 있어요.");
        return;
      }
      nextFolders = folders.map((f, i) =>
        i === editingIndex ? { ...f, name } : f
      );
      setFolders(nextFolders);
      setEditingIndex(null);
      setDraftName("");
    }

    const invalid = nextFolders.some((f) => f.name.trim().length < 1);
    if (invalid) {
      setError("폴더 이름은 1~6자여야 해요.");
      return;
    }

    await apiFetch("/folders", {
      method: "PUT",
      body: JSON.stringify({
        folders: nextFolders.map((f) => ({
          id: f.id,
          name: f.name.trim(),
          slot: f.slot,
        })),
        deletedIds,
      }),
    });

    await queryClient.invalidateQueries({ queryKey: ["folders"] });
    setDirty(false);
    setToastOpen(true);
    onClose();
  }

  if (!open) {
    return (
      <Toast
        message="저장이 완료되었어요!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    );
  }

  const deleteTarget =
    showDeleteConfirm !== null ? folders[showDeleteConfirm] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <div
          className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-y-auto rounded-2xl bg-white px-6 py-6 shadow-xl"
          style={{ maxWidth: layout.folderModalWidth }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-edit-title"
        >
          <h2
            id="folder-edit-title"
            className="text-base font-bold text-dd-black"
          >
            폴더 수정하기
          </h2>
          <div className="mt-2 space-y-0.5 text-xs leading-relaxed text-dd-gray-500">
            <p>폴더는 최대 5개까지 생성할 수 있어요.</p>
            <p>폴더를 삭제해도 공고는 삭제되지 않아요.</p>
            <p className="font-semibold text-dd-black">
              폴더를 사용해 저장한 공고를 자유롭게 분류해보세요.
            </p>
          </div>

          <div className="mt-4 flex flex-col">
            {folders.map((folder, index) => {
              const color =
                FOLDER_SLOT_COLORS[folder.slot] ?? FOLDER_SLOT_COLORS[1];
              const isEditing = editingIndex === index;

              return (
                <div key={folder.id ?? `new-${index}`}>
                  <div className="flex h-[53px] w-full items-center gap-2 rounded-lg px-1 transition-colors hover:bg-dd-gray-100">
                    <FolderIcon color={color.bg} />
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={draftName}
                        onChange={(e) => {
                          setDraftName(e.target.value.slice(0, 6));
                          setRowError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") applyEditing();
                          if (e.key === "Escape") cancelEditing();
                        }}
                        maxLength={6}
                        className="min-w-0 flex-1 rounded border border-dd-gray-400 bg-white px-2 py-1 text-sm text-dd-black outline-none focus:border-dd-black"
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm text-dd-black">
                        {folder.name}
                      </span>
                    )}
                    {isEditing ? (
                      <>
                        <IconButton
                          src={assets.iconCheck}
                          label="이름 적용"
                          onClick={applyEditing}
                        />
                        <IconButton
                          src={assets.iconClose}
                          label="변경 취소"
                          onClick={cancelEditing}
                        />
                      </>
                    ) : (
                      <>
                        <IconButton
                          src={assets.iconEdit}
                          label="폴더 이름 수정"
                          onClick={() => startEditing(index)}
                        />
                        <IconButton
                          src={assets.iconDelete}
                          label="폴더 삭제"
                          onClick={() => setShowDeleteConfirm(index)}
                        />
                      </>
                    )}
                  </div>
                  {isEditing && rowError && (
                    <p className="px-1 pb-1 text-xs text-dd-error">{rowError}</p>
                  )}
                </div>
              );
            })}
          </div>

          {folders.length < 5 && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={addFolder}
                className="flex items-center justify-center opacity-80 transition-opacity hover:opacity-100"
                aria-label="폴더 추가"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assets.iconAddCircle}
                  alt=""
                  width={31}
                  height={31}
                />
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-center text-xs text-dd-error">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="mt-6 h-[37px] w-full rounded-full bg-[#19B469] text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            저장하기
          </button>
        </div>
      </div>

      <Modal
        open={showDeleteConfirm !== null}
        title="안내"
        onClose={() => setShowDeleteConfirm(null)}
        variant="confirm-delete"
        actions={
          <>
            <ModalButton
              variant="danger"
              onClick={() =>
                showDeleteConfirm !== null && removeFolder(showDeleteConfirm)
              }
            >
              삭제하기
            </ModalButton>
            <ModalButton
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              취소
            </ModalButton>
          </>
        }
      >
        <div className="space-y-2 text-center">
          <p>[{deleteTarget?.name ?? "폴더"}] 폴더를 삭제하시겠어요?</p>
          <p className="text-xs text-dd-gray-500">
            폴더가 삭제되어도 안에 있는 공고들은 삭제되지 않아요. 해당 공고들은
            전체보기나 미분류에서 보실 수 있어요.
          </p>
        </div>
      </Modal>

      <Modal
        open={showLeave}
        title="안내"
        onClose={() => setShowLeave(false)}
        variant="confirm-leave"
        actions={
          <>
            <ModalButton
              variant="danger"
              onClick={() => {
                setShowLeave(false);
                onClose();
              }}
            >
              나가기
            </ModalButton>
            <ModalButton variant="outline" onClick={() => setShowLeave(false)}>
              취소
            </ModalButton>
          </>
        }
      >
        <p>저장하지 않은 변경사항이 있어요. 나가시겠어요?</p>
      </Modal>

      <Toast
        message="저장이 완료되었어요!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}
