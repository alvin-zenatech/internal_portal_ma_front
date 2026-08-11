import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type PipelineTask, useTaskNotes, useCreateTaskNote, useUpdateTaskNote, useDeleteTaskNote, useDeleteTask, useCompanyCallLogs, useAnalysts } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Building2, User, Mail, Phone, Edit, MessageSquare, Edit2, Trash2, Paperclip, X, Loader2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { BASE_URL } from "@/services/apiClient";
import CallTrackingDetails from "./CallTrackingDetails";
import { formatYesNo, formatNameWithInitial } from "@/lib/utils";
import { FollowUpActions } from "./FollowUpActions";

export default function TaskDetailPanel({ task, onClose, onEdit }: { task: PipelineTask | null, onClose: () => void, onEdit: (t: PipelineTask) => void }) {
  const token = sessionStorage.getItem("token");
  const { data: notes } = useTaskNotes(task?.id || null);

  const { mutateAsync: createNote, isPending: isCreatingNote } = useCreateTaskNote();
  const { mutateAsync: updateNote, isPending: isUpdatingNote } = useUpdateTaskNote();
  const { mutateAsync: deleteNote, isPending: isDeletingNote } = useDeleteTaskNote();
  const { mutateAsync: deleteTask, isPending: isDeletingTask } = useDeleteTask();

  const [newNote, setNewNote] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isConfirmDeleteTask, setIsConfirmDeleteTask] = useState(false);

  const [showCallTracking, setShowCallTracking] = useState(false);
  const [selectedCallLogId, setSelectedCallLogId] = useState<number | null>(null);
  const [isCallLogsExpanded, setIsCallLogsExpanded] = useState(false);

  const { data: analysts } = useAnalysts();
  
  const getAnalystName = (initials?: string | null) => {
    if (!initials) return '-';
    const upperInit = initials.toUpperCase();
    if (!analysts) return upperInit;
    const user = analysts.find(u => {
      const name = u.full_name || '';
      const parts = name.trim().split(/\s+/);
      const computed = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
        : (name[0] || '').toUpperCase();
      return computed === upperInit;
    });
    return user ? user.full_name : upperInit;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr.split(/[T ]/)[0];
  };

  const { data: callLogs } = useCompanyCallLogs(task?.company_name || null);

  const handleAddNote = async () => {
    if (!newNote.trim() && !selectedFile) return;
    if (task) {
      await createNote({ taskId: task.id, note: newNote, title: newTitle, file: selectedFile });
      setNewNote("");
      setNewTitle("");
      setSelectedFile(null);
    }
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined} className="!w-[90vw] sm:!max-w-[85vw] sm:!w-[85vw] p-0 flex flex-col h-full max-h-screen overflow-hidden">
        {task && (
          <>
            <div className="p-6 border-b flex justify-between items-start bg-muted/20">
              <div>
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold">{task.company_name}</SheetTitle>
                </SheetHeader>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-4 w-4" /> {task.name}</span>
                  {task.industry_name && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {task.industry_name}</span>}
                  <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {task.email}</span>
                  {task.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {task.phone}</span>}
                </div>
              </div>
              <div className="flex gap-2 mr-8">
                <Button variant="destructive" onClick={() => setIsConfirmDeleteTask(true)} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Remove Task
                </Button>
                <Button variant="outline" onClick={() => onEdit(task)} className="gap-2">
                  <Edit className="h-4 w-4" /> Edit Task
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x overflow-hidden">
              
              {/* Left Column: Details */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-card">
                <div className="flex-1 min-h-0 p-6 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
                <h3 className="font-semibold text-lg mb-4">Task Details</h3>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Priority</dt>
                    <dd className="font-medium">{task.priority_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Analyst</dt>
                    <dd className="font-medium">{formatNameWithInitial(task.analyst_name)}</dd>
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
                    <dt className="text-muted-foreground">Follow-up Date</dt>
                    <dd className="font-medium flex items-center gap-4">
                      <span>
                        {task.follow_up_date
                          ? new Date(task.follow_up_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                          : '-'}
                      </span>
                      {task.follow_up_date && <FollowUpActions task={task} />}
                    </dd>
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
                    <dt className="text-muted-foreground">NDA Status</dt>
                    <dd className="font-medium">{task.nda || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">P&L Status</dt>
                    <dd className="font-medium">{task.p_and_l || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created At</dt>
                    <dd className="font-medium">{new Date(task.created_at).toLocaleString()}</dd>
                  </div>
                </dl>

                {/* Call Logs */}
                <div className="w-full mt-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Button
                      variant="ghost"
                      className="p-0 h-auto font-semibold text-base flex items-center gap-2 hover:bg-transparent"
                      onClick={() => setIsCallLogsExpanded(!isCallLogsExpanded)}
                    >
                      {isCallLogsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Phone className="h-4 w-4" /> Call Logs {callLogs && `(${callLogs.length})`}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowCallTracking(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isCallLogsExpanded && (
                    <div className="space-y-3">
                          {callLogs && callLogs.length > 0 ? (
                            callLogs.map(log => (
                              <div 
                                key={log.id} 
                                className="bg-muted/30 p-3 rounded-md text-sm border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setSelectedCallLogId(log.id);
                                  setShowCallTracking(true);
                                }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-semibold text-primary">Call</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(log.date_of_call) || 'No Date'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs">
                                  {log.outcome && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Outcome</span><span className="font-medium">{log.outcome}</span></div>
                                  )}
                                  {log.call_length && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Duration</span><span className="font-medium">{log.call_length}</span></div>
                                  )}
                                  {log.contact_name && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Contact</span><span className="font-medium">{log.contact_name}</span></div>
                                  )}
                                  {log.phone_number && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Phone</span><span className="font-medium">{log.phone_number}</span></div>
                                  )}
                                  {log.emailed && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Emailed</span><span className="font-medium">{formatYesNo(log.emailed)}</span></div>
                                  )}
                                  {log.picked_up && (
                                    <div className="flex flex-col"><span className="text-muted-foreground">Picked Up</span><span className="font-medium">{formatYesNo(log.picked_up)}</span></div>
                                  )}
                                  {log.analyst && (
                                    <div className="flex flex-col mt-1"><span className="text-muted-foreground">Analyst</span><span className="font-medium">{getAnalystName(log.analyst)}</span></div>
                                  )}
                                </div>
                                {log.notes && (
                                  <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
                                    {log.notes}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground italic text-center p-4 border rounded-md border-dashed bg-muted/10">
                              No call logs found for this company.
                            </div>
                          )}
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* Middle Column: Threaded Notes */}
              <div 
                className={`flex-1 min-w-0 flex flex-col min-h-0 relative ${isDragging ? 'bg-primary/5' : 'bg-muted/10'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                {isDragging && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-primary border-dashed m-4 rounded-lg pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <Paperclip className="h-8 w-8" />
                      <span className="font-semibold text-lg">Drop file to attach</span>
                    </div>
                  </div>
                )}
                <div className="p-4 border-b font-semibold flex items-center gap-2 shrink-0">
                  <MessageSquare className="h-4 w-4" /> Notes Thread
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
                  <div className="space-y-4">
                    {[...(notes || [])]
                      .filter(n => !n.note.startsWith('Call logged on ') && !n.note.startsWith('Email logged on '))
                      .reverse()
                      .map(note => (
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
                              className="w-full bg-background border rounded p-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] max-h-[300px] break-words" 
                              value={editContent} 
                              onChange={e => setEditContent(e.target.value)} 
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)} disabled={isUpdatingNote}>Cancel</Button>
                              <Button size="sm" disabled={isUpdatingNote} onClick={async () => {
                                if (task) {
                                  await updateNote({ noteId: note.id, note: editContent });
                                  setEditingNoteId(null);
                                }
                              }}>
                                {isUpdatingNote && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                {isUpdatingNote ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {note.title && <h4 className="font-bold text-base">{note.title}</h4>}
                            <p className="whitespace-pre-wrap break-words">{note.note}</p>
                            {note.attachment_url && (
                              note.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <a href={`${BASE_URL}/api/pipeline/notes/${note.id}/attachment?token=${token || ''}`} target="_blank" rel="noreferrer" className="block max-w-[200px] sm:max-w-xs overflow-hidden rounded-md border bg-muted/50 p-2 hover:opacity-90 transition-opacity">
                                  <img src={`${BASE_URL}/api/pipeline/notes/${note.id}/attachment?token=${token || ''}`} alt={note.attachment_name || "Attachment preview"} className="w-full h-auto object-cover rounded" />
                                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <Paperclip className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{note.attachment_name}</span>
                                  </div>
                                </a>
                              ) : (
                                <a href={`${BASE_URL}/api/pipeline/notes/${note.id}/attachment?token=${token || ''}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 p-2 rounded-md border w-fit max-w-full">
                                  <Paperclip className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{note.attachment_name}</span>
                                </a>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!notes?.length && <div className="text-center text-muted-foreground py-8">No notes yet.</div>}
                  </div>
                </div>
                <div className="p-4 border-t bg-card shrink-0 flex flex-col gap-2 transition-colors">
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded-md">
                      <Paperclip className="h-4 w-4" />
                      <span className="flex-1 truncate">{selectedFile.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Input placeholder="Title (Optional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} disabled={isCreatingNote} className="font-semibold" />
                    <textarea 
                      placeholder="Type a note or drag a file here..." 
                      value={newNote} 
                      onChange={e => setNewNote(e.target.value)} 
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }} 
                      disabled={isCreatingNote}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] max-h-[300px] resize-y break-words"
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
                      <Button onClick={handleAddNote} disabled={(!newNote.trim() && !selectedFile) || isCreatingNote}>
                        {isCreatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                      </Button>
                    </div>
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
        isLoading={isDeletingNote}
        onConfirm={() => {
          if (noteToDelete && task) {
            deleteNote({ noteId: noteToDelete });
            setNoteToDelete(null);
          }
        }}
      />
      <ConfirmDialog 
        open={isConfirmDeleteTask} 
        onOpenChange={(open) => !open && setIsConfirmDeleteTask(false)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        isLoading={isDeletingTask}
        onConfirm={async () => {
          if (task) {
            await deleteTask(task.id);
            setIsConfirmDeleteTask(false);
            onClose();
          }
        }}
      />

      {showCallTracking && task && (
        <CallTrackingDetails 
          companyName={task.company_name || ""} 
          normalizedName={task.company_name?.toLowerCase().replace(/\s+/g, '') || ""}
          initialEditId={selectedCallLogId}
          onClose={() => {
            setShowCallTracking(false);
            setSelectedCallLogId(null);
          }} 
        />
      )}
    </Sheet>
  );
}
