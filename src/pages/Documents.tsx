import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import DocumentsSection from "@/components/documents/DocumentsSection";

const Documents = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Document Workspace"
        description="Generate invoices, receipts, and export-ready statements from a single console."
        actions={
          <Button variant="outline" size="sm" className="rounded-xl border-border/70">
            <Printer className="mr-2 h-4 w-4" />
            Print Center
          </Button>
        }
      />

      <Card className="rounded-2xl border border-border/70">
        <CardContent className="px-4 py-6 md:px-6">
          <DocumentsSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;