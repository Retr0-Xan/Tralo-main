# Inventory Groups Feature - User Guide

## Overview
Inventory Groups allow you to save frequently ordered sets of items for quick reordering. This is perfect for regular stock replenishments, recurring supplier orders, or standard inventory packages.

## Setup Instructions

### 1. Run the Database Migration
First, apply the database migration to create the necessary tables:

```bash
# Navigate to your project directory
cd "c:\Users\OMEN 16\repos\TRALO"

# Run the migration (using Supabase CLI or your preferred method)
supabase db push
```

This will create two new tables:
- `inventory_groups`: Stores group names and descriptions
- `inventory_group_items`: Stores the items within each group

### 2. Verify the Setup
After running the migration, the TypeScript errors in the code will resolve automatically as Supabase regenerates the types.

## How to Use

### Creating an Inventory Group

#### Method 1: Create from Bulk Mode
1. Go to **Inventory** → **Record Inventory** tab
2. Click **"Add Bulk"** button
3. Add multiple products to your bulk list
4. Check **"Save as Inventory Group for quick re-ordering"**
5. Click **"Create New Group"**
6. Enter a group name (e.g., "Weekly Restock", "Monthly Bulk Order")
7. Optionally add a description
8. Process your bulk inventory - items will be saved to inventory AND to the group

#### Method 2: Create Empty Group
1. Go to **Inventory** → **Inventory Groups** tab
2. Click **"New Group"**
3. Enter group name and description
4. You can add items later by using "Quick Record"

### Managing Inventory Groups

#### View All Groups
1. Navigate to **Inventory** → **Inventory Groups** tab
2. See all your created groups
3. Click the chevron (▶) to expand and view items in each group

#### Edit a Group
1. In the Inventory Groups tab, click the **Edit** icon (pencil) on any group
2. Update the name or description
3. Save changes

#### Delete a Group
1. Click the **Delete** icon (trash can) on any group
2. Confirm deletion
3. **Note:** This only deletes the group template, not your actual inventory

### Quick Recording from Groups

#### Method 1: From Inventory Groups Tab
1. Go to **Inventory** → **Inventory Groups** tab
2. Find the group you want to use
3. Click **"Quick Record"** button
4. You'll be switched to the Recording tab with all items pre-loaded

#### Method 2: After Loading
1. All items from the group are loaded into bulk mode
2. **Edit quantities and prices** as needed (they're fully editable!)
3. Add or remove items if needed
4. Click **"Save All Items to Inventory"** when ready
5. Items are recorded to your actual inventory

### Editing Items Before Recording
When you load an inventory group:
- All fields are **editable** - quantities, cost prices, and selling prices
- You can **remove items** you don't need using the trash icon
- You can **add new items** using the form below
- This gives you flexibility while still saving time

### Best Practices

1. **Weekly Restocks**: Create a group for items you order every week
   - Example: "Weekly Fresh Produce"
   - Items: Tomatoes, Onions, Pepper, etc.

2. **Supplier-Specific Orders**: Create groups per supplier
   - Example: "ABC Wholesalers Monthly"
   - Items: All products you regularly buy from that supplier

3. **Seasonal Stock**: Create groups for seasonal inventory
   - Example: "Back to School Bundle"
   - Example: "Holiday Season Stock"

4. **Standard Packages**: Create groups for common bundles
   - Example: "Starter Pack - New Stock"
   - Example: "Emergency Restock Essentials"

## Key Features

✅ **Save Time**: Record multiple items at once with pre-filled data
✅ **Fully Editable**: Adjust quantities and prices before final recording
✅ **Reusable**: Use the same group over and over
✅ **Flexible**: Add/remove items from loaded groups before saving
✅ **Organized**: Keep track of regular ordering patterns
✅ **Quick Access**: One click to load entire sets of items

## Workflow Example

1. **Monday Morning**: Load "Weekly Restock" group
2. **Adjust Quantities**: Edit based on current needs
3. **Update Prices**: If supplier prices changed
4. **Record**: Save all items to inventory in one click
5. **Repeat**: Use same group next Monday!

## Technical Notes

### Database Structure
- Groups are user-specific (each user sees only their groups)
- Items in groups are templates (don't affect actual inventory until recorded)
- Deleting a group doesn't affect recorded inventory
- Group names must be unique per user

### TypeScript Errors
The TypeScript errors you see in the code editor are expected before running the migration. They will automatically resolve once you run:
```bash
supabase db push
```

This regenerates the TypeScript types to include the new `inventory_groups` and `inventory_group_items` tables.

## Troubleshooting

### "Group name already exists" error
- Each group name must be unique for your account
- Choose a different name or edit the existing group

### Items not loading
- Ensure the group has items saved to it
- Try creating a new group from bulk mode first
- Check that you clicked "Quick Record" on the correct group

### Can't see Inventory Groups tab
- Verify the code changes are saved
- Refresh your browser
- Check browser console for errors

## Future Enhancements (Potential)

- Export/Import groups
- Share groups between users
- Group templates marketplace
- Automatic ordering reminders based on groups
- Supplier integration for direct ordering

---

**Need Help?** Contact support or refer to the main application documentation.
