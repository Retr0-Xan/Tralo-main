import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Trash2, Eye, Edit2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BusinessNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const BusinessNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<BusinessNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<BusinessNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<BusinessNote | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
  
  const [formData, setFormData] = useState({
    title: "",
    content: ""
  });

  useEffect(() => {
    fetchNotes();
  }, [user]);

  useEffect(() => {
    // Filter notes based on search
    if (searchTerm.trim()) {
      const filtered = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchTerm, notes]);

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
      setFilteredNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load your business notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please add both a title and content for your note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (selectedNote) {
        // Update existing note
        const { error } = await supabase
          .from('business_notes')
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id);

        if (error) throw error;

        toast({
          title: "Note Updated",
          description: "Your business note has been updated successfully",
        });
      } else {
        // Create new note
        const { error } = await supabase
          .from('business_notes')
          .insert({
            user_id: user.id,
            title: formData.title.trim(),
            content: formData.content.trim()
          });

        if (error) throw error;

        toast({
          title: "Note Saved",
          description: "Your business note has been saved successfully",
        });
      }

      // Reset form
      setFormData({ title: "", content: "" });
      setShowForm(false);
      setSelectedNote(null);
      setViewMode('list');
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save your note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('business_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Note Deleted",
        description: "Your business note has been deleted",
      });

      fetchNotes();
      setSelectedNote(null);
      setViewMode('list');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewNote = (note: BusinessNote) => {
    setSelectedNote(note);
    setViewMode('view');
  };

  const handleEditNote = (note: BusinessNote) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content
    });
    setViewMode('edit');
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setFormData({ title: "", content: "" });
    setShowForm(true);
    setViewMode('edit');
  };

  const handleBack = () => {
    setSelectedNote(null);
    setFormData({ title: "", content: "" });
    setShowForm(false);
    setViewMode('list');
  };

  if (viewMode === 'view' && selectedNote) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              View Note
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">{selectedNote.title}</h3>
            <p className="text-sm text-muted-foreground">
              Last updated: {format(new Date(selectedNote.updated_at), 'PPP p')}
            </p>
          </div>
          <div className="whitespace-pre-wrap bg-muted/30 p-4 rounded-lg">
            {selectedNote.content}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleEditNote(selectedNote)} className="flex-1">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Note
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteNote(selectedNote.id)}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'edit' || showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedNote ? 'Edit Note' : 'New Business Note'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Note Title *</label>
            <Input
              placeholder="e.g., Supplier Contact Info, Meeting Notes..."
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note Content *</label>
            <Textarea
              placeholder="Write your business note here..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={12}
              className="resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveNote} disabled={loading} className="flex-1">
              {loading ? "Saving..." : selectedNote ? "Update Note" : "Save Note"}
            </Button>
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Notes
          </CardTitle>
          <Button onClick={handleNewNote} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Notes List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Loading notes...</p>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{searchTerm ? "No notes found matching your search" : "No business notes yet"}</p>
              <p className="text-sm mt-1">
                {searchTerm ? "Try a different search term" : "Click 'New Note' to create your first note"}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div 
                key={note.id} 
                className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base mb-1 truncate">{note.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(note.updated_at), 'MMM dd, yyyy')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewNote(note)}
                      title="View Note"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditNote(note)}
                      title="Edit Note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={loading}
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessNotes;
