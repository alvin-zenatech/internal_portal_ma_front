import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type PipelineTask, useTaskHistory, useTaskNotes, useCreateTaskNote, useUpdateTaskNote, useDeleteTaskNote } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Building2, User, Mail, Phone, Edit, MessageSquare, History, Edit2, Trash2 } from "lucide-react";

export default function TaskDetailPanel({ task, onClose, onEdit }: { task: PipelineTask | null, onClose: () => void, onEdit: (t: PipelineTask) => void }) {
  const { data: history } = useTaskHistory(task?.id || null);
  const { data: notes } = useTaskNotes(task?.id || null);
  const { mutateAsync: createNote } = useCreateTaskNote();
  const { mutateAsync: updateNote } = useUpdateTaskNote();
  const { mutateAsync: deleteNote } = useDeleteTaskNote();

  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  const handleAddNote = async () => {
    if (!newNote.trim() || !task) return;
    await createNote({ taskId: task.id, note: newNote });
    setNewNote("");
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="!w-[90vw] sm:!max-w-[85vw] sm:!w-[85vw] p-0 flex flex-col h-full max-h-screen overflow-hidden">
        {task && (
          <>
            <div className="p-6 border-b flex justify-between items-start bg-muted/20">
              <div>
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold">{task.company_name}</SheetTitle>
                </SheetHeader>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-4 w-4" /> {task.name} {task.position_name ? `(${task.position_name})` : ''}</span>
                  {task.industry_name && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {task.industry_name}</span>}
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {task.email}</span>
                  {task.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {task.phone}</span>}
                </div>
              </div>
              <Button variant="outline" onClick={() => onEdit(task)} className="gap-2 mr-8">
                <Edit className="h-4 w-4" /> Edit Task
              </Button>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
              
              {/* Left Column: Details */}
              <div className="h-full min-h-0 p-6 bg-card overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <h3 className="font-semibold text-lg mb-4">Task Details</h3>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Priority / Status</dt>
                    <dd className="font-medium">{task.priority_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Analyst</dt>
                    <dd className="font-medium">{task.analyst_name || 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="font-medium">{task.location || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Country</dt>
                    <dd className="font-medium">{task.country_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Revenue</dt>
                    <dd className="font-medium">{task.revenue || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Team Size</dt>
                    <dd className="font-medium">{task.team_size || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created At</dt>
                    <dd className="font-medium">{new Date(task.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>

              {/* Middle Column: Threaded Notes */}
              <div className="flex flex-col h-full min-h-0 bg-muted/10">
                <div className="p-4 border-b font-semibold flex items-center gap-2 shrink-0">
                  <MessageSquare className="h-4 w-4" /> Notes Thread
                </div>
                <div className="flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="space-y-4">
                    {[...(notes || [])].reverse().map(note => (
                      <div key={note.id} className="bg-card border rounded-lg p-3 text-sm shadow-sm group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{note.author_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleString()}
                              {note.updated_at && new Date(note.updated_at).getTime() > new Date(note.created_at).getTime() + 1000 && " (Edited)"}
                            </span>
                            {editingNoteId !== note.id && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingNoteId(note.id); setEditContent(note.note); }}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => setNoteToDelete(note.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingNoteId === note.id ? (
                          <div className="flex flex-col gap-2 mt-2">
                            <textarea 
                              className="w-full bg-background border rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" 
                              rows={3} 
                              value={editContent} 
                              onChange={e => setEditContent(e.target.value)} 
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                              <Button size="sm" onClick={async () => {
                                if (task) {
                                  await updateNote({ taskId: task.id, noteId: note.id, note: editContent });
                                  setEditingNoteId(null);
                                }
                              }}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{note.note}</p>
                        )}
                      </div>
                    ))}
                    {!notes?.length && <div className="text-center text-muted-foreground py-8">No notes yet.</div>}
                  </div>
                </div>
                <div className="p-4 border-t bg-card flex gap-2 shrink-0">
                  <Input placeholder="Type a note..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>Send</Button>
                </div>
              </div>

              {/* Right Column: History */}
              <div className="flex flex-col h-full min-h-0">
                <div className="p-4 border-b font-semibold flex items-center gap-2 shrink-0">
                  <History className="h-4 w-4" /> Activity History
                </div>
                <div className="flex-1 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="relative border-l ml-3 pl-4 space-y-6">
                    {history?.map((h, i) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-6 bg-background border rounded-full h-4 w-4 mt-0.5"></div>
                        <div className="text-sm">
                          <div className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString()}</div>
                          <div className="mt-1">
                            <span className="font-semibold">{h.changed_by_name}</span> 
                            {h.old_priority_id !== h.new_priority_id ? (
                              <> changed status from <span className="font-medium line-through">{h.old_priority_name || 'None'}</span> to <span className="font-medium">{h.new_priority_name}</span></>
                            ) : (
                              <> updated the task</>
                            )}
                          </div>
                          {h.note && <div className="mt-1 text-muted-foreground bg-muted p-2 rounded text-xs">{h.note}</div>}
                        </div>
                      </div>
                    ))}
                    {!history?.length && <div className="text-muted-foreground">No history available.</div>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>

      <ConfirmDialog 
        open={noteToDelete !== null} 
        onOpenChange={(open) => !open && setNoteToDelete(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={() => {
          if (noteToDelete && task) {
            deleteNote({ taskId: task.id, noteId: noteToDelete });
            setNoteToDelete(null);
          }
        }}
      />
    </Sheet>
  );
}
