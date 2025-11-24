import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, FolderOpen, PackageOpen, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InventoryGroupItem {
    id: string;
    product_name: string;
    quantity: number;
    cost_price: number | null;
    selling_price: number | null;
    international_unit: string | null;
    local_unit: string | null;
    custom_unit: string | null;
    category: string | null;
    supplier_id: string | null;
    batch_number: string | null;
    expiry_date: string | null;
    notes: string | null;
}

interface InventoryGroup {
    id: string;
    group_name: string;
    description: string | null;
    created_at: string;
    items?: InventoryGroupItem[];
}

interface InventoryGroupsManagerProps {
    onSelectGroup?: (group: InventoryGroup) => void;
}

const InventoryGroupsManager = ({ onSelectGroup }: InventoryGroupsManagerProps) => {
    const [groups, setGroups] = useState<InventoryGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<InventoryGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: groupsData, error } = await supabase
                .from('inventory_groups')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setGroups(groupsData || []);
        } catch (error) {
            console.error('Error fetching inventory groups:', error);
            toast({
                title: "Error",
                description: "Failed to load inventory groups",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupItems = async (groupId: string) => {
        try {
            const { data, error } = await supabase
                .from('inventory_group_items')
                .select('*')
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching group items:', error);
            return [];
        }
    };

    const toggleGroupExpansion = async (groupId: string) => {
        const newExpanded = new Set(expandedGroups);

        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
            // Fetch items if not already loaded
            const group = groups.find(g => g.id === groupId);
            if (group && !group.items) {
                const items = await fetchGroupItems(groupId);
                setGroups(groups.map(g => g.id === groupId ? { ...g, items } : g));
            }
        }

        setExpandedGroups(newExpanded);
    };

    const createGroup = async () => {
        if (!newGroupName.trim()) {
            toast({
                title: "Error",
                description: "Group name is required",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('inventory_groups')
                .insert({
                    user_id: user.id,
                    group_name: newGroupName.trim(),
                    description: newGroupDescription.trim() || null,
                });

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    toast({
                        title: "Error",
                        description: "A group with this name already exists",
                        variant: "destructive",
                    });
                    return;
                }
                throw error;
            }

            toast({
                title: "Success",
                description: `Inventory group "${newGroupName}" created successfully`,
            });

            setNewGroupName("");
            setNewGroupDescription("");
            setIsCreateDialogOpen(false);
            fetchGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            toast({
                title: "Error",
                description: "Failed to create inventory group",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const updateGroup = async () => {
        if (!editingGroup || !newGroupName.trim()) {
            toast({
                title: "Error",
                description: "Group name is required",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase
                .from('inventory_groups')
                .update({
                    group_name: newGroupName.trim(),
                    description: newGroupDescription.trim() || null,
                })
                .eq('id', editingGroup.id);

            if (error) {
                if (error.code === '23505') {
                    toast({
                        title: "Error",
                        description: "A group with this name already exists",
                        variant: "destructive",
                    });
                    return;
                }
                throw error;
            }

            toast({
                title: "Success",
                description: "Inventory group updated successfully",
            });

            setEditingGroup(null);
            setNewGroupName("");
            setNewGroupDescription("");
            setIsEditDialogOpen(false);
            fetchGroups();
        } catch (error) {
            console.error('Error updating group:', error);
            toast({
                title: "Error",
                description: "Failed to update inventory group",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteGroup = async (groupId: string, groupName: string) => {
        try {
            setLoading(true);

            const { error } = await supabase
                .from('inventory_groups')
                .delete()
                .eq('id', groupId);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Inventory group "${groupName}" deleted successfully`,
            });

            fetchGroups();
        } catch (error) {
            console.error('Error deleting group:', error);
            toast({
                title: "Error",
                description: "Failed to delete inventory group",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEditGroup = (group: InventoryGroup) => {
        setEditingGroup(group);
        setNewGroupName(group.group_name);
        setNewGroupDescription(group.description || "");
        setIsEditDialogOpen(true);
    };

    const handleSelectGroup = async (group: InventoryGroup) => {
        if (!onSelectGroup) return;

        // Fetch items if not already loaded
        let groupWithItems = group;
        if (!group.items) {
            const items = await fetchGroupItems(group.id);
            groupWithItems = { ...group, items };
        }

        onSelectGroup(groupWithItems);
    };

    if (loading && groups.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading inventory groups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Inventory Groups</h3>
                    <p className="text-sm text-muted-foreground">
                        Create groups to quickly record multiple items at once
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Inventory Group</DialogTitle>
                            <DialogDescription>
                                Create a new group to organize and quickly record inventory items
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="group-name">Group Name *</Label>
                                <Input
                                    id="group-name"
                                    placeholder="e.g., Weekly Restock, Monthly Bulk Order"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="group-description">Description (Optional)</Label>
                                <Textarea
                                    id="group-description"
                                    placeholder="Add notes about this group..."
                                    rows={3}
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={createGroup} disabled={loading}>
                                {loading ? "Creating..." : "Create Group"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Inventory Group</DialogTitle>
                        <DialogDescription>
                            Update the name and description of this inventory group
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-name">Group Name *</Label>
                            <Input
                                id="edit-group-name"
                                placeholder="Group name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-group-description">Description (Optional)</Label>
                            <Textarea
                                id="edit-group-description"
                                placeholder="Add notes about this group..."
                                rows={3}
                                value={newGroupDescription}
                                onChange={(e) => setNewGroupDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={updateGroup} disabled={loading}>
                            {loading ? "Updating..." : "Update Group"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Groups List */}
            {groups.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Inventory Groups Yet</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                            Create your first inventory group to organize and quickly record multiple items
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Group
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {groups.map((group) => (
                        <Card key={group.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => toggleGroupExpansion(group.id)}
                                            >
                                                {expandedGroups.has(group.id) ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <CardTitle className="text-base">{group.group_name}</CardTitle>
                                        </div>
                                        {group.description && (
                                            <CardDescription className="mt-1 ml-8">
                                                {group.description}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {onSelectGroup && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectGroup(group)}
                                            >
                                                <PackageOpen className="w-4 h-4 mr-2" />
                                                Quick Record
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditGroup(group)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Inventory Group?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete "{group.group_name}" and all items in this group. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteGroup(group.id, group.group_name)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardHeader>

                            {expandedGroups.has(group.id) && (
                                <CardContent>
                                    {!group.items || group.items.length === 0 ? (
                                        <div className="text-center py-6 text-sm text-muted-foreground">
                                            No items in this group yet. Use "Quick Record" to add items.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium mb-2">
                                                Items ({group.items.length}):
                                            </div>
                                            {group.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium">{item.product_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Qty: {item.quantity}
                                                            {item.local_unit && ` ${item.local_unit}`}
                                                            {item.cost_price && ` • Cost: ¢${item.cost_price.toFixed(2)}`}
                                                            {item.selling_price && ` • Selling: ¢${item.selling_price.toFixed(2)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InventoryGroupsManager;
